import express from 'express';
import { body, validationResult } from 'express-validator';
import { Sender, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';

const router = express.Router();

// GET /api/senders - Liste des expéditeurs
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '', limit = '' } = req.query;

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

    let sendersQuery = Sender.find(query).sort({ name: 1 });
    
    if (limit) {
      sendersQuery = sendersQuery.limit(parseInt(limit));
    }

    const senders = await sendersQuery;

    res.json({
      success: true,
      data: senders
    });
  } catch (error) {
    console.error('Erreur liste expéditeurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/senders/autocomplete - Autocomplétion des expéditeurs
router.get('/autocomplete', authenticate, async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (q.length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const senders = await Sender.find({
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
      data: senders
    });
  } catch (error) {
    console.error('Erreur autocomplétion expéditeurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/senders/:id - Détails d'un expéditeur
router.get('/:id', authenticate, async (req, res) => {
  try {
    const sender = await Sender.findById(req.params.id);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Expéditeur non trouvé'
      });
    }

    res.json({
      success: true,
      data: sender
    });
  } catch (error) {
    console.error('Erreur détails expéditeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/senders - Créer un expéditeur
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_SENDERS), [
  body('name').trim().notEmpty().withMessage('Nom de l\'expéditeur requis')
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

    const sender = new Sender({
      name,
      organization,
      email,
      address,
      phone
    });

    await sender.save();

    res.status(201).json({
      success: true,
      message: 'Expéditeur créé avec succès',
      data: sender
    });
  } catch (error) {
    console.error('Erreur création expéditeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/senders/:id - Modifier un expéditeur
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_SENDERS), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, organization, email, address, phone, isActive } = req.body;

    const sender = await Sender.findById(id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Expéditeur non trouvé'
      });
    }

    if (name) sender.name = name;
    if (organization !== undefined) sender.organization = organization;
    if (email !== undefined) sender.email = email;
    if (address !== undefined) sender.address = address;
    if (phone !== undefined) sender.phone = phone;
    if (isActive !== undefined) sender.isActive = isActive;

    await sender.save();

    res.json({
      success: true,
      message: 'Expéditeur modifié avec succès',
      data: sender
    });
  } catch (error) {
    console.error('Erreur modification expéditeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/senders/:id - Supprimer un expéditeur
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_SENDERS), async (req, res) => {
  try {
    const sender = await Sender.findById(req.params.id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Expéditeur non trouvé'
      });
    }

    await Sender.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Expéditeur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression expéditeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
