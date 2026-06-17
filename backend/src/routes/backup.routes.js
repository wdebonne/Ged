import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
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
  ensureBackupDirPublic,
} from '../services/backup.service.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(PERMISSIONS.MANAGE_SETTINGS));

// Multer pour l'import de sauvegarde externe
const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = ensureBackupDirPublic();
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Conserver le nom original s'il est valide, sinon en générer un
      const original = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
      const safe = original.endsWith('.zip') ? original : `imported-${Date.now()}.zip`;
      cb(null, safe);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 Go max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .zip sont acceptés'));
    }
  },
});

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

// POST /api/backup/upload - Import d'une sauvegarde externe
router.post('/upload', backupUpload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    const stats = fs.statSync(req.file.path);
    res.json({
      success: true,
      message: 'Sauvegarde importée avec succès',
      data: {
        filename: req.file.filename,
        size: stats.size,
      },
    });
  } catch (err) {
    console.error('Erreur import sauvegarde:', err);
    // Supprimer le fichier partiel en cas d'erreur
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
