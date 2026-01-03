import express from 'express';
import { body, validationResult } from 'express-validator';
import { Service, User, Mail, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/services - Liste des services
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', isActive = '' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const services = await Service.find(query)
      .populate('supervisor', 'firstName lastName email')
      .sort({ name: 1 });

    // Calculer les compteurs pour chaque service
    const servicesWithCounts = await Promise.all(
      services.map(async (service) => {
        const serviceObj = service.toObject();
        
        // Compter les utilisateurs appartenant à ce service
        const usersCount = await User.countDocuments({ 
          services: service._id,
          isActive: true 
        });
        
        // Compter les courriers de ce service
        const mailsCount = await Mail.countDocuments({ 
          service: service._id 
        });
        
        return {
          ...serviceObj,
          usersCount,
          mailsCount
        };
      })
    );

    res.json({
      success: true,
      data: servicesWithCounts
    });
  } catch (error) {
    console.error('Erreur liste services:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/services/:id - Détails d'un service
router.get('/:id', authenticate, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('supervisor', 'firstName lastName email');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Erreur détails service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/services - Créer un service
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_SERVICES), [
  body('name').trim().notEmpty().withMessage('Nom du service requis')
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

    const { name, description, code, color } = req.body;

    // Vérifier si le service existe déjà
    const existingService = await Service.findOne({
      $or: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        ...(code ? [{ code: { $regex: `^${code}$`, $options: 'i' } }] : [])
      ]
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Un service avec ce nom ou ce code existe déjà'
      });
    }

    const service = new Service({
      name,
      description,
      code,
      color,
      supervisor: req.body.supervisor || null,
      notifySupervisor: req.body.notifySupervisor !== false
    });

    await service.save();
    
    // Peupler le superviseur pour la réponse
    await service.populate('supervisor', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Service créé avec succès',
      data: service
    });
  } catch (error) {
    console.error('Erreur création service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/services/:id - Modifier un service
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_SERVICES), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, code, color, isActive } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    // Vérifier l'unicité du nom et du code
    if (name || code) {
      const existingService = await Service.findOne({
        _id: { $ne: id },
        $or: [
          ...(name ? [{ name: { $regex: `^${name}$`, $options: 'i' } }] : []),
          ...(code ? [{ code: { $regex: `^${code}$`, $options: 'i' } }] : [])
        ]
      });

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Un service avec ce nom ou ce code existe déjà'
        });
      }
    }

    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (code !== undefined) service.code = code;
    if (color) service.color = color;
    if (isActive !== undefined) service.isActive = isActive;
    if (req.body.supervisor !== undefined) service.supervisor = req.body.supervisor || null;
    if (req.body.notifySupervisor !== undefined) service.notifySupervisor = req.body.notifySupervisor;

    await service.save();
    
    // Peupler le superviseur pour la réponse
    await service.populate('supervisor', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Service modifié avec succès',
      data: service
    });
  } catch (error) {
    console.error('Erreur modification service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/services/:id - Supprimer un service
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_SERVICES), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Service supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
