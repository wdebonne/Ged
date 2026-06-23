import express from 'express';
import { body, validationResult } from 'express-validator';
import { Contact, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';

const router = express.Router();

// GET /api/contacts - Liste des contacts
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '', page = 1, limit = 20 } = req.query;

    const query = {};

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { organization: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erreur liste contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/contacts/autocomplete - Autocomplétion des contacts
router.get('/autocomplete', authenticate, async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (q.length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const contacts = await Contact.find({
      isActive: true,
      $or: [
        { name: { $regex: escapeRegex(q), $options: 'i' } },
        { organization: { $regex: escapeRegex(q), $options: 'i' } }
      ]
    })
    .select('name organization email')
    .sort({ name: 1 })
    .limit(10);

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Erreur autocomplétion contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/contacts/:id - Détails d'un contact
router.get('/:id', authenticate, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Erreur détails contact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/contacts - Créer un contact
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CONTACTS), [
  body('name').trim().notEmpty().withMessage('Nom du contact requis')
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

    const { name, organization, email, address, phone } = req.body;

    const contact = new Contact({
      name,
      organization,
      email,
      address,
      phone
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact créé avec succès',
      data: contact
    });
  } catch (error) {
    console.error('Erreur création contact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/contacts/:id - Modifier un contact
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CONTACTS), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, organization, email, address, phone, isActive } = req.body;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    if (name) contact.name = name;
    if (organization !== undefined) contact.organization = organization;
    if (email !== undefined) contact.email = email;
    if (address !== undefined) contact.address = address;
    if (phone !== undefined) contact.phone = phone;
    if (isActive !== undefined) contact.isActive = isActive;

    await contact.save();

    res.json({
      success: true,
      message: 'Contact modifié avec succès',
      data: contact
    });
  } catch (error) {
    console.error('Erreur modification contact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/contacts/:id - Supprimer un contact
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CONTACTS), async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Contact supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression contact:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
