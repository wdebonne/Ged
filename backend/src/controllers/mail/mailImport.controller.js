import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Mail, PendingMail, Contact, Subject, User, Service, MAIL_STATUS } from '../../models/index.js';
import { extractTextFromPDF } from '../../services/ocr.service.js';
import { queueRegisterUpdate } from '../../services/excel.service.js';
import {
  notifyNewMailToRecipient,
  notifyNewMailToCopyRecipient,
  notifyNewMailToServiceSupervisor
} from '../../services/notification.service.js';
import { parseTags, resolveDueDate } from './mail.helpers.js';

// POST /api/mails - Créer un courrier directement avec upload de fichier
export async function createMail(req, res) {
  try {
    const {
      senderName,
      senderId,
      subject,
      subjectId,
      serviceId,
      assignedToId,
      priority,
      notes,
      receivedDate,
      dueDate,
      tags
    } = req.body;

    // Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Fichier PDF requis'
      });
    }

    if (!subject && !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Objet requis'
      });
    }

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Service destinataire requis'
      });
    }

    // Gérer l'expéditeur
    let sender;
    if (senderId && mongoose.Types.ObjectId.isValid(senderId)) {
      sender = await Contact.findById(senderId);
    }

    if (!sender && senderName) {
      // Chercher par nom ou créer
      sender = await Contact.findOne({ name: senderName });
      if (!sender) {
        sender = new Contact({ name: senderName, isActive: true });
        await sender.save();
      }
    }

    if (!sender) {
      return res.status(400).json({
        success: false,
        message: 'Expéditeur requis'
      });
    }

    // Gérer l'objet
    let subjectText = subject;
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      const subjectDoc = await Subject.findById(subjectId);
      if (subjectDoc) {
        subjectText = subjectDoc.name;
      }
    }

    // Enregistrer l'objet si nouveau
    const existingSubject = await Subject.findOne({ name: subjectText });
    if (!existingSubject) {
      const newSubject = new Subject({ name: subjectText });
      await newSubject.save();
    }

    // Trouver un destinataire
    let recipientId = assignedToId;
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      // Trouver un utilisateur du service par défaut
      const serviceUser = await User.findOne({
        services: serviceId,
        isActive: true
      });
      recipientId = serviceUser?._id || req.user._id;
    }

    // OCR si activé
    let ocrContent = '';
    try {
      ocrContent = await extractTextFromPDF(req.file.path);
    } catch (ocrError) {
      console.log('OCR non disponible ou erreur:', ocrError.message);
    }

    // Créer le courrier
    const mailReceivedDate = receivedDate ? new Date(receivedDate) : new Date();
    const mail = new Mail({
      subject: subjectText,
      sender: sender._id,
      senderName: senderName || sender.name,
      filePath: `courriers/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      ocrContent,
      service: serviceId,
      recipient: recipientId,
      receivedDate: mailReceivedDate,
      dueDate: await resolveDueDate(dueDate, mailReceivedDate),
      importedBy: req.user._id,
      source: 'manual',
      notes,
      tags: parseTags(tags),
      priority: priority || 'normal',
      status: MAIL_STATUS.PENDING
    });

    await mail.save();

    // Peupler les références
    await mail.populate([
      { path: 'sender' },
      { path: 'service' },
      { path: 'recipient', select: 'firstName lastName email' },
      { path: 'importedBy', select: 'firstName lastName' }
    ]);

    // Notifications email
    try {
      const { sendNewMailNotification, sendServiceMailNotification, sendAckReceiptEmail } = await import('../../services/email.service.js');

      // Notifier le destinataire principal
      if (mail.recipient && mail.recipient.email && mail.recipient._id.toString() !== req.user._id.toString()) {
        sendNewMailNotification(
          mail.recipient.email,
          `${mail.recipient.firstName} ${mail.recipient.lastName}`,
          mail,
          { userId: mail.recipient._id, notifType: 'email_newMail_recipient' }
        ).catch(err => console.error('Erreur notification destinataire:', err.message));
        notifyNewMailToRecipient(mail);
      }

      // Notifier les superviseurs du service
      const serviceWithSupervisors = await Service.findById(serviceId).populate('supervisors', 'firstName lastName email');
      if (serviceWithSupervisors?.notifySupervisor && serviceWithSupervisors?.supervisors?.length) {
        for (const supervisor of serviceWithSupervisors.supervisors) {
          if (supervisor.email) {
            sendServiceMailNotification(
              supervisor.email,
              `${supervisor.firstName} ${supervisor.lastName}`,
              mail,
              serviceWithSupervisors.name,
              { userId: supervisor._id }
            ).catch(err =>
              console.error('Erreur notification superviseur:', err.message)
            );
            notifyNewMailToServiceSupervisor(mail, supervisor, serviceWithSupervisors.name);
          }
        }
      }

      // Accusé de réception automatique à l'expéditeur (si activé dans les paramètres)
      if (mail.sender?.email) {
        sendAckReceiptEmail(
          mail.sender.email,
          mail.senderName || mail.sender.name,
          mail,
          mail.service?.name || ''
        ).catch(err => console.error('Erreur accusé de réception:', err.message));
      }
    } catch (notifError) {
      console.error('Erreur notification:', notifError.message);
    }

    queueRegisterUpdate('incoming', mail._id);

    res.status(201).json({
      success: true,
      message: 'Courrier créé avec succès',
      data: mail
    });
  } catch (error) {
    console.error('Erreur création courrier:', error);
    // Supprimer le fichier uploadé en cas d'erreur
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du courrier'
    });
  }
}

// POST /api/mails/import - Importer un courrier en attente
export async function importPendingMail(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      pendingMailId,
      subject,
      senderId,
      senderName: customSenderName,
      serviceId,
      recipientId,
      recipientsCopyIds = [],
      receivedDate,
      dueDate,
      notes,
      priority,
      tags,
      rotation,
      cropRect
    } = req.body;

    // Récupérer le courrier en attente
    const pendingMail = await PendingMail.findById(pendingMailId);
    if (!pendingMail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier en attente non trouvé'
      });
    }

    // Vérifier ou créer l'expéditeur
    let sender;
    if (mongoose.Types.ObjectId.isValid(senderId)) {
      sender = await Contact.findById(senderId);
    }

    if (!sender) {
      // Chercher par nom (insensible à la casse)
      const senderName = senderId || customSenderName;
      sender = await Contact.findOne({
        name: { $regex: new RegExp(`^${senderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      // Créer seulement si l'expéditeur n'existe pas
      if (!sender) {
        sender = new Contact({
          name: senderName,
          isActive: true
        });
        await sender.save();
      }
    }

    // Enregistrer l'objet si nouveau
    const existingSubject = await Subject.findOne({ name: subject });
    if (!existingSubject) {
      const newSubject = new Subject({ name: subject });
      await newSubject.save();
    }

    // Appliquer rotation et/ou recadrage si demandés
    const rotationAngle = Number(rotation) || 0;
    if (rotationAngle !== 0 || cropRect) {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const rawBytes = fs.readFileSync(pendingMail.filePath);
      const pdfDoc = await PDFDocument.load(rawBytes);

      for (const page of pdfDoc.getPages()) {
        const { width: W, height: H } = page.getSize();

        if (rotationAngle !== 0) {
          const current = page.getRotation().angle ?? 0;
          page.setRotation(degrees((current + rotationAngle) % 360));
        }

        if (cropRect) {
          const { x, y, x2, y2 } = cropRect;
          let cX, cY, cW, cH;
          switch (rotationAngle % 360) {
            case 90:
              cX = y * W;  cY = (1 - x2) * H;
              cW = (y2 - y) * W;  cH = (x2 - x) * H;
              break;
            case 180:
              cX = (1 - x2) * W;  cY = y * H;
              cW = (x2 - x) * W;  cH = (y2 - y) * H;
              break;
            case 270:
              cX = (1 - y2) * W;  cY = x * H;
              cW = (y2 - y) * W;  cH = (x2 - x) * H;
              break;
            default:
              cX = x * W;  cY = (1 - y2) * H;
              cW = (x2 - x) * W;  cH = (y2 - y) * H;
          }
          page.setCropBox(cX, cY, cW, cH);
        }
      }

      const modified = await pdfDoc.save();
      fs.writeFileSync(pendingMail.filePath, Buffer.from(modified));
    }

    // Déplacer le fichier de pending vers courriers
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const newFileName = pendingMail.fileName;
    const newFilePath = path.join(uploadPath, 'courriers', newFileName);

    fs.renameSync(pendingMail.filePath, newFilePath);

    // Créer le courrier
    const mailReceivedDate = receivedDate ? new Date(receivedDate) : pendingMail.receivedDate;
    const mail = new Mail({
      subject,
      sender: sender._id,
      senderName: customSenderName || sender.name,
      filePath: `courriers/${newFileName}`,
      fileName: newFileName,
      fileSize: pendingMail.fileSize,
      ocrContent: pendingMail.ocrContent,
      service: serviceId,
      recipient: recipientId,
      recipientsCopy: recipientsCopyIds,
      receivedDate: mailReceivedDate,
      dueDate: await resolveDueDate(dueDate, mailReceivedDate),
      importedBy: req.user._id,
      source: pendingMail.source,
      imapMessageId: pendingMail.imapMessageId,
      notes,
      tags: parseTags(tags),
      priority: priority || 'normal',
      status: MAIL_STATUS.PENDING
    });

    await mail.save();

    // Supprimer le courrier en attente
    await PendingMail.findByIdAndDelete(pendingMailId);

    const populatedMail = await Mail.findById(mail._id)
      .populate('sender', 'name organization email')
      .populate('service', 'name code')
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email');

    // Notifications email
    try {
      const { sendNewMailNotification, sendServiceMailNotification, sendAckReceiptEmail } = await import('../../services/email.service.js');

      // Notifier le destinataire principal
      if (populatedMail.recipient && populatedMail.recipient.email && populatedMail.recipient._id.toString() !== req.user._id.toString()) {
        sendNewMailNotification(
          populatedMail.recipient.email,
          `${populatedMail.recipient.firstName} ${populatedMail.recipient.lastName}`,
          populatedMail,
          { userId: populatedMail.recipient._id, notifType: 'email_newMail_recipient' }
        ).catch(err => console.error('Erreur notification destinataire:', err.message));
        notifyNewMailToRecipient(populatedMail);
      }

      // Notifier les destinataires en copie
      if (populatedMail.recipientsCopy?.length > 0) {
        for (const cc of populatedMail.recipientsCopy) {
          if (cc.email && cc._id.toString() !== req.user._id.toString()) {
            sendNewMailNotification(
              cc.email,
              `${cc.firstName} ${cc.lastName}`,
              populatedMail,
              { userId: cc._id, notifType: 'email_newMail_copy' }
            ).catch(err => console.error('Erreur notification CC:', err.message));
            notifyNewMailToCopyRecipient(populatedMail, cc);
          }
        }
      }

      // Notifier les superviseurs du service
      const serviceWithSupervisors = await Service.findById(serviceId).populate('supervisors', 'firstName lastName email');
      if (serviceWithSupervisors?.notifySupervisor && serviceWithSupervisors?.supervisors?.length) {
        for (const supervisor of serviceWithSupervisors.supervisors) {
          if (supervisor.email) {
            sendServiceMailNotification(
              supervisor.email,
              `${supervisor.firstName} ${supervisor.lastName}`,
              populatedMail,
              serviceWithSupervisors.name,
              { userId: supervisor._id }
            ).catch(err =>
              console.error('Erreur notification superviseur:', err.message)
            );
            notifyNewMailToServiceSupervisor(populatedMail, supervisor, serviceWithSupervisors.name);
          }
        }
      }

      // Accusé de réception automatique à l'expéditeur (si activé dans les paramètres)
      if (populatedMail.sender?.email) {
        sendAckReceiptEmail(
          populatedMail.sender.email,
          populatedMail.senderName || populatedMail.sender.name,
          populatedMail,
          populatedMail.service?.name || ''
        ).catch(err => console.error('Erreur accusé de réception:', err.message));
      }
    } catch (notifError) {
      console.error('Erreur notification:', notifError.message);
    }

    queueRegisterUpdate('incoming', populatedMail._id);

    res.status(201).json({
      success: true,
      message: 'Courrier importé avec succès',
      data: populatedMail
    });
  } catch (error) {
    console.error('Erreur import courrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}
