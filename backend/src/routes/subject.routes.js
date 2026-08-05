import express from 'express';
import { body, validationResult } from 'express-validator';
import { Subject, Category, PERMISSIONS, AUDIT_CATEGORIES } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { logAudit } from '../services/audit.service.js';

const router = express.Router();

// La catégorie porte la durée de conservation RGPD : on ne stocke que sa référence,
// `category` restant le libellé dénormalisé (recherche plein texte, exports).
const resolveCategory = async (categoryId) => {
  if (!categoryId) return { categoryRef: null, category: '' };
  const category = await Category.findById(categoryId).select('name');
  if (!category) return { categoryRef: null, category: '' };
  return { categoryRef: category._id, category: category.name };
};

// GET /api/subjects - Liste des objets avec pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { code: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .populate('categoryRef', 'name color retentionEnabled retentionDuration retentionUnit legalBasis')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Subject.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: subjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur liste objets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/subjects/autocomplete - Autocomplétion des objets
router.get('/autocomplete', authenticate, async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (q.length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const subjects = await Subject.find({
      isActive: true,
      name: { $regex: escapeRegex(q), $options: 'i' }
    })
    .select('name category')
    .sort({ name: 1 })
    .limit(10);

    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Erreur autocomplétion objets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/subjects - Créer un objet
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CONTACTS), [
  body('name').trim().notEmpty().withMessage('Nom de l\'objet requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, code, description, categoryRef, color, isActive } = req.body;

    // Vérifier si l'objet existe déjà
    const existingSubject = await Subject.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Un objet avec ce nom existe déjà'
      });
    }

    const subject = new Subject({
      name,
      code,
      description,
      ...(await resolveCategory(categoryRef)),
      color,
      isActive: isActive ?? true
    });

    await subject.save();

    res.status(201).json({
      success: true,
      message: 'Objet créé avec succès',
      data: subject
    });
  } catch (error) {
    console.error('Erreur création objet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/subjects/:id - Détails d'un objet
router.get('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('Erreur détails objet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/subjects/:id - Modifier un objet
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CONTACTS), [
  body('name').trim().notEmpty().withMessage('Nom de l\'objet requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    const { name, code, description, categoryRef, color, isActive } = req.body;

    // Vérifier si un autre objet avec ce nom existe
    const existingSubject = await Subject.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
      _id: { $ne: req.params.id }
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Un autre objet avec ce nom existe déjà'
      });
    }

    const resolved = await resolveCategory(categoryRef);

    subject.name = name;
    subject.code = code;
    subject.description = description;
    subject.categoryRef = resolved.categoryRef;
    subject.category = resolved.category;
    subject.color = color;
    subject.isActive = isActive;

    await subject.save();

    res.json({
      success: true,
      message: 'Objet mis à jour avec succès',
      data: subject
    });
  } catch (error) {
    console.error('Erreur modification objet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/subjects/:id - Supprimer un objet
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CONTACTS), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    await subject.deleteOne();

    logAudit({
      req,
      action: 'subject.deleted',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'Subject',
      entityId: subject._id,
      entityLabel: subject.name
    });

    res.json({
      success: true,
      message: 'Objet supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression objet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
