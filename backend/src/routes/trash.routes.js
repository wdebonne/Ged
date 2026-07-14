import express from 'express';
import { Mail, OutgoingMail, PERMISSIONS, AUDIT_CATEGORIES } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { purgeMail, purgeOutgoingMail, getTrashRetentionDays } from '../services/trash.service.js';
import { logAudit } from '../services/audit.service.js';

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

router.use(authenticate, authorize(PERMISSIONS.MANAGE_TRASH));

const getModel = (type) => (type === 'outgoing' ? OutgoingMail : Mail);

const buildSearchQuery = (type, search) => {
  if (!search) return {};
  const safe = escapeRegex(search);
  const nameField = type === 'outgoing' ? 'destinationName' : 'senderName';
  return {
    $or: [
      { subject: { $regex: safe, $options: 'i' } },
      { reference: { $regex: safe, $options: 'i' } },
      { [nameField]: { $regex: safe, $options: 'i' } }
    ]
  };
};

// GET /api/trash - Liste paginée des éléments en corbeille (type=mail|outgoing)
router.get('/', async (req, res) => {
  try {
    const {
      type = 'mail',
      page = 1,
      limit = 20,
      search = '',
      service = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const Model = getModel(type);
    const query = { deletedAt: { $ne: null }, ...buildSearchQuery(type, search) };

    if (service) query.service = service;
    if (dateFrom || dateTo) {
      query.deletedAt = { ...query.deletedAt };
      if (dateFrom) query.deletedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.deletedAt.$lte = end;
      }
    }

    const total = await Model.countDocuments(query).setOptions({ withDeleted: true });
    const items = await Model.find(query)
      .setOptions({ withDeleted: true })
      .populate('service', 'name code color')
      .populate('deletedBy', 'firstName lastName')
      .sort({ deletedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const retentionDays = await getTrashRetentionDays();
    const now = Date.now();
    const itemsWithCountdown = items.map(item => {
      const obj = item.toObject();
      const elapsedDays = Math.floor((now - new Date(item.deletedAt).getTime()) / DAY_MS);
      obj.daysRemaining = retentionDays > 0 ? Math.max(0, retentionDays - elapsedDays) : null;
      return obj;
    });

    res.json({
      success: true,
      data: {
        items: itemsWithCountdown,
        retentionDays,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur liste corbeille:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/trash/counts - Nombre d'éléments en corbeille par type
router.get('/counts', async (req, res) => {
  try {
    const [mails, outgoing] = await Promise.all([
      Mail.countDocuments({ deletedAt: { $ne: null } }).setOptions({ withDeleted: true }),
      OutgoingMail.countDocuments({ deletedAt: { $ne: null } }).setOptions({ withDeleted: true })
    ]);
    res.json({ success: true, data: { mails, outgoing } });
  } catch (error) {
    console.error('Erreur compteurs corbeille:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/trash/mails/:id/restore - Restaurer un courrier entrant
router.post('/mails/:id/restore', async (req, res) => {
  try {
    const mail = await Mail.findOne({ _id: req.params.id, deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Élément non trouvé dans la corbeille' });
    }

    await mail.restore();

    logAudit({
      req,
      action: 'mail.restored',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`
    });

    res.json({ success: true, message: 'Courrier restauré' });
  } catch (error) {
    console.error('Erreur restauration courrier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/trash/outgoing-mails/:id/restore - Restaurer un courrier sortant
router.post('/outgoing-mails/:id/restore', async (req, res) => {
  try {
    const mail = await OutgoingMail.findOne({ _id: req.params.id, deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Élément non trouvé dans la corbeille' });
    }

    await mail.restore();

    logAudit({
      req,
      action: 'outgoing.restored',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'OutgoingMail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`
    });

    res.json({ success: true, message: 'Courrier départ restauré' });
  } catch (error) {
    console.error('Erreur restauration courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/trash/mails/:id - Purge définitive manuelle
router.delete('/mails/:id', async (req, res) => {
  try {
    const mail = await Mail.findOne({ _id: req.params.id, deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Élément non trouvé dans la corbeille' });
    }

    await purgeMail(mail, { req });

    res.json({ success: true, message: 'Courrier supprimé définitivement' });
  } catch (error) {
    console.error('Erreur purge courrier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/trash/outgoing-mails/:id - Purge définitive manuelle
router.delete('/outgoing-mails/:id', async (req, res) => {
  try {
    const mail = await OutgoingMail.findOne({ _id: req.params.id, deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Élément non trouvé dans la corbeille' });
    }

    await purgeOutgoingMail(mail, { req });

    res.json({ success: true, message: 'Courrier départ supprimé définitivement' });
  } catch (error) {
    console.error('Erreur purge courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/trash/empty - Vider la corbeille (tout ou un type donné)
router.post('/empty', async (req, res) => {
  try {
    const { type = '' } = req.body || {};

    let purgedMails = 0;
    let purgedOutgoing = 0;

    if (type !== 'outgoing') {
      const mails = await Mail.find({ deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
      for (const mail of mails) {
        await purgeMail(mail, { req });
        purgedMails++;
      }
    }

    if (type !== 'mail') {
      const outgoingMails = await OutgoingMail.find({ deletedAt: { $ne: null } }).setOptions({ withDeleted: true });
      for (const mail of outgoingMails) {
        await purgeOutgoingMail(mail, { req });
        purgedOutgoing++;
      }
    }

    res.json({
      success: true,
      message: 'Corbeille vidée',
      data: { mails: purgedMails, outgoing: purgedOutgoing }
    });
  } catch (error) {
    console.error('Erreur vidage corbeille:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
