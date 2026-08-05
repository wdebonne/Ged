import cron from 'node-cron';
import {
  Category,
  Subject,
  Mail,
  OutgoingMail,
  RetentionAlert,
  Settings,
  User,
  Group,
  RETENTION_ALERT_STATUS,
  RETENTION_DOC_TYPES,
  RETENTION_START_POINTS,
  EXPIRY_ACTIONS,
  AUDIT_CATEGORIES,
  addRetention,
  retentionUnitLabel
} from '../models/index.js';
import { logAudit } from './audit.service.js';
import { sendRetentionDigestEmail } from './email.service.js';
import {
  notifyRetentionUpcoming,
  notifyRetentionExpired,
  notifyRetentionDeleted,
  notifyRetentionChanged
} from './notification.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Paramètres RGPD (stockés dans Settings, catégorie 'rgpd')
// ---------------------------------------------------------------------------

export const RGPD_SETTINGS_DEFAULTS = {
  rgpd_enabled: true,
  rgpd_scan_frequency: 'daily',        // daily | weekly | monthly
  rgpd_scan_hour: 7,                   // heure du contrôle (Europe/Paris)
  rgpd_scan_weekday: 1,                // 0 = dimanche … 6 = samedi (fréquence hebdo)
  rgpd_scan_dayofmonth: 1,             // jour du mois (fréquence mensuelle)
  rgpd_alert_before_days: [90, 30, 7], // rappels avant échéance, si la catégorie n'en définit pas
  rgpd_repeat_expired_days: 7,         // relance tant qu'un document expiré n'est pas traité
  rgpd_auto_delete_enabled: false,     // interrupteur global des suppressions automatiques
  rgpd_email_enabled: true,            // synthèse par email aux administrateurs
  rgpd_extra_emails: ''                // destinataires supplémentaires (séparés par des virgules)
};

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true';
};

// Normalise une liste de seuils de rappel : entiers positifs, uniques, décroissants
export const normalizeThresholds = (value, fallback = []) => {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '').split(',');
  const cleaned = raw
    .map(v => parseInt(v, 10))
    .filter(v => Number.isFinite(v) && v >= 0);
  const unique = [...new Set(cleaned)].sort((a, b) => b - a);
  return unique.length > 0 ? unique : fallback;
};

export const getRgpdSettings = async () => {
  const stored = await Settings.find({ category: 'rgpd' }).lean();
  const map = stored.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});

  return {
    enabled: toBool(map.rgpd_enabled, RGPD_SETTINGS_DEFAULTS.rgpd_enabled),
    scanFrequency: ['daily', 'weekly', 'monthly'].includes(map.rgpd_scan_frequency)
      ? map.rgpd_scan_frequency
      : RGPD_SETTINGS_DEFAULTS.rgpd_scan_frequency,
    scanHour: Math.min(23, Math.max(0, toInt(map.rgpd_scan_hour, RGPD_SETTINGS_DEFAULTS.rgpd_scan_hour))),
    scanWeekday: Math.min(6, Math.max(0, toInt(map.rgpd_scan_weekday, RGPD_SETTINGS_DEFAULTS.rgpd_scan_weekday))),
    scanDayOfMonth: Math.min(28, Math.max(1, toInt(map.rgpd_scan_dayofmonth, RGPD_SETTINGS_DEFAULTS.rgpd_scan_dayofmonth))),
    alertBeforeDays: normalizeThresholds(map.rgpd_alert_before_days, RGPD_SETTINGS_DEFAULTS.rgpd_alert_before_days),
    repeatExpiredDays: Math.max(0, toInt(map.rgpd_repeat_expired_days, RGPD_SETTINGS_DEFAULTS.rgpd_repeat_expired_days)),
    autoDeleteEnabled: toBool(map.rgpd_auto_delete_enabled, RGPD_SETTINGS_DEFAULTS.rgpd_auto_delete_enabled),
    emailEnabled: toBool(map.rgpd_email_enabled, RGPD_SETTINGS_DEFAULTS.rgpd_email_enabled),
    extraEmails: String(map.rgpd_extra_emails ?? RGPD_SETTINGS_DEFAULTS.rgpd_extra_emails)
  };
};

// Expression cron dérivée de la fréquence choisie dans l'interface
export const buildScanCron = ({ scanFrequency, scanHour, scanWeekday, scanDayOfMonth }) => {
  if (scanFrequency === 'weekly') return `0 ${scanHour} * * ${scanWeekday}`;
  if (scanFrequency === 'monthly') return `0 ${scanHour} ${scanDayOfMonth} * *`;
  return `0 ${scanHour} * * *`;
};

// ---------------------------------------------------------------------------
// Calcul des échéances
// ---------------------------------------------------------------------------

// Date de départ du décompte selon la règle de la catégorie, avec repli sur une
// date toujours présente (un courrier non traité n'a pas de processedDate).
export const getStartDate = (doc, startFrom) => {
  const candidates = {
    [RETENTION_START_POINTS.RECEIVED]: doc.receivedDate,
    [RETENTION_START_POINTS.PROCESSED]: doc.processedDate,
    [RETENTION_START_POINTS.ARCHIVED]: doc.archivedDate,
    [RETENTION_START_POINTS.CREATED]: doc.createdAt
  };
  return candidates[startFrom] || doc.receivedDate || doc.sentDate || doc.createdAt || null;
};

/**
 * Date d'expiration d'un document pour une règle de conservation donnée.
 * Renvoie null si la règle ne s'applique pas (durée non définie).
 */
export const computeExpiryDate = (doc, rule) => {
  if (!rule?.retentionEnabled || !rule.retentionDuration) return null;
  const startDate = getStartDate(doc, rule.retentionStartFrom);
  if (!startDate) return null;
  return {
    startDate: new Date(startDate),
    expiryDate: addRetention(startDate, rule.retentionDuration, rule.retentionUnit)
  };
};

export const retentionRuleLabel = (rule) => {
  if (!rule?.retentionEnabled || !rule.retentionDuration) return 'Illimitée';
  return `${rule.retentionDuration} ${retentionUnitLabel(rule.retentionUnit)}`;
};

// ---------------------------------------------------------------------------
// Collecte des documents soumis à une durée de conservation
// ---------------------------------------------------------------------------

// Les objets (Subject) portent la catégorie ; les courriers référencent l'objet par
// son libellé. On reconstruit donc la correspondance libellé d'objet -> catégorie.
const getSubjectNamesByCategory = async (categoryId) => {
  const subjects = await Subject.find({ categoryRef: categoryId }).select('name').lean();
  return subjects.map(s => s.name).filter(Boolean);
};

const MAIL_FIELDS = 'reference chronoNumber subject senderName receivedDate processedDate archivedDate createdAt deletedAt';
const OUTGOING_FIELDS = 'reference chronoNumber subject destinationName sentDate archivedDate createdAt deletedAt';

/**
 * Documents (entrants + sortants, hors corbeille) rattachés à une catégorie,
 * avec leur date d'expiration calculée selon `rule`.
 */
export const collectDocumentsForCategory = async (category, rule = category) => {
  const names = await getSubjectNamesByCategory(category._id);
  if (names.length === 0) return [];

  const [mails, outgoing] = await Promise.all([
    Mail.find({ subject: { $in: names }, deletedAt: null }).select(MAIL_FIELDS).lean(),
    OutgoingMail.find({ subject: { $in: names }, deletedAt: null }).select(OUTGOING_FIELDS).lean()
  ]);

  const entries = [];
  for (const mail of mails) {
    const computed = computeExpiryDate(mail, rule);
    if (computed) entries.push({ docType: RETENTION_DOC_TYPES.MAIL, doc: mail, ...computed });
  }
  for (const mail of outgoing) {
    const computed = computeExpiryDate(mail, rule);
    if (computed) entries.push({ docType: RETENTION_DOC_TYPES.OUTGOING, doc: mail, ...computed });
  }
  return entries;
};

/**
 * Simulation : impact d'une durée de conservation sans rien écrire en base.
 * Sert au bandeau « ce changement rend N documents immédiatement supprimables ».
 */
export const previewRetention = async (category, proposedRule) => {
  const rule = {
    retentionEnabled: true,
    retentionDuration: proposedRule.retentionDuration,
    retentionUnit: proposedRule.retentionUnit,
    retentionStartFrom: proposedRule.retentionStartFrom || category.retentionStartFrom
  };

  const [currentEntries, proposedEntries] = await Promise.all([
    collectDocumentsForCategory(category, category),
    collectDocumentsForCategory(category, rule)
  ]);

  const now = new Date();
  const currentExpiredIds = new Set(
    currentEntries.filter(e => e.expiryDate <= now).map(e => String(e.doc._id))
  );

  const expired = proposedEntries.filter(e => e.expiryDate <= now);
  const newlyExpired = expired.filter(e => !currentExpiredIds.has(String(e.doc._id)));

  return {
    totalDocuments: proposedEntries.length,
    expiredCount: expired.length,
    newlyExpiredCount: newlyExpired.length,
    currentExpiredCount: currentExpiredIds.size,
    sample: newlyExpired.slice(0, 10).map(e => ({
      docType: e.docType,
      id: e.doc._id,
      reference: e.doc.reference,
      chronoNumber: e.doc.chronoNumber,
      subject: e.doc.subject,
      expiryDate: e.expiryDate
    }))
  };
};

// ---------------------------------------------------------------------------
// Scan : mise à jour des alertes, suppressions automatiques, notifications
// ---------------------------------------------------------------------------

const softDeleteDocument = async (docType, id, reason) => {
  const Model = docType === RETENTION_DOC_TYPES.OUTGOING ? OutgoingMail : Mail;
  const doc = await Model.findOne({ _id: id, deletedAt: null });
  if (!doc) return null;
  doc.deletedAt = new Date();
  doc.deletedBy = null;
  doc.deleteReason = reason;
  await doc.save();
  return doc;
};

const alertLabel = (docType, doc) => ({
  reference: doc.reference || '',
  chronoNumber: doc.chronoNumber || '',
  documentSubject: doc.subject || '',
  correspondent: (docType === RETENTION_DOC_TYPES.OUTGOING ? doc.destinationName : doc.senderName) || ''
});

/**
 * Contrôle complet des durées de conservation.
 *
 * Les échéances sont systématiquement recalculées à partir de la catégorie courante :
 * toute modification de durée est donc rétroactive sur les documents déjà enregistrés,
 * sans migration ni retraitement manuel.
 *
 * @param {Object} [options]
 * @param {Array} [options.categoryIds] - limiter le contrôle à certaines catégories
 * @param {boolean} [options.notify=true] - émettre notifications et emails
 * @param {boolean} [options.allowAutoDelete=true] - autoriser la mise en corbeille automatique
 */
export const scanRetention = async ({ categoryIds = null, notify = true, allowAutoDelete = true } = {}) => {
  const settings = await getRgpdSettings();
  const now = new Date();

  const categoryQuery = { retentionEnabled: true, isActive: true };
  if (categoryIds?.length) categoryQuery._id = { $in: categoryIds };
  const categories = await Category.find(categoryQuery);

  const seenAlertKeys = new Set();
  const summary = {
    scannedCategories: categories.length,
    scannedDocuments: 0,
    expired: [],
    upcoming: [],      // { alert, threshold }
    autoDeleted: [],
    newlyExpiredCount: 0
  };

  for (const category of categories) {
    const thresholds = normalizeThresholds(category.alertBeforeDays, settings.alertBeforeDays);
    const entries = await collectDocumentsForCategory(category);
    summary.scannedDocuments += entries.length;

    for (const entry of entries) {
      const { docType, doc, startDate, expiryDate } = entry;
      seenAlertKeys.add(`${docType}:${doc._id}`);

      const daysRemaining = Math.ceil((expiryDate - now) / DAY_MS);
      const isExpired = expiryDate <= now;

      let alert = await RetentionAlert.findOne({ docType, document: doc._id });
      const wasExpired = alert?.status === RETENTION_ALERT_STATUS.EXPIRED;

      const base = {
        docType,
        document: doc._id,
        ...alertLabel(docType, doc),
        category: category._id,
        categoryName: category.name,
        retentionSnapshot: {
          duration: category.retentionDuration,
          unit: category.retentionUnit,
          startFrom: category.retentionStartFrom,
          legalBasis: category.legalBasis || ''
        },
        startDate,
        expiryDate
      };

      if (!alert) {
        alert = new RetentionAlert({ ...base, status: RETENTION_ALERT_STATUS.UPCOMING, notifiedThresholds: [] });
      } else {
        // L'échéance a bougé (durée modifiée) : on réarme les rappels déjà envoyés
        const expiryChanged = !alert.expiryDate || alert.expiryDate.getTime() !== expiryDate.getTime();
        Object.assign(alert, base);
        if (expiryChanged) {
          alert.notifiedThresholds = [];
          alert.lastExpiredNotifiedAt = null;
          if (alert.status === RETENTION_ALERT_STATUS.RESOLVED) {
            alert.status = RETENTION_ALERT_STATUS.UPCOMING;
          }
        }
      }

      // Le document a déjà été mis en corbeille : rien à relancer
      if (alert.status === RETENTION_ALERT_STATUS.DELETED) {
        await alert.save();
        continue;
      }

      // Dérogation en cours : on laisse l'alerte en sommeil jusqu'à son terme
      if (alert.exemptedUntil && alert.exemptedUntil > now) {
        alert.status = RETENTION_ALERT_STATUS.EXEMPTED;
        await alert.save();
        continue;
      }
      if (alert.status === RETENTION_ALERT_STATUS.EXEMPTED) {
        alert.exemptedUntil = null;
        alert.status = RETENTION_ALERT_STATUS.UPCOMING;
      }

      if (isExpired) {
        alert.status = RETENTION_ALERT_STATUS.EXPIRED;
        if (!wasExpired) summary.newlyExpiredCount += 1;

        const autoDelete = allowAutoDelete
          && settings.autoDeleteEnabled
          && category.expiryAction === EXPIRY_ACTIONS.AUTO_TRASH;

        if (autoDelete) {
          const reason = `RGPD — durée légale de conservation dépassée (${retentionRuleLabel(category)}, catégorie « ${category.name} »)`;
          const deleted = await softDeleteDocument(docType, doc._id, reason);
          if (deleted) {
            alert.status = RETENTION_ALERT_STATUS.DELETED;
            alert.documentDeletedAt = now;
            alert.deletionMode = 'auto';
            summary.autoDeleted.push(alert);

            await logAudit({
              action: docType === RETENTION_DOC_TYPES.OUTGOING ? 'outgoing.rgpd_trashed' : 'mail.rgpd_trashed',
              category: AUDIT_CATEGORIES.DELETION,
              entityType: docType === RETENTION_DOC_TYPES.OUTGOING ? 'OutgoingMail' : 'Mail',
              entityId: doc._id,
              entityLabel: `${doc.reference || ''} - ${doc.subject || ''}`,
              isSystemAction: true,
              metadata: {
                categoryName: category.name,
                retention: retentionRuleLabel(category),
                legalBasis: category.legalBasis || '',
                expiryDate
              }
            });
          }
        } else {
          const repeatMs = settings.repeatExpiredDays * DAY_MS;
          const dueForReminder = !alert.lastExpiredNotifiedAt
            || (settings.repeatExpiredDays > 0 && (now - alert.lastExpiredNotifiedAt) >= repeatMs);
          if (dueForReminder) {
            summary.expired.push(alert);
            alert.lastExpiredNotifiedAt = now;
            alert.lastNotifiedAt = now;
          }
        }
      } else {
        alert.status = RETENTION_ALERT_STATUS.UPCOMING;
        // Fenêtre de rappel la plus proche encore non notifiée
        const threshold = thresholds.find(t => daysRemaining <= t && !alert.notifiedThresholds.includes(t));
        if (threshold !== undefined) {
          alert.notifiedThresholds.push(threshold);
          alert.lastNotifiedAt = now;
          summary.upcoming.push({ alert, threshold, daysRemaining });
        }
      }

      await alert.save();
    }
  }

  // Alertes orphelines : document sorti du périmètre (catégorie changée, objet renommé,
  // document supprimé par ailleurs). On les clôt au lieu de les laisser alerter à vide.
  if (!categoryIds) {
    const stale = await RetentionAlert.find({
      status: { $in: [RETENTION_ALERT_STATUS.UPCOMING, RETENTION_ALERT_STATUS.EXPIRED, RETENTION_ALERT_STATUS.EXEMPTED] }
    }).select('docType document');
    const staleIds = stale
      .filter(a => !seenAlertKeys.has(`${a.docType}:${a.document}`))
      .map(a => a._id);
    if (staleIds.length > 0) {
      await RetentionAlert.updateMany(
        { _id: { $in: staleIds } },
        { $set: { status: RETENTION_ALERT_STATUS.RESOLVED } }
      );
    }
  }

  if (notify) {
    await dispatchNotifications(summary, settings);
  }

  const counts = {
    scannedCategories: summary.scannedCategories,
    scannedDocuments: summary.scannedDocuments,
    expired: summary.expired.length,
    upcoming: summary.upcoming.length,
    autoDeleted: summary.autoDeleted.length,
    newlyExpired: summary.newlyExpiredCount
  };

  if (counts.expired || counts.upcoming || counts.autoDeleted) {
    console.log(`⚖️ RGPD : ${counts.expired} à supprimer, ${counts.upcoming} échéance(s) proche(s), ${counts.autoDeleted} suppression(s) automatique(s)`);
  }

  // Horodatage du dernier contrôle (affiché sur la page Conformité RGPD)
  if (!categoryIds) {
    await Settings.setValue(
      'rgpd_last_scan_at',
      new Date().toISOString(),
      'rgpd',
      'Dernier contrôle des durées de conservation'
    );
  }

  return counts;
};

// ---------------------------------------------------------------------------
// Destinataires et envoi des alertes
// ---------------------------------------------------------------------------

// Les alertes RGPD sont réservées aux administrateurs (+ adresses supplémentaires)
export const getRgpdRecipients = async () => {
  const adminGroup = await Group.findOne({ name: 'Administrateur' }).select('_id');
  if (!adminGroup) return [];
  return User.find({ group: adminGroup._id, isActive: true })
    .select('firstName lastName email')
    .lean();
};

const dispatchNotifications = async (summary, settings) => {
  const hasSomething = summary.expired.length || summary.upcoming.length || summary.autoDeleted.length;
  if (!hasSomething) return;

  const admins = await getRgpdRecipients();
  if (admins.length === 0) return;

  // Rappels avant échéance regroupés par fenêtre (J-90, J-30, J-7…)
  const upcomingByThreshold = summary.upcoming.reduce((acc, item) => {
    acc[item.threshold] = (acc[item.threshold] || 0) + 1;
    return acc;
  }, {});

  for (const admin of admins) {
    if (summary.expired.length > 0) {
      await notifyRetentionExpired(admin, { count: summary.expired.length });
    }
    if (summary.autoDeleted.length > 0) {
      await notifyRetentionDeleted(admin, { count: summary.autoDeleted.length });
    }
    for (const [days, count] of Object.entries(upcomingByThreshold)) {
      await notifyRetentionUpcoming(admin, { count, days });
    }
  }

  if (!settings.emailEnabled) return;

  const documents = [...summary.expired, ...summary.autoDeleted].map(a => ({
    reference: a.reference,
    chronoNumber: a.chronoNumber,
    documentSubject: a.documentSubject,
    categoryName: a.categoryName,
    expiryDate: a.expiryDate
  }));

  const digest = {
    expiredCount: summary.expired.length,
    upcomingCount: summary.upcoming.length,
    deletedCount: summary.autoDeleted.length,
    documents
  };

  const extra = settings.extraEmails
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  const targets = [
    ...admins.filter(a => a.email).map(a => ({ email: a.email, name: `${a.firstName} ${a.lastName}` })),
    ...extra.map(email => ({ email, name: 'Administrateur' }))
  ];

  for (const target of targets) {
    try {
      await sendRetentionDigestEmail(target.email, target.name, digest);
    } catch (err) {
      console.error('Erreur envoi synthèse RGPD:', err.message);
    }
  }
};

/**
 * Appelé après modification de la durée d'une catégorie : recalcule immédiatement
 * les échéances concernées et prévient les administrateurs des documents qui
 * deviennent supprimables du fait du changement.
 */
export const applyRetentionChange = async (category, { previousLabel, newLabel, actor } = {}) => {
  const result = await scanRetention({ categoryIds: [category._id], notify: true });

  const admins = await getRgpdRecipients();
  for (const admin of admins) {
    await notifyRetentionChanged(admin, {
      categoryName: category.name,
      previousLabel: previousLabel || 'Illimitée',
      newLabel: newLabel || retentionRuleLabel(category),
      newlyExpiredCount: result.newlyExpired
    });
  }

  await logAudit({
    action: 'category.retention_changed',
    category: AUDIT_CATEGORIES.SETTINGS,
    entityType: 'Category',
    entityId: category._id,
    entityLabel: category.name,
    changes: { before: previousLabel, after: newLabel },
    metadata: { newlyExpiredCount: result.newlyExpired, actor: actor || null },
    isSystemAction: !actor
  });

  return result;
};

// ---------------------------------------------------------------------------
// Planification
// ---------------------------------------------------------------------------

let scheduledTask = null;

export const initRetentionScheduler = async () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  let settings;
  try {
    settings = await getRgpdSettings();
  } catch (err) {
    console.error('Erreur lecture des paramètres RGPD:', err.message);
    return;
  }

  if (!settings.enabled) {
    console.log('⚖️ Contrôle RGPD des durées de conservation désactivé');
    return;
  }

  const schedule = process.env.RGPD_SCAN_CRON || buildScanCron(settings);

  if (!cron.validate(schedule)) {
    console.error(`❌ Expression cron RGPD invalide: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, () => {
    scanRetention().catch(e => console.error('Erreur contrôle RGPD:', e.message));
  }, { timezone: 'Europe/Paris' });

  console.log(`⚖️ Contrôle RGPD des durées de conservation activé (${schedule})`);
};

// Rechargé après modification des paramètres (fréquence des rappels)
export const reloadRetentionScheduler = () => initRetentionScheduler();
