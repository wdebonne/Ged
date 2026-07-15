import fs from 'fs';
import path from 'path';
import { PendingMail, AUDIT_CATEGORIES } from '../../models/index.js';
import { extractTextFromPDF } from '../../services/ocr.service.js';
import { logAudit } from '../../services/audit.service.js';

// GET /api/mails/pending - Liste des courriers en attente d'import
export async function listPendingMails(req, res) {
  try {
    const pendingMails = await PendingMail.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingMails
    });
  } catch (error) {
    console.error('Erreur liste courriers en attente:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// POST /api/mails/pending/upload - Uploader un courrier en attente
export async function uploadPendingFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const pendingMails = [];

    for (const file of req.files) {
      // Extraire le texte OCR du PDF
      let ocrContent = '';
      try {
        ocrContent = await extractTextFromPDF(file.path);
      } catch (ocrError) {
        console.error('Erreur OCR:', ocrError);
      }

      const pendingMail = new PendingMail({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        source: 'manual',
        ocrContent,
        ocrProcessed: true,
        receivedDate: new Date()
      });

      await pendingMail.save();
      pendingMails.push(pendingMail);
    }

    res.status(201).json({
      success: true,
      message: `${pendingMails.length} fichier(s) uploadé(s)`,
      data: pendingMails
    });
  } catch (error) {
    console.error('Erreur upload courriers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// GET /api/mails/pending/:id/file - Récupérer le fichier PDF d'un courrier en attente
export async function getPendingMailFile(req, res) {
  try {
    const pendingMail = await PendingMail.findById(req.params.id);
    if (!pendingMail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const uploadBase = path.resolve(process.cwd(), path.normalize(process.env.UPLOAD_PATH || 'uploads'));
    const pendingBase = path.join(uploadBase, 'pending');
    const filePath = path.resolve(process.cwd(), path.normalize(pendingMail.filePath));
    if (!filePath.startsWith(pendingBase + path.sep)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le disque'
      });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(pendingMail.originalName)}`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Erreur récupération fichier:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

// DELETE /api/mails/pending/:id - Supprimer un courrier en attente
export async function deletePendingMail(req, res) {
  try {
    const pendingMail = await PendingMail.findById(req.params.id);
    if (!pendingMail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    // Supprimer le fichier
    if (fs.existsSync(pendingMail.filePath)) {
      fs.unlinkSync(pendingMail.filePath);
    }

    await PendingMail.findByIdAndDelete(req.params.id);

    logAudit({
      req,
      action: 'pending_mail.deleted',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'PendingMail',
      entityId: pendingMail._id,
      entityLabel: pendingMail.fileName
    });

    res.json({
      success: true,
      message: 'Courrier supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression courrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}
