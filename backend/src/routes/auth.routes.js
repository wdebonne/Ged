import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { User, Group, Service, Settings, LdapGroupMapping } from '../models/index.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import { authenticateLDAP } from '../services/ldap.service.js';
import { authenticateKerberos } from '../services/kerberos.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { normalizeDN } from '../utils/ldap.utils.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Générer un token JWT d'accès
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// Générer un refresh token longue durée
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// POST /api/auth/login - Connexion
router.post('/login', loginLimiter, [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis'),
  body('password').notEmpty().withMessage('Mot de passe requis')
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

    const { username, password, authMethod } = req.body;

    let user = null;
    let ldapResult = null;

    // Déterminer la stratégie d'authentification :
    // - Si authMethod est explicitement fourni, l'utiliser
    // - Sinon, tenter LDAP d'abord (si activé), puis fallback local
    const ldapEnabled = process.env.LDAP_ENABLED === 'true';
    const kerberosEnabled = process.env.KERBEROS_ENABLED === 'true';
    const explicitMethod = authMethod || null;

    let authenticatedVia = null;

    // === Tentative LDAP ===
    if (ldapEnabled && (!explicitMethod || explicitMethod === 'ldap')) {
      ldapResult = await authenticateLDAP(username, password);
      if (ldapResult.success) {
        authenticatedVia = 'ldap';
      } else if (explicitMethod === 'ldap') {
        return res.status(401).json({
          success: false,
          message: ldapResult.message || 'Identifiants incorrects'
        });
      }
    }

    // === Tentative Kerberos ===
    if (!authenticatedVia && kerberosEnabled && (!explicitMethod || explicitMethod === 'kerberos')) {
      const kerberosResult = await authenticateKerberos(username, password);
      if (kerberosResult.success) {
        authenticatedVia = 'kerberos';
      } else if (explicitMethod === 'kerberos') {
        return res.status(401).json({
          success: false,
          message: 'Identifiants incorrects'
        });
      }
    }

    // === Tentative locale ===
    if (!authenticatedVia && (!explicitMethod || explicitMethod === 'local')) {
      user = await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      }).populate('group').populate('services');

      if (user && (user.ldapUser || user.kerberosUser)) {
        // Compte externe : ne pas tenter l'auth locale
        if (explicitMethod === 'local') {
          return res.status(401).json({
            success: false,
            message: 'Ce compte utilise une authentification externe (LDAP/Kerberos)'
          });
        }
      } else if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          authenticatedVia = 'local';
        } else if (explicitMethod === 'local') {
          return res.status(401).json({
            success: false,
            message: 'Identifiants incorrects'
          });
        }
      }
    }

    if (!authenticatedVia) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // === Post-auth LDAP : création/synchronisation utilisateur ===
    if (authenticatedVia === 'ldap') {
      user = await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { ldapDN: ldapResult.userDN }
        ]
      }).populate('group').populate('services');

      if (!user) {
        const defaultGroup = await Group.findOne({ name: 'Utilisateur' });
        user = new User({
          username: username.toLowerCase(),
          email: ldapResult.userInfo.mail || `${username}@ldap.local`,
          firstName: ldapResult.userInfo.givenName || username,
          lastName: ldapResult.userInfo.sn || '',
          ldapUser: true,
          ldapDN: ldapResult.userDN,
          group: defaultGroup._id
        });
        await user.save();
        user = await User.findById(user._id).populate('group').populate('services');
      } else {
        const updates = {};
        if (ldapResult.userInfo.givenName && ldapResult.userInfo.givenName !== user.firstName) {
          updates.firstName = ldapResult.userInfo.givenName;
        }
        if (ldapResult.userInfo.sn && ldapResult.userInfo.sn !== user.lastName) {
          updates.lastName = ldapResult.userInfo.sn;
        }
        if (ldapResult.userInfo.mail && ldapResult.userInfo.mail !== user.email) {
          updates.email = ldapResult.userInfo.mail;
        }

        if (Object.keys(updates).length > 0) {
          try {
            Object.assign(user, updates);
            await user.save();
          } catch (syncError) {
            console.error('Erreur synchronisation infos LDAP:', syncError);
          }
        }
      }

      if (user.deactivatedByLdapSync) {
        user.isActive = true;
        user.deactivatedByLdapSync = false;
        await user.save();
      }

      // Appliquer les correspondances groupe AD -> rôle/services GED
      if (Array.isArray(ldapResult.userInfo.memberOf)) {
        try {
          const memberOfNormalized = ldapResult.userInfo.memberOf.map(normalizeDN);
          const mappings = await LdapGroupMapping.find({
            isActive: true,
            normalizedDN: { $in: memberOfNormalized }
          }).sort({ priority: -1 }).populate('services').populate('supervisorServices');

          const roleMapping = mappings.find((m) => m.gedGroup);
          if (roleMapping && String(user.group?._id || user.group) !== String(roleMapping.gedGroup)) {
            user.group = roleMapping.gedGroup;
          }

          const currentServiceIds = new Set();
          mappings.forEach((m) => m.services.forEach((s) => currentServiceIds.add(String(s._id))));

          const previousLdapServiceIds = (user.ldapManagedServices || []).map((s) => String(s));

          const userServiceIds = new Set((user.services || []).map((s) => String(s._id || s)));
          currentServiceIds.forEach((id) => userServiceIds.add(id));
          previousLdapServiceIds.forEach((id) => {
            if (!currentServiceIds.has(id)) {
              userServiceIds.delete(id);
            }
          });

          user.services = Array.from(userServiceIds);
          user.ldapManagedServices = Array.from(currentServiceIds);

          const currentSupervisorServiceIds = new Set();
          mappings.forEach((m) => m.supervisorServices.forEach((s) => currentSupervisorServiceIds.add(String(s._id))));

          const previousSupervisorServiceIds = (user.ldapSupervisedServices || []).map((s) => String(s));
          const servicesToUnsupervise = previousSupervisorServiceIds.filter((id) => !currentSupervisorServiceIds.has(id));

          if (servicesToUnsupervise.length) {
            await Service.updateMany(
              { _id: { $in: servicesToUnsupervise } },
              { $pull: { supervisors: user._id } }
            );
          }

          if (currentSupervisorServiceIds.size) {
            await Service.updateMany(
              { _id: { $in: Array.from(currentSupervisorServiceIds) } },
              { $addToSet: { supervisors: user._id } }
            );
          }

          user.ldapSupervisedServices = Array.from(currentSupervisorServiceIds);

          await user.save();
          user = await User.findById(user._id).populate('group').populate('services');
        } catch (mappingError) {
          console.error('Erreur application correspondances LDAP:', mappingError);
        }
      }
    }

    // === Post-auth Kerberos : création utilisateur ===
    if (authenticatedVia === 'kerberos') {
      user = await User.findOne({ username: username.toLowerCase() })
        .populate('group')
        .populate('services');

      if (!user) {
        const defaultGroup = await Group.findOne({ name: 'Utilisateur' });
        user = new User({
          username: username.toLowerCase(),
          email: `${username}@${process.env.KERBEROS_REALM}`,
          firstName: username,
          lastName: '',
          kerberosUser: true,
          group: defaultGroup._id
        });
        await user.save();
        user = await User.findById(user._id).populate('group').populate('services');
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Ce compte a été désactivé'
      });
    }

    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar,
          group: {
            id: user.group._id,
            name: user.group.name,
            permissions: user.group.permissions
          },
          services: user.services.map(s => ({
            id: s._id,
            _id: s._id,
            name: s.name,
            supervisors: s.supervisors
          }))
        }
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// POST /api/auth/refresh - Rafraîchir le token d'accès
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token manquant' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable ou inactif' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: { token: newToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token expiré ou invalide' });
  }
});

// GET /api/auth/me - Obtenir l'utilisateur actuel
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          fullName: req.user.fullName,
          avatar: req.user.avatar,
          group: {
            id: req.user.group._id,
            name: req.user.group.name,
            permissions: req.user.group.permissions
          },
          services: req.user.services.map(s => ({
            id: s._id,
            _id: s._id,
            name: s.name,
            supervisors: s.supervisors
          }))
        }
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/forgot-password - Mot de passe oublié
router.post('/forgot-password', forgotPasswordLimiter, [
  body('email').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Email invalide',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Pour des raisons de sécurité, on renvoie toujours un message de succès
    if (!user) {
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
      });
    }

    if (user.ldapUser || user.kerberosUser) {
      return res.json({
        success: true,
        message: 'Ce compte utilise une authentification externe. Veuillez contacter votre administrateur.'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // Envoyer l'email
    const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    res.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
    });
  } catch (error) {
    console.error('Erreur mot de passe oublié:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/reset-password/:token - Réinitialiser le mot de passe
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe invalide',
        errors: errors.array()
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/change-password - Changer le mot de passe
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le nouveau mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/).withMessage('Le nouveau mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/).withMessage('Le nouveau mot de passe doit contenir au moins un chiffre')
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

    if (req.user.ldapUser || req.user.kerberosUser) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de changer le mot de passe d\'un compte externe'
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/auth/config - Obtenir la configuration d'authentification
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ldapEnabled: process.env.LDAP_ENABLED === 'true',
        kerberosEnabled: process.env.KERBEROS_ENABLED === 'true'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/auth/profile - Mettre à jour le profil
router.put('/profile', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user._id;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Prénom, nom et email sont requis'
      });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Préparer les données à mettre à jour
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim()
    };

    // Si un avatar est uploadé
    if (req.file) {
      updateData.avatar = `avatars/${req.file.filename}`;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).populate('group', 'name permissions color').populate('services', 'name code color supervisors');

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/auth/logout - Déconnexion (côté client principalement)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

export default router;
