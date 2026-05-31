import jwt from 'jsonwebtoken';
import { User, Group } from '../models/index.js';

// Middleware d'authentification JWT
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      const user = await User.findById(decoded.userId)
        .populate('group')
        .populate('services');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé.'
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé.'
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré. Veuillez vous reconnecter.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token invalide.'
      });
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification.'
    });
  }
};

// Middleware de vérification des permissions
export const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.group) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Groupe non défini.'
      });
    }
    
    const userPermissions = req.user.group.permissions || [];
    
    // Vérifier si l'utilisateur a au moins une des permissions requises
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Permission insuffisante.'
      });
    }
    
    next();
  };
};

// Middleware pour vérifier si l'utilisateur est admin
export const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.group || req.user.group.name !== 'Administrateur') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs.'
    });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur peut importer des courriers
export const canImportMails = (req, res, next) => {
  if (!req.user || !req.user.group) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé.'
    });
  }
  
  const allowedGroups = ['Administrateur', 'Archiviste'];
  if (!allowedGroups.includes(req.user.group.name)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs et archivistes.'
    });
  }
  next();
};

// Middleware optionnel d'authentification (pour les routes publiques/privées)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const user = await User.findById(decoded.userId)
        .populate('group')
        .populate('services');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalide, continuer sans utilisateur
    }
    
    next();
  } catch (error) {
    next();
  }
};
