import express from 'express';
import { body, validationResult } from 'express-validator';
import { MailType, Mail, AUDIT_CATEGORIES } from '../models/index.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { logAudit } from '../services/audit.service.js';

const router = express.Router();

// La gestion des types est réservée aux administrateurs ; la lecture reste ouverte
// aux utilisateurs authentifiés (choix du type à l'enregistrement d'un courrier).
const adminOnly = [authenticate, isAdmin];

const validators = [
  body('name').trim().notEmpty().withMessage('Nom du type requis'),
  body('order').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Ordre invalide')
];

const readPayload = (body) => ({
  name: body.name,
  code: body.code || '',
  description: body.description || '',
  color: body.color || '#4F46E5',
  isActive: body.isActive ?? true,
  isDefault: body.isDefault === true || body.isDefault === 'true',
  order: Number.isFinite(parseInt(body.order, 10)) ? parseInt(body.order, 10) : 0
});

// Nombre de courriers rattachés à chaque type, en une seule agrégation
const countMailsByType = async (typeIds) => {
  const rows = await Mail.aggregate([
    { $match: { mailType: { $in: typeIds }, deletedAt: null } },
    { $group: { _id: '$mailType', count: { $sum: 1 } } }
  ]);
  return rows.reduce((acc, row) => { acc[String(row._id)] = row.count; return acc; }, {});
};

// Un seul type par défaut : retirer le drapeau des autres
const clearOtherDefaults = (keptId) => MailType.updateMany(
  { _id: { $ne: keptId }, isDefault: true },
  { $set: { isDefault: false } }
);

// GET /api/mail-types - Liste complète (administration)
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '' } = req.query;

    const query = {};
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } }
      ];
    }
    if (isActive !== '') query.isActive = isActive === 'true';

    const types = await MailType.find(query).sort({ order: 1, name: 1 }).lean();
    const counts = await countMailsByType(types.map(t => t._id));

    res.json({
      success: true,
      data: types.map(type => ({
        ...type,
        mailCount: counts[String(type._id)] || 0
      }))
    });
  } catch (error) {
    console.error('Erreur liste types de document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/mail-types/options - Liste légère pour les listes déroulantes
router.get('/options', authenticate, async (req, res) => {
  try {
    const types = await MailType.find({ isActive: true })
      .select('name code color isDefault order')
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Erreur options types de document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/mail-types - Créer
router.post('/', ...adminOnly, validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const payload = readPayload(req.body);

    const existing = await MailType.findOne({
      name: { $regex: `^${escapeRegex(payload.name)}$`, $options: 'i' }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Un type avec ce nom existe déjà' });
    }

    const type = await MailType.create({
      ...payload,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    if (type.isDefault) await clearOtherDefaults(type._id);

    await logAudit({
      req,
      action: 'mailType.created',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'MailType',
      entityId: type._id,
      entityLabel: type.name
    });

    res.status(201).json({ success: true, message: 'Type créé avec succès', data: type });
  } catch (error) {
    console.error('Erreur création type de document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/mail-types/:id - Modifier
router.put('/:id', ...adminOnly, validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const type = await MailType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const payload = readPayload(req.body);

    const duplicate = await MailType.findOne({
      name: { $regex: `^${escapeRegex(payload.name)}$`, $options: 'i' },
      _id: { $ne: type._id }
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Un autre type porte déjà ce nom' });
    }

    // Un type désactivé ne peut pas rester le type proposé par défaut
    if (!payload.isActive) payload.isDefault = false;

    Object.assign(type, payload, { updatedBy: req.user._id });
    await type.save();

    if (type.isDefault) await clearOtherDefaults(type._id);

    await logAudit({
      req,
      action: 'mailType.updated',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'MailType',
      entityId: type._id,
      entityLabel: type.name
    });

    res.json({ success: true, message: 'Type mis à jour avec succès', data: type });
  } catch (error) {
    console.error('Erreur modification type de document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/mail-types/:id - Supprimer
// Les courriers rattachés ne sont jamais supprimés : ils perdent simplement leur type.
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const type = await MailType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const linkedMails = await Mail.countDocuments({ mailType: type._id });
    if (linkedMails > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        success: false,
        message: `${linkedMails} courrier(s) utilisent ce type`,
        data: { linkedMails }
      });
    }

    await Mail.updateMany({ mailType: type._id }, { $set: { mailType: null } });
    await type.deleteOne();

    await logAudit({
      req,
      action: 'mailType.deleted',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'MailType',
      entityId: type._id,
      entityLabel: type.name,
      metadata: { detachedMails: linkedMails }
    });

    res.json({ success: true, message: 'Type supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression type de document:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
