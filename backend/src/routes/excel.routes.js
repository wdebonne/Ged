import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../models/index.js';
import { uploadTemplate, handleUploadError, validateMagicBytes } from '../middleware/upload.middleware.js';
import {
  getExcelSettings,
  saveExcelSettings,
  getAvailableFields,
  getTemplatePreview,
  generateRegister,
  getRegisterStatus
} from '../services/excel.service.js';

const router = express.Router();
const uploadPath = process.env.UPLOAD_PATH || './uploads';

// --- Configuration (MANAGE_SETTINGS) ---

router.get('/config', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const settings = await getExcelSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Erreur config Excel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/config', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const settings = await saveExcelSettings(req.body);
    res.json({ success: true, data: settings, message: 'Configuration du registre Excel mise à jour' });
  } catch (error) {
    console.error('Erreur update config Excel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Template management (MANAGE_SETTINGS) ---

router.post('/template/upload', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS),
  uploadTemplate.single('template'), handleUploadError, validateMagicBytes(['xlsx']),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
      }

      const oldSettings = await getExcelSettings();
      if (oldSettings.templatePath) {
        const oldPath = path.join(uploadPath, oldSettings.templatePath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const templateRelPath = `templates/${req.file.filename}`;
      await saveExcelSettings({ templatePath: templateRelPath, templateSource: 'local' });

      res.json({
        success: true,
        message: 'Modèle Excel uploadé avec succès',
        data: { path: templateRelPath, originalName: req.file.originalname }
      });
    } catch (error) {
      console.error('Erreur upload template:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.delete('/template', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const settings = await getExcelSettings();
    if (settings.templatePath) {
      const fullPath = path.join(uploadPath, settings.templatePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await saveExcelSettings({ templatePath: '', templateSource: 'local' });
    res.json({ success: true, message: 'Modèle supprimé' });
  } catch (error) {
    console.error('Erreur suppression template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/template/preview', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const preview = await getTemplatePreview();
    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Erreur preview template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Fields metadata (MANAGE_SETTINGS) ---

router.get('/fields/:type', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const { type } = req.params;
    if (!['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({ success: false, message: "Type invalide. Utilisez 'incoming' ou 'outgoing'" });
    }
    const fields = getAvailableFields(type);
    res.json({ success: true, data: fields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Export / Download (EXPORT_MAILS) ---

router.post('/generate', authenticate, authorize(PERMISSIONS.EXPORT_MAILS), async (req, res) => {
  try {
    const { dateFrom, dateTo, status, service, includeIncoming, includeOutgoing } = req.body;
    const buffer = await generateRegister({ dateFrom, dateTo, status, service, includeIncoming, includeOutgoing });

    const fileName = `registre-courrier-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Erreur génération registre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/download', authenticate, authorize(PERMISSIONS.EXPORT_MAILS), async (req, res) => {
  try {
    const registerDir = path.join(uploadPath, 'registers');
    const fileName = `registre-courrier-${new Date().getFullYear()}.xlsx`;
    const filePath = path.join(registerDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Aucun registre disponible. Créez ou importez des courriers pour générer le registre.' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Erreur téléchargement registre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/status', authenticate, authorize(PERMISSIONS.EXPORT_MAILS), async (req, res) => {
  try {
    const status = await getRegisterStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Erreur status registre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
