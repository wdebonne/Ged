import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Mail, Settings, PERMISSIONS, AUDIT_CATEGORIES } from '../../models/index.js';
import { generateMailReport, generateMailHistoryPDF } from '../../services/pdf.service.js';
import { logAudit } from '../../services/audit.service.js';
import { isServiceSupervisor } from './mail.helpers.js';

// GET /api/mails/:id/pdf - Télécharger le PDF du courrier uniquement
export async function downloadMailPdf(req, res) {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const uploadBase = path.resolve(uploadPath);
    const filePath = path.resolve(uploadBase, path.normalize(mail.filePath));
    if (!filePath.startsWith(uploadBase + path.sep)) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }

    logAudit({
      req,
      action: 'export.mail_pdf',
      category: AUDIT_CATEGORIES.EXPORT,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${mail.reference || mail.fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// GET /api/mails/:id/pdf/history - Générer le PDF de l'historique
export async function downloadMailHistoryPdf(req, res) {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate('sender', 'name organization')
      .populate('service', 'name code')
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email')
      .populate('importedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName')
      .populate('readLogs.user', 'firstName lastName')
      .populate('responses.respondedBy', 'firstName lastName');

    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    // Récupérer les options d'export depuis les settings
    const exportOptionsSetting = await Settings.findOne({ key: 'export_history_options' });
    const exportOptions = exportOptionsSetting?.value || {
      creation: true,
      service: true,
      recipient: true,
      readLogs: true,
      processed: true,
      responses: true,
      archived: true
    };

    const pdfBuffer = await generateMailHistoryPDF(mail, exportOptions);

    logAudit({
      req,
      action: 'export.mail_pdf_history',
      category: AUDIT_CATEGORIES.EXPORT,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="historique-${mail.reference || mail._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur génération PDF historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// GET /api/mails/:id/pdf/all - Exporter tout (ZIP avec courrier, historique et réponses)
export async function downloadMailZip(req, res) {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate('sender', 'name organization')
      .populate('service', 'name code')
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email')
      .populate('importedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName')
      .populate('readLogs.user', 'firstName lastName')
      .populate('responses.respondedBy', 'firstName lastName');

    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const mainFilePath = path.join(uploadPath, mail.filePath);

    // Vérifier si le fichier principal existe
    if (!fs.existsSync(mainFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier principal non trouvé'
      });
    }

    // Récupérer les options d'export depuis les settings
    const exportOptionsSetting = await Settings.findOne({ key: 'export_history_options' });
    const exportOptions = exportOptionsSetting?.value || {
      creation: true,
      service: true,
      recipient: true,
      readLogs: true,
      processed: true,
      responses: true,
      archived: true
    };

    // Générer le PDF d'historique avec les options
    const historyPdfBuffer = await generateMailHistoryPDF(mail, exportOptions);

    logAudit({
      req,
      action: 'export.mail_zip',
      category: AUDIT_CATEGORIES.EXPORT,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`
    });

    // Créer le ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `export-${mail.reference || mail._id}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    archive.pipe(res);

    // Ajouter le courrier principal
    const mainFileName = mail.reference ? `${mail.reference}.pdf` : mail.fileName;
    archive.file(mainFilePath, { name: `01-Courrier/${mainFileName}` });

    // Ajouter le PDF d'historique
    archive.append(historyPdfBuffer, { name: `02-Historique/historique-${mail.reference || mail._id}.pdf` });

    // Ajouter les fichiers de réponse
    if (mail.responses && mail.responses.length > 0) {
      let responseIndex = 1;
      for (const response of mail.responses) {
        if (response.filePath) {
          const responseFilePath = path.join(uploadPath, response.filePath);
          if (fs.existsSync(responseFilePath)) {
            const responseFileName = response.fileName || `reponse-${responseIndex}.pdf`;
            archive.file(responseFilePath, { name: `03-Reponses/${String(responseIndex).padStart(2, '0')}-${responseFileName}` });
            responseIndex++;
          }
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Erreur export ZIP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// POST /api/mails/export - Exporter les courriers en PDF
export async function exportMailsReport(req, res) {
  try {
    const {
      status,
      dateFrom,
      dateTo,
      sender,
      service,
      exportType = 'list', // 'list' ou 'count'
      includeFields = ['reference', 'subject', 'senderName', 'receivedDate', 'processedDate']
    } = req.body;

    const query = {};
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);
    const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);

    // Appliquer les mêmes filtres de permission que la liste
    if (!userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
      if (canViewServiceMails && userServiceIds.length > 0) {
        query.$or = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id },
          { service: { $in: userServiceIds } }
        ];
      } else {
        query.$or = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ];
      }
    }

    if (status) query.status = status;
    if (sender) query.sender = sender;
    if (service) query.service = service;

    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) query.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = endDate;
      }
    }

    const mails = await Mail.find(query)
      .populate('sender', 'name')
      .populate('service', 'name')
      .populate('recipient', 'firstName lastName')
      .sort({ receivedDate: -1 });

    // Générer le PDF
    const pdfBuffer = await generateMailReport(mails, {
      exportType,
      includeFields,
      dateFrom,
      dateTo,
      generatedBy: req.user.fullName
    });

    logAudit({
      req,
      action: 'export.mail_report',
      category: AUDIT_CATEGORIES.EXPORT,
      entityType: 'Mail',
      entityLabel: `Registre PDF (${mails.length} courrier(s))`,
      metadata: { exportType, dateFrom, dateTo }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=export-courriers-${new Date().toISOString().slice(0, 10)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur export:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}
