/**
 * Routes API pour le stockage S3
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../models/index.js';
import {
  getS3Settings,
  saveS3Settings,
  getStatus,
  testConnection,
  listObjects,
  createFolder,
  disconnect
} from '../services/s3.service.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification et la permission de gérer les paramètres
router.use(authenticate);
router.use(authorize(PERMISSIONS.MANAGE_SETTINGS));

/**
 * GET /api/storage/s3/status
 * Obtenir le statut de la connexion S3
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Erreur status S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/storage/s3/config
 * Obtenir la configuration S3
 */
router.get('/config', async (req, res) => {
  try {
    const settings = await getS3Settings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Erreur config S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/storage/s3/config
 * Mettre à jour la configuration S3
 */
router.put('/config', async (req, res) => {
  try {
    const settings = await saveS3Settings(req.body);
    res.json({ success: true, data: settings, message: 'Configuration S3 mise à jour' });
  } catch (error) {
    console.error('Erreur update config S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/s3/test
 * Tester la connexion S3
 */
router.post('/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json({ success: result.success, data: result, message: result.message });
  } catch (error) {
    console.error('Erreur test S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/s3/disconnect
 * Déconnecter S3
 */
router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ success: true, message: 'S3 déconnecté' });
  } catch (error) {
    console.error('Erreur disconnect S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/storage/s3/objects
 * Lister les objets/dossiers
 */
router.get('/objects', async (req, res) => {
  try {
    const { prefix } = req.query;
    const result = await listObjects(prefix || '');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur list objects S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/storage/s3/folders
 * Créer un dossier
 */
router.post('/folders', async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ success: false, message: 'Chemin requis' });
    }
    
    const result = await createFolder(folderPath);
    res.json({ success: true, data: result, message: 'Dossier créé' });
  } catch (error) {
    console.error('Erreur create folder S3:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
