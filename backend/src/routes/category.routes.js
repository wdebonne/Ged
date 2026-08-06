import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  Category,
  Subject,
  Mail,
  OutgoingMail,
  RetentionAlert,
  RETENTION_UNITS,
  RETENTION_START_POINTS,
  EXPIRY_ACTIONS,
  RETENTION_ALERT_STATUS,
  AUDIT_CATEGORIES
} from '../models/index.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { logAudit } from '../services/audit.service.js';
import {
  previewRetention,
  applyRetentionChange,
  retentionRuleLabel,
  normalizeThresholds
} from '../services/retention.service.js';
import { COMMUNE_CATEGORIES, COMMUNE_DOMAINS, toCategoryPayload } from '../data/communeCategories.js';

const router = express.Router();

// Comparaison de noms tolérante à la casse et aux accents (« État civil » / « etat civil »)
const DIACRITICS = /[̀-ͯ]/g;
const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(DIACRITICS, '')
  .trim()
  .toLowerCase();

// La gestion des catégories est réservée aux administrateurs ; la lecture reste
// ouverte aux utilisateurs authentifiés (sélection de la catégorie d'un objet).
const adminOnly = [authenticate, isAdmin];

/**
 * Nombre de documents (entrants + sortants) rattachés à chaque catégorie, via les
 * objets qui la référencent. Une seule agrégation par collection, quel que soit
 * le nombre de catégories affichées.
 */
const countDocumentsByCategory = async (categoryIds) => {
  const subjects = await Subject.find({ categoryRef: { $in: categoryIds } })
    .select('name categoryRef')
    .lean();

  const counts = {};
  categoryIds.forEach(id => { counts[String(id)] = { subjects: 0, documents: 0 }; });

  const categoryBySubjectName = new Map();
  for (const subject of subjects) {
    const key = String(subject.categoryRef);
    if (counts[key]) counts[key].subjects += 1;
    if (subject.name) categoryBySubjectName.set(subject.name, key);
  }

  const names = [...categoryBySubjectName.keys()];
  if (names.length === 0) return counts;

  const pipeline = [
    { $match: { subject: { $in: names }, deletedAt: null } },
    { $group: { _id: '$subject', count: { $sum: 1 } } }
  ];

  const [mailGroups, outgoingGroups] = await Promise.all([
    Mail.aggregate(pipeline),
    OutgoingMail.aggregate(pipeline)
  ]);

  for (const group of [...mailGroups, ...outgoingGroups]) {
    const key = categoryBySubjectName.get(group._id);
    if (key && counts[key]) counts[key].documents += group.count;
  }

  return counts;
};

// Alertes en cours par catégorie (badge « N documents à supprimer »)
const countAlertsByCategory = async (categoryIds) => {
  const rows = await RetentionAlert.aggregate([
    { $match: { category: { $in: categoryIds }, status: RETENTION_ALERT_STATUS.EXPIRED } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  return rows.reduce((acc, row) => { acc[String(row._id)] = row.count; return acc; }, {});
};

const validators = [
  body('name').trim().notEmpty().withMessage('Nom de la catégorie requis'),
  body('retentionDuration').optional({ nullable: true }).isInt({ min: 0 })
    .withMessage('Durée de conservation invalide'),
  body('retentionUnit').optional().isIn(Object.values(RETENTION_UNITS))
    .withMessage('Unité de durée invalide'),
  body('retentionStartFrom').optional().isIn(Object.values(RETENTION_START_POINTS))
    .withMessage('Point de départ invalide'),
  body('expiryAction').optional().isIn(Object.values(EXPIRY_ACTIONS))
    .withMessage('Action à échéance invalide')
];

const readPayload = (body) => ({
  name: body.name,
  code: body.code,
  domain: body.domain || '',
  sortFinal: ['C', 'E', 'T'].includes(body.sortFinal) ? body.sortFinal : null,
  description: body.description,
  color: body.color,
  isActive: body.isActive ?? true,
  retentionEnabled: body.retentionEnabled === true || body.retentionEnabled === 'true',
  retentionDuration: body.retentionDuration === '' || body.retentionDuration === null || body.retentionDuration === undefined
    ? null
    : parseInt(body.retentionDuration, 10),
  retentionUnit: body.retentionUnit || RETENTION_UNITS.YEARS,
  retentionStartFrom: body.retentionStartFrom || RETENTION_START_POINTS.RECEIVED,
  legalBasis: body.legalBasis || '',
  expiryAction: body.expiryAction || EXPIRY_ACTIONS.NOTIFY,
  alertBeforeDays: normalizeThresholds(body.alertBeforeDays, [])
});

// GET /api/categories - Liste paginée
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '', domain = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (domain) query.domain = domain;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
        { domain: { $regex: safe, $options: 'i' } },
        { legalBasis: { $regex: safe, $options: 'i' } }
      ];
    }
    if (isActive !== '') query.isActive = isActive === 'true';

    const [categories, total, domains] = await Promise.all([
      Category.find(query).sort({ domain: 1, name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Category.countDocuments(query),
      Category.distinct('domain')
    ]);

    const ids = categories.map(c => c._id);
    const [counts, alertCounts] = await Promise.all([
      countDocumentsByCategory(ids),
      countAlertsByCategory(ids)
    ]);

    const data = categories.map(category => ({
      ...category,
      subjectCount: counts[String(category._id)]?.subjects || 0,
      documentCount: counts[String(category._id)]?.documents || 0,
      expiredCount: alertCounts[String(category._id)] || 0,
      retentionLabel: retentionRuleLabel(category)
    }));

    res.json({
      success: true,
      data,
      domains: domains.filter(Boolean).sort(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste catégories:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/categories/options - Liste légère pour les listes déroulantes
router.get('/options', authenticate, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name color retentionEnabled retentionDuration retentionUnit legalBasis')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories.map(c => ({ ...c, retentionLabel: retentionRuleLabel(c) }))
    });
  } catch (error) {
    console.error('Erreur options catégories:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/categories/referential - Aperçu du référentiel type mairie, en indiquant
// ce qui existe déjà (comparaison par nom, insensible à la casse et aux accents)
router.get('/referential', ...adminOnly, async (req, res) => {
  try {
    const existing = await Category.find({}).select('name').lean();
    const existingKeys = new Set(existing.map(c => normalizeName(c.name)));

    const entries = COMMUNE_CATEGORIES.map(entry => ({
      ...toCategoryPayload(entry),
      alreadyExists: existingKeys.has(normalizeName(entry.name))
    }));

    res.json({
      success: true,
      data: {
        domains: COMMUNE_DOMAINS,
        entries,
        toCreate: entries.filter(e => !e.alreadyExists).length,
        existing: entries.filter(e => e.alreadyExists).length
      }
    });
  } catch (error) {
    console.error('Erreur aperçu référentiel:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/categories/import-referential - Importer le référentiel type mairie
// Idempotent : les catégories déjà présentes sont ignorées, sauf si `updateExisting`
// est demandé (leur durée est alors alignée, avec effet rétroactif sur les documents).
router.post('/import-referential', ...adminOnly, async (req, res) => {
  try {
    const updateExisting = req.body?.updateExisting === true;
    const onlyDomains = Array.isArray(req.body?.domains) && req.body.domains.length > 0
      ? new Set(req.body.domains)
      : null;

    const existing = await Category.find({}).lean();
    const existingByKey = new Map(existing.map(c => [normalizeName(c.name), c]));

    const created = [];
    const updated = [];
    const skipped = [];
    let newlyExpiredTotal = 0;

    for (const entry of COMMUNE_CATEGORIES) {
      if (onlyDomains && !onlyDomains.has(entry.domain)) continue;

      const payload = toCategoryPayload(entry);
      const match = existingByKey.get(normalizeName(entry.name));

      if (!match) {
        const category = new Category({
          ...payload,
          createdBy: req.user._id,
          updatedBy: req.user._id
        });
        if (category.retentionEnabled && category.retentionDuration) {
          category.retentionHistory.push({
            enabled: true,
            duration: category.retentionDuration,
            unit: category.retentionUnit,
            reason: 'Import du référentiel type mairie',
            changedBy: req.user._id,
            changedByLabel: `${req.user.firstName} ${req.user.lastName}`
          });
        }
        await category.save();
        created.push(category.name);
        continue;
      }

      if (!updateExisting) {
        skipped.push(match.name);
        continue;
      }

      const category = await Category.findById(match._id);
      const before = {
        enabled: category.retentionEnabled,
        duration: category.retentionDuration,
        unit: category.retentionUnit,
        startFrom: category.retentionStartFrom,
        label: retentionRuleLabel(category)
      };

      // Le nom, la couleur et le code saisis par la collectivité sont préservés :
      // seule la règle de conservation (et ses métadonnées) est alignée.
      category.domain = payload.domain;
      category.sortFinal = payload.sortFinal;
      category.legalBasis = payload.legalBasis;
      category.retentionEnabled = payload.retentionEnabled;
      category.retentionDuration = payload.retentionDuration;
      category.retentionUnit = payload.retentionUnit;
      category.retentionStartFrom = payload.retentionStartFrom;
      category.alertBeforeDays = payload.alertBeforeDays;
      category.updatedBy = req.user._id;

      const retentionChanged = before.enabled !== category.retentionEnabled
        || before.duration !== category.retentionDuration
        || before.unit !== category.retentionUnit
        || before.startFrom !== category.retentionStartFrom;

      if (retentionChanged) {
        category.retentionHistory.push({
          previousEnabled: before.enabled,
          previousDuration: before.duration,
          previousUnit: before.unit,
          enabled: category.retentionEnabled,
          duration: category.retentionDuration,
          unit: category.retentionUnit,
          reason: 'Alignement sur le référentiel type mairie',
          changedBy: req.user._id,
          changedByLabel: `${req.user.firstName} ${req.user.lastName}`
        });
      }

      await category.save();

      if (retentionChanged) {
        const impact = await applyRetentionChange(category, {
          previousLabel: before.label,
          newLabel: retentionRuleLabel(category),
          actor: `${req.user.firstName} ${req.user.lastName}`
        });
        newlyExpiredTotal += impact.newlyExpired;
      }

      updated.push(category.name);
    }

    await logAudit({
      req,
      action: 'category.referential_imported',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'Category',
      entityLabel: 'Référentiel type mairie',
      metadata: {
        created: created.length,
        updated: updated.length,
        skipped: skipped.length,
        newlyExpired: newlyExpiredTotal
      }
    });

    res.json({
      success: true,
      message: `${created.length} catégorie(s) créée(s), ${updated.length} mise(s) à jour, ${skipped.length} ignorée(s)`,
      data: { created, updated, skipped, newlyExpired: newlyExpiredTotal }
    });
  } catch (error) {
    console.error('Erreur import référentiel:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/categories/:id - Détail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('retentionHistory.changedBy', 'firstName lastName')
      .lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const counts = await countDocumentsByCategory([category._id]);
    res.json({
      success: true,
      data: {
        ...category,
        subjectCount: counts[String(category._id)]?.subjects || 0,
        documentCount: counts[String(category._id)]?.documents || 0,
        retentionLabel: retentionRuleLabel(category)
      }
    });
  } catch (error) {
    console.error('Erreur détail catégorie:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/categories/:id/retention-preview - Simuler l'impact d'une durée
// (aucune écriture : sert à afficher « N documents deviendraient supprimables »)
router.post('/:id/retention-preview', ...adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const duration = parseInt(req.body.retentionDuration, 10);
    if (!Number.isFinite(duration) || duration < 0) {
      return res.status(400).json({ success: false, message: 'Durée de conservation invalide' });
    }

    const preview = await previewRetention(category, {
      retentionDuration: duration,
      retentionUnit: req.body.retentionUnit || category.retentionUnit,
      retentionStartFrom: req.body.retentionStartFrom || category.retentionStartFrom
    });

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Erreur simulation rétention:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/categories - Créer
router.post('/', ...adminOnly, validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const payload = readPayload(req.body);

    const existing = await Category.findOne({
      name: { $regex: `^${escapeRegex(payload.name)}$`, $options: 'i' }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Une catégorie avec ce nom existe déjà' });
    }

    const category = new Category({
      ...payload,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    if (category.retentionEnabled && category.retentionDuration) {
      category.retentionHistory.push({
        enabled: true,
        duration: category.retentionDuration,
        unit: category.retentionUnit,
        reason: req.body.changeReason || 'Création de la catégorie',
        changedBy: req.user._id,
        changedByLabel: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    await category.save();

    await logAudit({
      req,
      action: 'category.created',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'Category',
      entityId: category._id,
      entityLabel: category.name,
      metadata: { retention: retentionRuleLabel(category) }
    });

    res.status(201).json({ success: true, message: 'Catégorie créée avec succès', data: category });
  } catch (error) {
    console.error('Erreur création catégorie:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/categories/:id - Modifier
// Un changement de durée est rétroactif : les échéances des documents déjà
// enregistrés sont recalculées immédiatement et les administrateurs alertés.
router.put('/:id', ...adminOnly, validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const payload = readPayload(req.body);

    const duplicate = await Category.findOne({
      name: { $regex: `^${escapeRegex(payload.name)}$`, $options: 'i' },
      _id: { $ne: category._id }
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Une autre catégorie porte déjà ce nom' });
    }

    const before = {
      enabled: category.retentionEnabled,
      duration: category.retentionDuration,
      unit: category.retentionUnit,
      startFrom: category.retentionStartFrom,
      label: retentionRuleLabel(category)
    };
    const previousName = category.name;

    Object.assign(category, payload, { updatedBy: req.user._id });

    const retentionChanged = before.enabled !== category.retentionEnabled
      || before.duration !== category.retentionDuration
      || before.unit !== category.retentionUnit
      || before.startFrom !== category.retentionStartFrom;

    if (retentionChanged) {
      category.retentionHistory.push({
        previousEnabled: before.enabled,
        previousDuration: before.duration,
        previousUnit: before.unit,
        enabled: category.retentionEnabled,
        duration: category.retentionDuration,
        unit: category.retentionUnit,
        reason: req.body.changeReason || '',
        changedBy: req.user._id,
        changedByLabel: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    await category.save();

    // Garder le libellé dénormalisé des objets aligné sur le nom de la catégorie
    if (previousName !== category.name) {
      await Subject.updateMany({ categoryRef: category._id }, { $set: { category: category.name } });
    }

    let impact = null;
    if (retentionChanged) {
      impact = await applyRetentionChange(category, {
        previousLabel: before.label,
        newLabel: retentionRuleLabel(category),
        actor: `${req.user.firstName} ${req.user.lastName}`
      });

      const entry = category.retentionHistory[category.retentionHistory.length - 1];
      if (entry) {
        entry.newlyExpiredCount = impact.newlyExpired;
        await category.save();
      }
    }

    await logAudit({
      req,
      action: 'category.updated',
      category: AUDIT_CATEGORIES.SETTINGS,
      entityType: 'Category',
      entityId: category._id,
      entityLabel: category.name,
      changes: retentionChanged ? { before: before.label, after: retentionRuleLabel(category) } : undefined
    });

    res.json({
      success: true,
      message: retentionChanged && impact?.newlyExpired > 0
        ? `Catégorie mise à jour — ${impact.newlyExpired} document(s) dépassent désormais la durée légale`
        : 'Catégorie mise à jour avec succès',
      data: category,
      impact
    });
  } catch (error) {
    console.error('Erreur modification catégorie:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/categories/:id - Supprimer (détache les objets rattachés)
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    }

    const linkedSubjects = await Subject.countDocuments({ categoryRef: category._id });
    if (linkedSubjects > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        success: false,
        message: `${linkedSubjects} objet(s) utilisent cette catégorie`,
        data: { linkedSubjects }
      });
    }

    await Subject.updateMany({ categoryRef: category._id }, { $set: { categoryRef: null, category: '' } });
    await RetentionAlert.updateMany(
      { category: category._id, status: { $ne: RETENTION_ALERT_STATUS.DELETED } },
      { $set: { status: RETENTION_ALERT_STATUS.RESOLVED } }
    );
    await category.deleteOne();

    await logAudit({
      req,
      action: 'category.deleted',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'Category',
      entityId: category._id,
      entityLabel: category.name,
      metadata: { detachedSubjects: linkedSubjects }
    });

    res.json({ success: true, message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression catégorie:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
