import express from 'express';
import {
  Mail,
  OutgoingMail,
  Category,
  RetentionAlert,
  Settings,
  RETENTION_ALERT_STATUS,
  RETENTION_DOC_TYPES,
  AUDIT_CATEGORIES
} from '../models/index.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { logAudit } from '../services/audit.service.js';
import {
  scanRetention,
  getRgpdSettings,
  reloadRetentionScheduler,
  normalizeThresholds,
  buildScanCron
} from '../services/retention.service.js';

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

// Conformité RGPD : strictement réservée aux administrateurs
router.use(authenticate, isAdmin);

// GET /api/rgpd/overview - Indicateurs de conformité
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * DAY_MS);

    const [expired, upcoming, upcoming30, exempted, deleted, byCategory, categoriesWithRetention, totalCategories] =
      await Promise.all([
        RetentionAlert.countDocuments({ status: RETENTION_ALERT_STATUS.EXPIRED }),
        RetentionAlert.countDocuments({ status: RETENTION_ALERT_STATUS.UPCOMING }),
        RetentionAlert.countDocuments({
          status: RETENTION_ALERT_STATUS.UPCOMING,
          expiryDate: { $lte: in30 }
        }),
        RetentionAlert.countDocuments({ status: RETENTION_ALERT_STATUS.EXEMPTED }),
        RetentionAlert.countDocuments({ status: RETENTION_ALERT_STATUS.DELETED }),
        RetentionAlert.aggregate([
          { $match: { status: { $in: [RETENTION_ALERT_STATUS.EXPIRED, RETENTION_ALERT_STATUS.UPCOMING] } } },
          {
            $group: {
              _id: { category: '$category', categoryName: '$categoryName', status: '$status' },
              count: { $sum: 1 }
            }
          }
        ]),
        Category.countDocuments({ retentionEnabled: true, isActive: true }),
        Category.countDocuments({})
      ]);

    // Regroupement { catégorie -> { expired, upcoming } } pour le tableau de synthèse
    const categories = {};
    for (const row of byCategory) {
      const key = String(row._id.category);
      if (!categories[key]) {
        categories[key] = { categoryId: row._id.category, name: row._id.categoryName, expired: 0, upcoming: 0 };
      }
      categories[key][row._id.status] = row.count;
    }

    const lastScan = await Settings.getValue('rgpd_last_scan_at', null);

    res.json({
      success: true,
      data: {
        expired,
        upcoming,
        upcoming30,
        exempted,
        deleted,
        categoriesWithRetention,
        totalCategories,
        lastScanAt: lastScan,
        byCategory: Object.values(categories).sort((a, b) => b.expired - a.expired)
      }
    });
  } catch (error) {
    console.error('Erreur synthèse RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/rgpd/alerts - Liste paginée des documents suivis
router.get('/alerts', async (req, res) => {
  try {
    const {
      status = RETENTION_ALERT_STATUS.EXPIRED,
      category = '',
      docType = '',
      search = '',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;
    if (docType) query.docType = docType;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { reference: { $regex: safe, $options: 'i' } },
        { chronoNumber: { $regex: safe, $options: 'i' } },
        { documentSubject: { $regex: safe, $options: 'i' } },
        { correspondent: { $regex: safe, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      RetentionAlert.find(query)
        .sort({ expiryDate: 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('acknowledgedBy', 'firstName lastName')
        .populate('exemptedBy', 'firstName lastName')
        .populate('deletedBy', 'firstName lastName')
        .lean(),
      RetentionAlert.countDocuments(query)
    ]);

    const now = Date.now();
    const data = items.map(item => ({
      ...item,
      daysOverdue: Math.floor((now - new Date(item.expiryDate).getTime()) / DAY_MS)
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste alertes RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/rgpd/scan - Lancer un contrôle immédiat
router.post('/scan', async (req, res) => {
  try {
    const result = await scanRetention({ notify: req.body?.notify !== false });
    await Settings.setValue('rgpd_last_scan_at', new Date().toISOString(), 'rgpd', 'Dernier contrôle des durées de conservation');

    await logAudit({
      req,
      action: 'rgpd.scan',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'RetentionAlert',
      entityLabel: 'Contrôle des durées de conservation',
      metadata: result
    });

    res.json({ success: true, message: 'Contrôle des durées de conservation effectué', data: result });
  } catch (error) {
    console.error('Erreur contrôle RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/rgpd/alerts/:id/acknowledge - Marquer l'alerte comme prise en compte
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await RetentionAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alerte non trouvée' });
    }

    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    await alert.save();

    res.json({ success: true, message: 'Alerte prise en compte', data: alert });
  } catch (error) {
    console.error('Erreur prise en compte alerte:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/rgpd/alerts/:id/exempt - Accorder une dérogation temporaire
router.post('/alerts/:id/exempt', async (req, res) => {
  try {
    const { days, reason = '' } = req.body || {};
    const duration = parseInt(days, 10);
    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: 'Durée de dérogation invalide' });
    }

    const alert = await RetentionAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alerte non trouvée' });
    }

    alert.exemptedUntil = new Date(Date.now() + duration * DAY_MS);
    alert.exemptReason = reason;
    alert.exemptedBy = req.user._id;
    alert.status = RETENTION_ALERT_STATUS.EXEMPTED;
    await alert.save();

    await logAudit({
      req,
      action: 'rgpd.exemption_granted',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'RetentionAlert',
      entityId: alert._id,
      entityLabel: `${alert.reference} - ${alert.documentSubject}`,
      metadata: { until: alert.exemptedUntil, reason }
    });

    res.json({ success: true, message: `Dérogation accordée jusqu'au ${alert.exemptedUntil.toLocaleDateString('fr-FR')}`, data: alert });
  } catch (error) {
    console.error('Erreur dérogation RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Mise en corbeille d'un document au titre du RGPD (partagée entre l'action unitaire et le lot)
const trashDocumentForAlert = async (alert, req) => {
  const Model = alert.docType === RETENTION_DOC_TYPES.OUTGOING ? OutgoingMail : Mail;
  const doc = await Model.findById(alert.document);

  const reason = `RGPD — durée légale de conservation dépassée (catégorie « ${alert.categoryName} », échéance ${new Date(alert.expiryDate).toLocaleDateString('fr-FR')})`;

  if (doc) {
    await doc.softDelete(req.user._id, reason);
    await logAudit({
      req,
      action: alert.docType === RETENTION_DOC_TYPES.OUTGOING ? 'outgoing.rgpd_trashed' : 'mail.rgpd_trashed',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: alert.docType === RETENTION_DOC_TYPES.OUTGOING ? 'OutgoingMail' : 'Mail',
      entityId: doc._id,
      entityLabel: `${doc.reference} - ${doc.subject}`,
      metadata: { categoryName: alert.categoryName, expiryDate: alert.expiryDate }
    });
  }

  alert.status = RETENTION_ALERT_STATUS.DELETED;
  alert.documentDeletedAt = new Date();
  alert.deletionMode = 'manual';
  alert.deletedBy = req.user._id;
  await alert.save();

  return Boolean(doc);
};

// POST /api/rgpd/alerts/:id/delete - Supprimer (corbeille) le document concerné
router.post('/alerts/:id/delete', async (req, res) => {
  try {
    const alert = await RetentionAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alerte non trouvée' });
    }

    const found = await trashDocumentForAlert(alert, req);

    res.json({
      success: true,
      message: found
        ? 'Document mis en corbeille conformément à la durée légale de conservation'
        : 'Document déjà supprimé — alerte clôturée'
    });
  } catch (error) {
    console.error('Erreur suppression RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/rgpd/alerts/bulk-delete - Supprimer un lot (sélection ou tous les expirés)
router.post('/alerts/bulk-delete', async (req, res) => {
  try {
    const { ids = [], allExpired = false } = req.body || {};

    const query = allExpired
      ? { status: RETENTION_ALERT_STATUS.EXPIRED }
      : { _id: { $in: ids }, status: RETENTION_ALERT_STATUS.EXPIRED };

    if (!allExpired && ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun document sélectionné' });
    }

    const alerts = await RetentionAlert.find(query);
    let deleted = 0;
    for (const alert of alerts) {
      await trashDocumentForAlert(alert, req);
      deleted += 1;
    }

    res.json({
      success: true,
      message: `${deleted} document(s) mis en corbeille`,
      data: { deleted }
    });
  } catch (error) {
    console.error('Erreur suppression RGPD en lot:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/rgpd/settings - Paramètres des rappels
router.get('/settings', async (req, res) => {
  try {
    const settings = await getRgpdSettings();
    res.json({
      success: true,
      data: {
        ...settings,
        cron: buildScanCron(settings),
        lastScanAt: await Settings.getValue('rgpd_last_scan_at', null)
      }
    });
  } catch (error) {
    console.error('Erreur lecture paramètres RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/rgpd/settings - Modifier les paramètres (fréquence, seuils, suppression auto)
router.put('/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const before = await getRgpdSettings();

    const updates = {
      rgpd_enabled: body.enabled === true || body.enabled === 'true',
      rgpd_scan_frequency: ['daily', 'weekly', 'monthly'].includes(body.scanFrequency) ? body.scanFrequency : before.scanFrequency,
      rgpd_scan_hour: Math.min(23, Math.max(0, parseInt(body.scanHour, 10) || 0)),
      rgpd_scan_weekday: Math.min(6, Math.max(0, parseInt(body.scanWeekday, 10) || 0)),
      rgpd_scan_dayofmonth: Math.min(28, Math.max(1, parseInt(body.scanDayOfMonth, 10) || 1)),
      rgpd_alert_before_days: normalizeThresholds(body.alertBeforeDays, before.alertBeforeDays),
      rgpd_repeat_expired_days: Math.max(0, parseInt(body.repeatExpiredDays, 10) || 0),
      rgpd_auto_delete_enabled: body.autoDeleteEnabled === true || body.autoDeleteEnabled === 'true',
      rgpd_email_enabled: body.emailEnabled === true || body.emailEnabled === 'true',
      rgpd_extra_emails: String(body.extraEmails || '')
    };

    for (const [key, value] of Object.entries(updates)) {
      await Settings.setValue(key, value, 'rgpd', 'Conformité RGPD — durées de conservation');
    }

    await reloadRetentionScheduler();

    await logAudit({
      req,
      action: 'rgpd.settings_updated',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'Settings',
      entityLabel: 'Conformité RGPD',
      changes: { before, after: updates }
    });

    const settings = await getRgpdSettings();
    res.json({
      success: true,
      message: 'Paramètres RGPD enregistrés',
      data: { ...settings, cron: buildScanCron(settings) }
    });
  } catch (error) {
    console.error('Erreur enregistrement paramètres RGPD:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
