import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { User, Group, Service } from '../models/index.js';
import { authenticate, authorize, isAdmin } from '../middleware/auth.middleware.js';
import { uploadAvatar, handleUploadError } from '../middleware/upload.middleware.js';
import { PERMISSIONS } from '../models/Group.model.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /api/users - Liste des utilisateurs
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_USERS), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      group = '',
      service = '',
      isActive = ''
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    if (group) {
      query.group = group;
    }

    if (service) {
      query.services = service;
    }

    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('group', 'name color')
      .populate('services', 'name code supervisor')
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ lastName: 1, firstName: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/users/recipients - Liste des destinataires pour autocomplétion
router.get('/recipients', authenticate, async (req, res) => {
  try {
    const { search = '', service = '', limit = 500 } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (service) {
      query.services = service;
    }

    const users = await User.find(query)
      .populate('services', 'name supervisor')
      .select('firstName lastName email avatar services')
      .sort({ lastName: 1, firstName: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: users.map(u => ({
        id: u._id,
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: u.fullName,
        email: u.email,
        avatar: u.avatar,
        services: u.services
      }))
    });
  } catch (error) {
    console.error('Erreur liste destinataires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/users/:id - Détails d'un utilisateur
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('group', 'name permissions color')
      .populate('services', 'name code color supervisor')
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions (peut voir son propre profil ou avoir la permission VIEW_USERS)
    const canView = req.user._id.toString() === user._id.toString() ||
                    req.user.group.permissions.includes(PERMISSIONS.VIEW_USERS);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur détails utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/users - Créer un utilisateur
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_USERS), [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('firstName').trim().notEmpty().withMessage('Prénom requis'),
  body('lastName').trim().notEmpty().withMessage('Nom requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('group').notEmpty().withMessage('Groupe requis')
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

    const { username, email, firstName, lastName, password, group, services = [] } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec ce nom ou cet email existe déjà'
      });
    }

    // Vérifier que le groupe existe
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      return res.status(400).json({
        success: false,
        message: 'Groupe invalide'
      });
    }

    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      password,
      group,
      services
    });

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('group', 'name color')
      .populate('services', 'name code supervisor')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: populatedUser
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/users/:id - Modifier un utilisateur
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier les permissions
    const isSelf = req.user._id.toString() === id;
    const canEdit = req.user.group.permissions.includes(PERMISSIONS.EDIT_USERS);

    if (!isSelf && !canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Champs que l'utilisateur peut modifier lui-même
    const selfEditableFields = ['firstName', 'lastName', 'email', 'avatar'];
    
    // Champs que seuls les admins peuvent modifier
    const adminFields = ['username', 'group', 'services', 'isActive', 'password'];

    for (const key of Object.keys(updates)) {
      if (isSelf && !canEdit && adminFields.includes(key)) {
        continue; // Ignorer les champs admin si l'utilisateur modifie son propre profil
      }
      if (key !== 'password') {
        user[key] = updates[key];
      }
    }

    // Gérer le changement de mot de passe séparément
    if (updates.password && canEdit) {
      user.password = updates.password;
    }

    await user.save();

    const updatedUser = await User.findById(id)
      .populate('group', 'name color permissions')
      .populate('services', 'name code supervisor')
      .select('-password -resetPasswordToken -resetPasswordExpires');

    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      data: updatedUser
    });
  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/users/:id/avatar - Uploader un avatar
router.post('/:id/avatar', authenticate, uploadAvatar.single('avatar'), handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier les permissions
    const isSelf = req.user._id.toString() === id;
    const canEdit = req.user.group.permissions.includes(PERMISSIONS.EDIT_USERS);

    if (!isSelf && !canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      // Supprimer le fichier uploadé
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'ancien avatar si existe
    if (user.avatar) {
      const oldPath = path.join(process.env.UPLOAD_PATH || './uploads', user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    user.avatar = `avatars/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar mis à jour',
      data: { avatar: user.avatar }
    });
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_USERS), async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher la suppression de son propre compte
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'avatar si existe
    if (user.avatar) {
      const avatarPath = path.join(process.env.UPLOAD_PATH || './uploads', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/users/:id/toggle-active - Activer/désactiver un utilisateur
router.put('/:id/toggle-active', authenticate, authorize(PERMISSIONS.EDIT_USERS), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'}`,
      data: { isActive: user.isActive }
    });
  } catch (error) {
    console.error('Erreur toggle utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
