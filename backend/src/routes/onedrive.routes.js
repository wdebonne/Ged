import express from 'express';
import { body, validationResult } from 'express-validator';
import { Settings, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as onedriveService from '../services/onedrive.service.js';

const router = express.Router();

// GET /api/onedrive/status - Obtenir le statut OneDrive
router.get('/status', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const status = await onedriveService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Erreur statut OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/onedrive/config - Obtenir la configuration OneDrive
router.get('/config', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const settings = await onedriveService.getOneDriveSettings();
    
    // Masquer les secrets
    if (settings) {
      if (settings.clientSecret) settings.clientSecret = '••••••••';
      if (settings.accessToken) settings.accessToken = '••••••••';
      if (settings.refreshToken) settings.refreshToken = '••••••••';
    }
    
    res.json({
      success: true,
      data: settings || {}
    });
  } catch (error) {
    console.error('Erreur config OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/onedrive/config - Mettre à jour la configuration
router.put('/config',
  authenticate,
  authorize(PERMISSIONS.EDIT_SETTINGS),
  async (req, res) => {
    try {
      const { 
        enabled, 
        clientId, 
        clientSecret, 
        tenantId,
        targetFolder,
        syncArchived,
        syncResponses,
        createServiceFolders,
        createYearFolders,
        createMonthFolders
      } = req.body;
      
      // Sauvegarder chaque paramètre
      const settingsToSave = [
        { key: 'enabled', value: enabled, isSecret: false },
        { key: 'clientId', value: clientId, isSecret: false },
        { key: 'tenantId', value: tenantId, isSecret: false },
        { key: 'targetFolder', value: targetFolder || 'GED-Courrier/Archives', isSecret: false },
        { key: 'syncArchived', value: syncArchived, isSecret: false },
        { key: 'syncResponses', value: syncResponses, isSecret: false },
        { key: 'createServiceFolders', value: createServiceFolders, isSecret: false },
        { key: 'createYearFolders', value: createYearFolders, isSecret: false },
        { key: 'createMonthFolders', value: createMonthFolders, isSecret: false }
      ];
      
      // Ne mettre à jour le secret que s'il n'est pas masqué
      if (clientSecret && clientSecret !== '••••••••') {
        settingsToSave.push({ key: 'clientSecret', value: clientSecret, isSecret: true });
      }
      
      for (const setting of settingsToSave) {
        if (setting.value !== undefined) {
          await Settings.findOneAndUpdate(
            { key: `onedrive_${setting.key}` },
            {
              key: `onedrive_${setting.key}`,
              value: String(setting.value),
              category: 'onedrive',
              isSecret: setting.isSecret
            },
            { upsert: true, new: true }
          );
        }
      }
      
      res.json({
        success: true,
        message: 'Configuration OneDrive enregistrée'
      });
    } catch (error) {
      console.error('Erreur sauvegarde config OneDrive:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/onedrive/auth/url - Obtenir l'URL d'autorisation OAuth
router.get('/auth/url', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const { redirectUri } = req.query;
    
    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        message: 'redirectUri requis'
      });
    }
    
    const authUrl = await onedriveService.getAuthorizationUrl(redirectUri);
    
    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Erreur URL auth OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/onedrive/auth/callback - Callback OAuth
router.post('/auth/callback',
  authenticate,
  authorize(PERMISSIONS.EDIT_SETTINGS),
  async (req, res) => {
    try {
      const { code, redirectUri } = req.body;
      
      if (!code || !redirectUri) {
        return res.status(400).json({
          success: false,
          message: 'code et redirectUri requis'
        });
      }
      
      await onedriveService.exchangeCodeForToken(code, redirectUri);
      
      res.json({
        success: true,
        message: 'Connexion OneDrive réussie'
      });
    } catch (error) {
      console.error('Erreur callback OneDrive:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/onedrive/test - Tester la connexion
router.post('/test', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const result = await onedriveService.testConnection();
    
    res.json({
      success: true,
      message: 'Connexion OneDrive réussie',
      data: result
    });
  } catch (error) {
    console.error('Erreur test OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/onedrive/disconnect - Déconnecter OneDrive
router.post('/disconnect', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    await onedriveService.disconnect();
    
    res.json({
      success: true,
      message: 'Déconnexion OneDrive réussie'
    });
  } catch (error) {
    console.error('Erreur déconnexion OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/onedrive/folders - Lister les dossiers OneDrive
router.get('/folders', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const { path: folderPath } = req.query;
    const folders = await onedriveService.listFolders(folderPath || 'root');
    
    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Erreur liste dossiers OneDrive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/onedrive/folders - Créer un dossier OneDrive
router.post('/folders',
  authenticate,
  authorize(PERMISSIONS.EDIT_SETTINGS),
  [
    body('name').trim().notEmpty().withMessage('Le nom du dossier est requis')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }
      
      const { path: parentPath, name } = req.body;
      const folder = await onedriveService.createFolder(parentPath || '/', name);
      
      res.json({
        success: true,
        message: 'Dossier créé',
        data: folder
      });
    } catch (error) {
      console.error('Erreur création dossier OneDrive:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

export default router;
