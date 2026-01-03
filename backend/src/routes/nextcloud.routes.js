/**
 * Routes API pour le stockage NextCloud
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../models/index.js';
import {
  getNextCloudSettings,
  saveNextCloudSettings,
  getStatus,
  testConnection,
  listFolders,
  createFolder,
  disconnect
} from '../services/nextcloud.service.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification et la permission de gérer les paramètres
router.use(authenticate);
router.use(authorize(PERMISSIONS.MANAGE_SETTINGS));

/**
 * GET /api/storage/nextcloud/status
 * Obtenir le statut de la connexion NextCloud
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Erreur status NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/storage/nextcloud/config
 * Obtenir la configuration NextCloud
 */
router.get('/config', async (req, res) => {
  try {
    const settings = await getNextCloudSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Erreur config NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/storage/nextcloud/config
 * Mettre à jour la configuration NextCloud
 */
router.put('/config', async (req, res) => {
  try {
    const settings = await saveNextCloudSettings(req.body);
    res.json({ success: true, data: settings, message: 'Configuration NextCloud mise à jour' });
  } catch (error) {
    console.error('Erreur update config NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/nextcloud/test
 * Tester la connexion NextCloud
 */
router.post('/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json({ success: result.success, data: result, message: result.message });
  } catch (error) {
    console.error('Erreur test NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/nextcloud/disconnect
 * Déconnecter NextCloud
 */
router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ success: true, message: 'NextCloud déconnecté' });
  } catch (error) {
    console.error('Erreur disconnect NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/storage/nextcloud/folders
 * Lister les dossiers
 */
router.get('/folders', async (req, res) => {
  try {
    const { path: folderPath } = req.query;
    const result = await listFolders(folderPath || '/');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur list folders NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/nextcloud/folders
 * Créer un dossier
 */
router.post('/folders', async (req, res) => {
  try {
    const { path: folderPath, name } = req.body;
    
    if (!folderPath && !name) {
      return res.status(400).json({ success: false, message: 'Chemin ou nom requis' });
    }
    
    const result = await createFolder(folderPath || '/', name);
    res.json({ success: true, data: result, message: 'Dossier créé' });
  } catch (error) {
    console.error('Erreur create folder NextCloud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
