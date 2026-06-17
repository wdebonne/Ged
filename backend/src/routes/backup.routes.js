import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../models/index.js';
import {
  createBackup,
  listBackups,
  deleteBackup,
  verifyBackup,
  restoreBackup,
  uploadToNextCloud,
  getBackupConfig,
  saveBackupConfig,
} from '../services/backup.service.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(PERMISSIONS.MANAGE_SETTINGS));

// GET /api/backup/list
router.get('/list', async (req, res) => {
  try {
    const backups = listBackups();
    res.json({ success: true, data: backups });
  } catch (err) {
    console.error('Erreur liste sauvegardes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/backup/create
router.post('/create', async (req, res) => {
  try {
    const { includeFiles = true, label = '' } = req.body;
    const result = await createBackup({ includeFiles, label });
    res.json({ success: true, data: result, message: 'Sauvegarde créée avec succès' });
  } catch (err) {
    console.error('Erreur création sauvegarde:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/backup/download/:filename
router.get('/download/:filename', async (req, res) => {
  try {
    const safe = path.basename(req.params.filename);
    if (!safe.endsWith('.zip')) {
      return res.status(400).json({ success: false, message: 'Fichier invalide' });
    }

    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const filePath = path.join(uploadPath, 'backups', safe);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }

    res.download(filePath, safe);
  } catch (err) {
    console.error('Erreur téléchargement sauvegarde:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/backup/verify/:filename
router.post('/verify/:filename', async (req, res) => {
  try {
    const result = verifyBackup(req.params.filename);
    res.json({ success: true, data: result, message: 'Sauvegarde vérifiée avec succès' });
  } catch (err) {
    console.error('Erreur vérification sauvegarde:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/backup/restore/:filename
router.post('/restore/:filename', async (req, res) => {
  try {
    const result = await restoreBackup(req.params.filename);
    res.json({ success: true, data: result, message: 'Restauration terminée avec succès' });
  } catch (err) {
    console.error('Erreur restauration sauvegarde:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/backup/upload-nextcloud/:filename
router.post('/upload-nextcloud/:filename', async (req, res) => {
  try {
    const result = await uploadToNextCloud(req.params.filename);
    res.json({ success: true, data: result, message: 'Sauvegarde envoyée vers NextCloud' });
  } catch (err) {
    console.error('Erreur upload NextCloud:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/backup/:filename
router.delete('/:filename', async (req, res) => {
  try {
    deleteBackup(req.params.filename);
    res.json({ success: true, message: 'Sauvegarde supprimée' });
  } catch (err) {
    console.error('Erreur suppression sauvegarde:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/backup/config
router.get('/config', async (req, res) => {
  try {
    const config = await getBackupConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('Erreur config backup:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/backup/config
router.put('/config', async (req, res) => {
  try {
    const config = await saveBackupConfig(req.body);
    res.json({ success: true, data: config, message: 'Configuration sauvegardée' });
  } catch (err) {
    console.error('Erreur sauvegarde config backup:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
