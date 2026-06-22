import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { OutgoingMail, Contact, Subject, User, Service, OUTGOING_MAIL_STATUS, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize, isAdmin } from '../middleware/auth.middleware.js';
import { uploadOutgoing, handleUploadError, validateMagicBytes } from '../middleware/upload.middleware.js';
import { extractTextFromPDF } from '../services/ocr.service.js';
import { escapeRegex } from '../utils/regex.js';

const router = express.Router();

const uploadPath = process.env.UPLOAD_PATH || './uploads';

const MONTH_NAMES = {
  1: '01 - Janvier', 2: '02 - Février', 3: '03 - Mars',
  4: '04 - Avril', 5: '05 - Mai', 6: '06 - Juin',
  7: '07 - Juillet', 8: '08 - Août', 9: '09 - Septembre',
  10: '10 - Octobre', 11: '11 - Novembre', 12: '12 - Décembre'
};

function createArchivePath(outgoingMail) {
  const date = outgoingMail.sentDate || outgoingMail.createdAt || new Date();
  const year = date.getFullYear().toString();
  const monthNum = date.getMonth() + 1;
  const monthFolder = MONTH_NAMES[monthNum];
  const serviceName = outgoingMail.service?.name || 'Sans Service';
  const cleanServiceName = serviceName.replace(/[<>:"/\\|?*]/g, '_').trim();
  return path.join('archives-depart', cleanServiceName, year, monthFolder);
}

// GET /api/outgoing-mails - Liste des courriers départ
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      priority = '',
      search = '',
      destination = '',
      service = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      scope = ''
    } = req.query;

    const query = {};
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);

    if (scope === 'mine') {
      query.sender = req.user._id;
    } else if (scope === 'service') {
      if (userServiceIds.length > 0 && userPermissions.includes(PERMISSIONS.VIEW_SERVICE_OUTGOING)) {
        query.service = { $in: userServiceIds };
      } else {
        query._id = null;
      }
    } else {
      if (userPermissions.includes(PERMISSIONS.VIEW_ALL_OUTGOING)) {
        // Peut voir tous les courriers départ
      } else if (userPermissions.includes(PERMISSIONS.VIEW_SERVICE_OUTGOING) && userServiceIds.length > 0) {
        query.$or = [
          { sender: req.user._id },
          { service: { $in: userServiceIds } }
        ];
      } else {
        query.sender = req.user._id;
      }
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      if (priority === 'high') {
        query.priority = { $in: ['high', 'urgent'] };
      } else {
        query.priority = priority;
      }
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { subject: { $regex: safeSearch, $options: 'i' } },
          { destinationName: { $regex: safeSearch, $options: 'i' } },
          { ocrContent: { $regex: safeSearch, $options: 'i' } },
          { fileName: { $regex: safeSearch, $options: 'i' } },
          { reference: { $regex: safeSearch, $options: 'i' } },
          { notes: { $regex: safeSearch, $options: 'i' } }
        ]
      });
    }

    if (destination) {
      query.destination = destination;
    }

    if (service) {
      query.service = service;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await OutgoingMail.countDocuments(query);
    const mails = await OutgoingMail.find(query)
      .populate('destination', 'name organization email')
      .populate('service', 'name code color')
      .populate('sender', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName')
      .populate('linkedIncomingMail', 'reference subject')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur liste courriers départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/outgoing-mails/:id - Détail d'un courrier départ
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const mail = await OutgoingMail.findById(req.params.id)
      .populate('destination', 'name organization email address phone')
      .populate('service', 'name code color')
      .populate('sender', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName')
      .populate('linkedIncomingMail', 'reference subject senderName receivedDate status')
      .populate('readLogs.user', 'firstName lastName');

    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    res.json({ success: true, data: mail });
  } catch (error) {
    console.error('Erreur détail courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/outgoing-mails - Créer un courrier départ
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_OUTGOING),
  uploadOutgoing.single('document'), handleUploadError, validateMagicBytes(['pdf']),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Un document PDF est requis' });
      }

      const {
        subject, destinationId, destinationName: customDestName,
        service, content, priority, sendingMethod,
        trackingNumber, notes, linkedIncomingMail, tags
      } = req.body;

      if (!subject || !service) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Objet et service sont requis' });
      }

      let dest;
      if (destinationId) {
        dest = await Contact.findById(destinationId);
      }
      if (!dest && customDestName) {
        dest = await Contact.findOne({
          name: { $regex: `^${escapeRegex(customDestName)}$`, $options: 'i' }
        });
        if (!dest) {
          dest = new Contact({ name: customDestName, isActive: true });
          await dest.save();
        }
      }
      if (!dest) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Un destinataire est requis' });
      }

      let ocrContent = '';
      try {
        ocrContent = await extractTextFromPDF(req.file.path);
      } catch (e) {
        console.error('OCR échoué pour courrier départ:', e.message);
      }

      const outgoingMail = new OutgoingMail({
        subject,
        destination: dest._id,
        destinationName: customDestName || dest.name,
        content,
        filePath: req.file.path,
        fileName: req.file.filename,
        fileSize: req.file.size,
        ocrContent,
        service,
        sender: req.user._id,
        createdBy: req.user._id,
        priority: priority || 'normal',
        sendingMethod: sendingMethod || 'courrier',
        trackingNumber,
        notes,
        linkedIncomingMail: linkedIncomingMail || undefined,
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []
      });

      await outgoingMail.save();

      const populated = await OutgoingMail.findById(outgoingMail._id)
        .populate('destination', 'name organization email')
        .populate('service', 'name code color')
        .populate('sender', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Courrier départ créé avec succès',
        data: populated
      });
    } catch (error) {
      console.error('Erreur création courrier départ:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
);

// PUT /api/outgoing-mails/:id - Modifier un courrier départ (brouillon uniquement)
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_OUTGOING),
  uploadOutgoing.single('document'), handleUploadError,
  async (req, res) => {
    try {
      const mail = await OutgoingMail.findById(req.params.id);
      if (!mail) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
      }

      if (mail.status !== OUTGOING_MAIL_STATUS.DRAFT) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Seuls les brouillons peuvent être modifiés' });
      }

      const {
        subject, destinationId, destinationName: customDestName,
        service, content, priority, sendingMethod,
        trackingNumber, notes, linkedIncomingMail, tags
      } = req.body;

      if (subject) mail.subject = subject;
      if (service) mail.service = service;
      if (content !== undefined) mail.content = content;
      if (priority) mail.priority = priority;
      if (sendingMethod) mail.sendingMethod = sendingMethod;
      if (trackingNumber !== undefined) mail.trackingNumber = trackingNumber;
      if (notes !== undefined) mail.notes = notes;
      if (linkedIncomingMail !== undefined) mail.linkedIncomingMail = linkedIncomingMail || null;
      if (tags) mail.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;

      if (destinationId || customDestName) {
        let dest;
        if (destinationId) {
          dest = await Contact.findById(destinationId);
        }
        if (!dest && customDestName) {
          dest = await Contact.findOne({
            name: { $regex: `^${escapeRegex(customDestName)}$`, $options: 'i' }
          });
          if (!dest) {
            dest = new Contact({ name: customDestName, isActive: true });
            await dest.save();
          }
        }
        if (dest) {
          mail.destination = dest._id;
          mail.destinationName = customDestName || dest.name;
        }
      }

      if (req.file) {
        if (mail.filePath && fs.existsSync(mail.filePath)) {
          fs.unlinkSync(mail.filePath);
        }
        mail.filePath = req.file.path;
        mail.fileName = req.file.filename;
        mail.fileSize = req.file.size;
        try {
          mail.ocrContent = await extractTextFromPDF(req.file.path);
        } catch (e) {
          console.error('OCR échoué:', e.message);
        }
      }

      await mail.save();

      const populated = await OutgoingMail.findById(mail._id)
        .populate('destination', 'name organization email')
        .populate('service', 'name code color')
        .populate('sender', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Courrier départ modifié avec succès',
        data: populated
      });
    } catch (error) {
      console.error('Erreur modification courrier départ:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
);

// POST /api/outgoing-mails/:id/send - Marquer comme envoyé
router.post('/:id/send', authenticate, authorize(PERMISSIONS.SEND_OUTGOING), async (req, res) => {
  try {
    const mail = await OutgoingMail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    if (mail.status !== OUTGOING_MAIL_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: 'Seuls les brouillons peuvent être envoyés' });
    }

    await mail.markAsSent(req.user._id);

    const populated = await OutgoingMail.findById(mail._id)
      .populate('destination', 'name organization email')
      .populate('service', 'name code color')
      .populate('sender', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Courrier marqué comme envoyé',
      data: populated
    });
  } catch (error) {
    console.error('Erreur envoi courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/outgoing-mails/:id/archive - Archiver
router.post('/:id/archive', authenticate, authorize(PERMISSIONS.ARCHIVE_OUTGOING), async (req, res) => {
  try {
    const mail = await OutgoingMail.findById(req.params.id)
      .populate('service', 'name code');
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    if (mail.status !== OUTGOING_MAIL_STATUS.SENT) {
      return res.status(400).json({ success: false, message: 'Seuls les courriers envoyés peuvent être archivés' });
    }

    const archiveRelPath = createArchivePath(mail);
    const archiveFullPath = path.join(uploadPath, archiveRelPath);
    if (!fs.existsSync(archiveFullPath)) {
      fs.mkdirSync(archiveFullPath, { recursive: true });
    }

    const ext = path.extname(mail.fileName);
    const archiveFileName = `${mail.reference}${ext}`;
    const archiveFilePath = path.join(archiveFullPath, archiveFileName);

    if (mail.filePath && fs.existsSync(mail.filePath)) {
      fs.copyFileSync(mail.filePath, archiveFilePath);
      fs.unlinkSync(mail.filePath);
    }

    mail.filePath = archiveFilePath;
    mail.fileName = archiveFileName;
    await mail.archive(req.user._id);

    const populated = await OutgoingMail.findById(mail._id)
      .populate('destination', 'name organization email')
      .populate('service', 'name code color')
      .populate('sender', 'firstName lastName email')
      .populate('archivedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Courrier départ archivé avec succès',
      data: populated
    });
  } catch (error) {
    console.error('Erreur archivage courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE /api/outgoing-mails/:id - Supprimer
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const mail = await OutgoingMail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    if (mail.filePath && fs.existsSync(mail.filePath)) {
      fs.unlinkSync(mail.filePath);
    }

    await OutgoingMail.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Courrier départ supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression courrier départ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/outgoing-mails/:id/pdf - Télécharger le PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const mail = await OutgoingMail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    if (!mail.filePath || !fs.existsSync(mail.filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${mail.fileName}"`);
    fs.createReadStream(mail.filePath).pipe(res);
  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/outgoing-mails/:id/read - Marquer comme lu
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const mail = await OutgoingMail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({ success: false, message: 'Courrier départ non trouvé' });
    }

    await mail.markAsRead(req.user._id);

    res.json({ success: true, message: 'Marqué comme lu' });
  } catch (error) {
    console.error('Erreur marquage lu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
