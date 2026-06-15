import express from 'express';
import { body, validationResult } from 'express-validator';
import { LdapGroupMapping, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

const populateOptions = [
  { path: 'gedGroup', select: 'name color' },
  { path: 'services', select: 'name color' },
  { path: 'supervisorServices', select: 'name color' }
];

// GET /api/ldap/group-mappings - Liste des correspondances groupe AD -> rôle/services GED
router.get('/', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), async (req, res) => {
  try {
    const mappings = await LdapGroupMapping.find()
      .sort({ priority: -1, ldapGroupName: 1 })
      .populate(populateOptions);

    res.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    console.error('Erreur liste correspondances LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/ldap/group-mappings - Créer une correspondance
router.post('/', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), [
  body('ldapGroupDN').trim().notEmpty().withMessage('Le DN du groupe LDAP est requis')
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

    const {
      ldapGroupDN,
      ldapGroupName,
      description,
      gedGroup,
      services,
      supervisorServices,
      priority,
      isActive
    } = req.body;

    const mapping = new LdapGroupMapping({
      ldapGroupDN,
      ldapGroupName,
      description,
      gedGroup: gedGroup || null,
      services: services || [],
      supervisorServices: supervisorServices || [],
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await mapping.save();
    await mapping.populate(populateOptions);

    res.status(201).json({
      success: true,
      message: 'Correspondance créée avec succès',
      data: mapping
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une correspondance existe déjà pour ce DN'
      });
    }
    console.error('Erreur création correspondance LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/ldap/group-mappings/:id - Modifier une correspondance
router.put('/:id', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ldapGroupDN,
      ldapGroupName,
      description,
      gedGroup,
      services,
      supervisorServices,
      priority,
      isActive
    } = req.body;

    const mapping = await LdapGroupMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Correspondance non trouvée'
      });
    }

    if (ldapGroupDN !== undefined) mapping.ldapGroupDN = ldapGroupDN;
    if (ldapGroupName !== undefined) mapping.ldapGroupName = ldapGroupName;
    if (description !== undefined) mapping.description = description;
    if (gedGroup !== undefined) mapping.gedGroup = gedGroup || null;
    if (services !== undefined) mapping.services = services;
    if (supervisorServices !== undefined) mapping.supervisorServices = supervisorServices;
    if (priority !== undefined) mapping.priority = priority;
    if (isActive !== undefined) mapping.isActive = isActive;

    await mapping.save();
    await mapping.populate(populateOptions);

    res.json({
      success: true,
      message: 'Correspondance modifiée avec succès',
      data: mapping
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une correspondance existe déjà pour ce DN'
      });
    }
    console.error('Erreur modification correspondance LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/ldap/group-mappings/:id - Supprimer une correspondance
router.delete('/:id', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), async (req, res) => {
  try {
    const mapping = await LdapGroupMapping.findById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Correspondance non trouvée'
      });
    }

    await LdapGroupMapping.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Correspondance supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression correspondance LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
