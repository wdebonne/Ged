import express from 'express';
import { body, validationResult, query } from 'express-validator';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Mail, PendingMail, Sender, Subject, User, Settings, Service, MAIL_STATUS, RESPONSE_TYPE, PERMISSIONS, Delegation } from '../models/index.js';
import { authenticate, authorize, canImportMails, isAdmin } from '../middleware/auth.middleware.js';
import { uploadCourrier, uploadResponse, uploadPending, handleUploadError } from '../middleware/upload.middleware.js';
import { extractTextFromPDF } from '../services/ocr.service.js';
import { generateMailReport } from '../services/pdf.service.js';
import { generateMailHistoryPDF } from '../services/pdf.service.js';
import archiver from 'archiver';
import { syncArchivedMail as syncToOneDrive } from '../services/onedrive.service.js';
import { escapeRegex } from '../utils/regex.js';

const router = express.Router();

// Fonction pour vérifier si l'utilisateur est superviseur d'au moins un service
function isServiceSupervisor(user) {
  if (!user?.services?.length) return false;
  return user.services.some(service => {
    const supervisorId = service.supervisor?._id?.toString() || service.supervisor?.toString();
    return supervisorId && supervisorId === user._id.toString();
  });
}

// Fonction pour obtenir les IDs des services dont l'utilisateur est superviseur
function getSupervisedServiceIds(user) {
  if (!user?.services?.length) return [];
  return user.services
    .filter(service => {
      const supervisorId = service.supervisor?._id?.toString() || service.supervisor?.toString();
      return supervisorId && supervisorId === user._id.toString();
    })
    .map(s => s._id);
}

// Noms des mois en français
const MONTH_NAMES = {
  1: '01 - Janvier',
  2: '02 - Février',
  3: '03 - Mars',
  4: '04 - Avril',
  5: '05 - Mai',
  6: '06 - Juin',
  7: '07 - Juillet',
  8: '08 - Août',
  9: '09 - Septembre',
  10: '10 - Octobre',
  11: '11 - Novembre',
  12: '12 - Décembre'
};

// Fonction pour générer le nom de fichier archivé selon le format
async function generateArchiveFileName(mail, format) {
  const date = mail.receivedDate || new Date();
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Récupérer le code du service
  let serviceCode = 'GEN';
  if (mail.service) {
    // Utiliser le code du service ou les 3 premières lettres du nom
    serviceCode = mail.service.code || mail.service.name?.substring(0, 3).toUpperCase() || 'GEN';
  }
  
  // Générer le numéro séquentiel
  // Compter les courriers du même service pour l'année
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const endOfYear = new Date(date.getFullYear() + 1, 0, 1);
  const count = await Mail.countDocuments({
    service: mail.service?._id,
    receivedDate: { $gte: startOfYear, $lt: endOfYear },
    _id: { $lte: mail._id }
  });
  const number = String(count).padStart(4, '0');
  
  // Remplacer les variables dans le format
  let fileName = format
    .replace(/{YEAR}/g, year)
    .replace(/{MONTH}/g, month)
    .replace(/{DAY}/g, day)
    .replace(/{SERVICE}/g, serviceCode)
    .replace(/{NUMBER}/g, number);
  
  return fileName;
}

// Fonction pour créer l'arborescence d'archivage
function createArchivePath(mail) {
  const date = mail.receivedDate || new Date();
  const year = date.getFullYear().toString();
  const monthNum = date.getMonth() + 1;
  const monthFolder = MONTH_NAMES[monthNum];
  
  // Nom du service
  const serviceName = mail.service?.name || 'Sans Service';
  // Nettoyer le nom pour qu'il soit valide comme nom de dossier
  const cleanServiceName = serviceName.replace(/[<>:"/\\|?*]/g, '_').trim();
  
  return path.join('archives', cleanServiceName, year, monthFolder);
}

// GET /api/mails - Liste des courriers
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      priority = '',
      search = '',
      sender = '',
      service = '',
      recipient = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'receivedDate',
      sortOrder = 'desc',
      scope = '', // 'mine' = mes courriers, 'service' = courriers service(s), 'delegated' = courriers délégués
      includeDelegated = 'true' // Inclure les courriers délégués dans 'mine'
    } = req.query;

    const query = {};
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);
    
    // Récupérer les délégations actives reçues par l'utilisateur
    let delegatorIds = [];
    if (includeDelegated === 'true' || scope === 'delegated' || scope === 'mine') {
      const delegators = await Delegation.getDelegatorsForUser(req.user._id);
      delegatorIds = delegators.map(d => d._id);
    }

    // Filtrer selon le scope demandé
    if (scope === 'mine') {
      // Mes courriers uniquement (où je suis destinataire) - SANS courriers délégués
      // Exclure les courriers où je suis en copie mais le destinataire principal est un délégant
      if (delegatorIds.length > 0) {
        query.$or = [
          { recipient: req.user._id },  // Je suis destinataire principal
          { 
            recipientsCopy: req.user._id,  // Je suis en copie
            recipient: { $nin: delegatorIds }  // ET le destinataire principal n'est PAS un délégant
          }
        ];
      } else {
        query.$or = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ];
      }
    } else if (scope === 'delegated') {
      // Uniquement les courriers délégués (ceux des utilisateurs qui m'ont délégué)
      if (delegatorIds.length > 0) {
        // Courriers des délégants, en excluant ceux où je suis déjà destinataire
        query.$and = [
          {
            $or: [
              { recipient: { $in: delegatorIds } },
              { recipientsCopy: { $in: delegatorIds } }
            ]
          },
          { recipient: { $nin: [req.user._id] } },
          {
            $or: [
              { recipientsCopy: { $exists: false } },
              { recipientsCopy: { $size: 0 } },
              { recipientsCopy: { $nin: [req.user._id] } }
            ]
          }
        ];
      } else {
        // Pas de délégation, retourner aucun résultat
        query._id = null;
      }
    } else if (scope === 'service') {
      // Courriers de mes services uniquement (exclure ceux où je suis destinataire pour éviter doublons)
      // Vérifier que l'utilisateur a la permission OU est superviseur
      const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);
      
      if (userServiceIds.length > 0 && canViewServiceMails) {
        query.service = { $in: userServiceIds };
        query.recipient = { $ne: req.user._id };
        query.$and = [
          { $or: [{ recipientsCopy: { $exists: false } }, { recipientsCopy: { $ne: req.user._id } }] }
        ];
      } else {
        // Pas de service ou pas de permission, retourner aucun résultat
        query._id = null;
      }
    } else {
      // Comportement par défaut selon les permissions (pour admin et autres cas)
      const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);
      
      if (userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
        // Peut voir tous les courriers
      } else if (canViewServiceMails && userServiceIds.length > 0) {
        // Peut voir les courriers de ses services + ses propres courriers + courriers délégués
        const orConditions = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id },
          { service: { $in: userServiceIds } }
        ];
        
        // Ajouter les courriers délégués
        if (includeDelegated === 'true' && delegatorIds.length > 0) {
          orConditions.push({ recipient: { $in: delegatorIds } });
          orConditions.push({ recipientsCopy: { $in: delegatorIds } });
        }
        
        query.$or = orConditions;
      } else {
        // Peut voir uniquement ses courriers (utilisateur sans service) + courriers délégués
        const orConditions = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ];
        
        // Ajouter les courriers délégués
        if (includeDelegated === 'true' && delegatorIds.length > 0) {
          orConditions.push({ recipient: { $in: delegatorIds } });
          orConditions.push({ recipientsCopy: { $in: delegatorIds } });
        }
        
        query.$or = orConditions;
      }
    }

    // Filtrer par statut
    if (status) {
      query.status = status;
    }

    // Filtrer par priorité
    if (priority) {
      // Supporter la valeur 'high' pour inclure 'high' et 'urgent'
      if (priority === 'high') {
        query.priority = { $in: ['high', 'urgent'] };
      } else {
        query.priority = priority;
      }
    }

    // Recherche textuelle
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { subject: { $regex: safeSearch, $options: 'i' } },
          { senderName: { $regex: safeSearch, $options: 'i' } },
          { ocrContent: { $regex: safeSearch, $options: 'i' } },
          { fileName: { $regex: safeSearch, $options: 'i' } },
          { reference: { $regex: safeSearch, $options: 'i' } }
        ]
      });
    }

    // Filtrer par expéditeur
    if (sender) {
      query.sender = sender;
    }

    // Filtrer par service
    if (service) {
      query.service = service;
    }

    // Filtrer par destinataire
    if (recipient) {
      if (!query.$or) {
        query.recipient = recipient;
      }
    }

    // Filtrer par plage de dates
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) {
        query.receivedDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = endDate;
      }
    }

    // Tri
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Mail.countDocuments(query);
    const mails = await Mail.find(query)
      .populate('sender', 'name organization')
      .populate('service', 'name code color')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('recipientsCopy', 'firstName lastName email')
      .populate('importedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
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
    console.error('Erreur liste courriers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/mails/pending - Liste des courriers en attente d'import
router.get('/pending', authenticate, canImportMails, async (req, res) => {
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
});

// POST /api/mails - Créer un courrier directement avec upload de fichier
router.post('/', authenticate, canImportMails, uploadCourrier.single('document'), handleUploadError, async (req, res) => {
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
      receivedDate
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
      sender = await Sender.findById(senderId);
    }
    
    if (!sender && senderName) {
      // Chercher par nom ou créer
      sender = await Sender.findOne({ name: senderName });
      if (!sender) {
        sender = new Sender({ name: senderName, isActive: true });
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
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      importedBy: req.user._id,
      source: 'manual',
      notes,
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

    // Notifier le superviseur du service si configuré
    try {
      const serviceWithSupervisor = await Service.findById(serviceId).populate('supervisor', 'firstName lastName email');
      if (serviceWithSupervisor?.notifySupervisor && serviceWithSupervisor?.supervisor?.email) {
        const { sendServiceMailNotification } = await import('../services/email.service.js');
        const supervisor = serviceWithSupervisor.supervisor;
        sendServiceMailNotification(
          supervisor.email,
          `${supervisor.firstName} ${supervisor.lastName}`,
          mail,
          serviceWithSupervisor.name
        ).catch(err => 
          console.error('Erreur notification superviseur:', err.message)
        );
      }
    } catch (notifError) {
      console.error('Erreur notification superviseur:', notifError.message);
    }

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
});

// POST /api/mails/pending/upload - Uploader un courrier en attente
router.post('/pending/upload', authenticate, canImportMails, uploadPending.array('files', 20), handleUploadError, async (req, res) => {
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
});

// GET /api/mails/pending/:id/file - Récupérer le fichier PDF d'un courrier en attente
router.get('/pending/:id/file', authenticate, canImportMails, async (req, res) => {
  try {
    const pendingMail = await PendingMail.findById(req.params.id);
    if (!pendingMail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const pendingBase = path.resolve(process.cwd(), 'uploads', 'pending');
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pendingMail.originalName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erreur récupération fichier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/mails/pending/:id - Supprimer un courrier en attente
router.delete('/pending/:id', authenticate, canImportMails, async (req, res) => {
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
});

// POST /api/mails/import - Importer un courrier en attente
router.post('/import', authenticate, canImportMails, [
  body('pendingMailId').notEmpty().withMessage('ID du courrier requis'),
  body('subject').trim().notEmpty().withMessage('Objet requis'),
  body('senderId').notEmpty().withMessage('Expéditeur requis'),
  body('serviceId').notEmpty().withMessage('Service requis'),
  body('recipientId').notEmpty().withMessage('Destinataire requis')
], async (req, res) => {
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
      notes,
      priority
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
      sender = await Sender.findById(senderId);
    }
    
    if (!sender) {
      // Chercher par nom (insensible à la casse)
      const senderName = senderId || customSenderName;
      sender = await Sender.findOne({ 
        name: { $regex: new RegExp(`^${senderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      // Créer seulement si l'expéditeur n'existe pas
      if (!sender) {
        sender = new Sender({
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

    // Déplacer le fichier de pending vers courriers
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const newFileName = pendingMail.fileName;
    const newFilePath = path.join(uploadPath, 'courriers', newFileName);
    
    fs.renameSync(pendingMail.filePath, newFilePath);

    // Créer le courrier
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
      receivedDate: receivedDate ? new Date(receivedDate) : pendingMail.receivedDate,
      importedBy: req.user._id,
      source: pendingMail.source,
      imapMessageId: pendingMail.imapMessageId,
      notes,
      priority: priority || 'normal',
      status: MAIL_STATUS.PENDING
    });

    await mail.save();

    // Supprimer le courrier en attente
    await PendingMail.findByIdAndDelete(pendingMailId);

    const populatedMail = await Mail.findById(mail._id)
      .populate('sender', 'name organization')
      .populate('service', 'name code')
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email');

    // Notifier le superviseur du service si configuré
    try {
      const serviceWithSupervisor = await Service.findById(serviceId).populate('supervisor', 'firstName lastName email');
      if (serviceWithSupervisor?.notifySupervisor && serviceWithSupervisor?.supervisor?.email) {
        const { sendServiceMailNotification } = await import('../services/email.service.js');
        const supervisor = serviceWithSupervisor.supervisor;
        sendServiceMailNotification(
          supervisor.email,
          `${supervisor.firstName} ${supervisor.lastName}`,
          populatedMail,
          serviceWithSupervisor.name
        ).catch(err => 
          console.error('Erreur notification superviseur:', err.message)
        );
      }
    } catch (notifError) {
      console.error('Erreur notification superviseur:', notifError.message);
    }

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
});

// GET /api/mails/:id/pdf - Télécharger le PDF du courrier uniquement
router.get('/:id/pdf', authenticate, async (req, res) => {
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
});

// GET /api/mails/:id/pdf/history - Générer le PDF de l'historique
router.get('/:id/pdf/history', authenticate, async (req, res) => {
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
});

// GET /api/mails/:id/pdf/all - Exporter tout (ZIP avec courrier, historique et réponses)
router.get('/:id/pdf/all', authenticate, async (req, res) => {
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
});

// GET /api/mails/:id - Détails d'un courrier
router.get('/:id', authenticate, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate('sender', 'name organization email phone address')
      .populate('service', 'name code color')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('recipientsCopy', 'firstName lastName email avatar')
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

    // Vérifier les permissions d'accès
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id.toString());
    const isRecipient = mail.recipient && mail.recipient._id.toString() === req.user._id.toString();
    const isCopyRecipient = mail.recipientsCopy && mail.recipientsCopy.some(r => r._id && r._id.toString() === req.user._id.toString());
    const isInUserService = mail.service && userServiceIds.includes(mail.service._id.toString());
    const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);

    // Vérifier si l'utilisateur a une délégation active pour le destinataire de ce courrier
    let hasDelegation = false;
    if (mail.recipient) {
      const delegators = await Delegation.getDelegatorsForUser(req.user._id);
      const delegatorIds = delegators.map(d => d._id.toString());
      hasDelegation = delegatorIds.includes(mail.recipient._id.toString());
      
      // Vérifier aussi les destinataires en copie
      if (!hasDelegation && mail.recipientsCopy?.length > 0) {
        hasDelegation = mail.recipientsCopy.some(r => r._id && delegatorIds.includes(r._id.toString()));
      }
    }

    const canView = userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS) ||
                    (canViewServiceMails && isInUserService) ||
                    isRecipient ||
                    isCopyRecipient ||
                    hasDelegation;

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      data: mail
    });
  } catch (error) {
    console.error('Erreur détails courrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/mails/:id/read - Marquer comme lu
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    await mail.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Courrier marqué comme lu'
    });
  } catch (error) {
    console.error('Erreur marquage lu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/mails/:id/process - Marquer un courrier comme traité
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    console.log('Processing mail:', req.params.id);
    console.log('User:', req.user._id, req.user.group?.name);
    
    const mail = await Mail.findById(req.params.id)
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email');
    
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    console.log('Mail status:', mail.status);

    if (mail.status !== MAIL_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Ce courrier n\'est pas à traiter'
      });
    }

    // Marquer comme traité
    mail.status = MAIL_STATUS.PROCESSED;
    mail.processedDate = new Date();
    mail.processedBy = req.user._id;

    await mail.save();

    console.log('Mail processed successfully');

    // Notifier les autres destinataires (sauf celui qui a traité)
    const processedByName = `${req.user.firstName} ${req.user.lastName}`;
    const mailInfo = {
      _id: mail._id,
      reference: mail.reference,
      subject: mail.subject,
      senderName: mail.senderName
    };

    // Import dynamique pour éviter les dépendances circulaires
    const { sendMailProcessedNotification } = await import('../services/email.service.js');
    
    // Notifier le destinataire principal s'il existe et n'est pas celui qui a traité
    if (mail.recipient && mail.recipient._id.toString() !== req.user._id.toString() && mail.recipient.email) {
      sendMailProcessedNotification(
        mail.recipient.email,
        `${mail.recipient.firstName} ${mail.recipient.lastName}`,
        mailInfo,
        processedByName
      ).catch(err => console.error('Erreur notification recipient:', err));
    }

    // Notifier les destinataires en copie
    if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
      for (const cc of mail.recipientsCopy) {
        if (cc._id.toString() !== req.user._id.toString() && cc.email) {
          sendMailProcessedNotification(
            cc.email,
            `${cc.firstName} ${cc.lastName}`,
            mailInfo,
            processedByName
          ).catch(err => console.error('Erreur notification CC:', err));
        }
      }
    }

    res.json({
      success: true,
      message: 'Courrier marqué comme traité'
    });
  } catch (error) {
    console.error('Erreur traitement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/mails/:id/response - Ajouter une réponse
router.post('/:id/response', authenticate, authorize(PERMISSIONS.PROCESS_MAILS), uploadResponse.single('file'), handleUploadError, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const { type, content } = req.body;

    if (!type || !Object.values(RESPONSE_TYPE).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type de réponse invalide'
      });
    }

    const response = {
      type,
      content: content || '',
      respondedBy: req.user._id,
      date: new Date()
    };

    if (req.file) {
      response.filePath = `responses/${req.file.filename}`;
      response.fileName = req.file.filename;
    }

    await mail.addResponse(response);

    const updatedMail = await Mail.findById(req.params.id)
      .populate('responses.respondedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Réponse ajoutée',
      data: updatedMail.responses[updatedMail.responses.length - 1]
    });
  } catch (error) {
    console.error('Erreur ajout réponse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/mails/:id/archive - Archiver un courrier
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate('service')
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email');
    
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    if (mail.status !== MAIL_STATUS.PROCESSED) {
      return res.status(400).json({
        success: false,
        message: 'Seuls les courriers traités peuvent être archivés'
      });
    }

    // Vérifier les permissions
    const userPermissions = req.user.group?.permissions || [];
    const hasArchivePermission = userPermissions.includes(PERMISSIONS.ARCHIVE_MAILS);
    const hasProcessPermission = userPermissions.includes(PERMISSIONS.PROCESS_MAILS);
    const hasViewAllPermission = userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS);
    
    // Vérifier si l'utilisateur est dans le service du courrier
    const userServiceIds = req.user.services?.map(s => s._id?.toString() || s.toString()) || [];
    const isInMailService = mail.service && userServiceIds.includes(mail.service._id.toString());
    
    // Vérifier si l'utilisateur est le destinataire
    const isRecipient = mail.recipient && mail.recipient._id.toString() === req.user._id.toString();
    
    // Vérifier si l'utilisateur est en copie
    const isInCopy = mail.recipientsCopy?.some(r => r._id.toString() === req.user._id.toString());
    
    // Vérifier si l'utilisateur a une délégation active
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    const delegatorIds = delegators.map(d => d._id.toString());
    const hasDelegation = mail.recipient && delegatorIds.includes(mail.recipient._id.toString());
    
    // Vérifier si l'utilisateur est superviseur du service du courrier
    const isSupervisor = mail.service && req.user.services?.some(s => {
      const supervisorId = s.supervisor?._id?.toString() || s.supervisor?.toString();
      return s._id?.toString() === mail.service._id.toString() && 
             supervisorId === req.user._id.toString();
    });
    
    // L'utilisateur peut archiver si:
    // - Il a la permission archive_mails OU
    // - Il peut traiter les courriers ET est concerné par ce courrier
    const canArchive = hasArchivePermission || (
      hasProcessPermission && (
        hasViewAllPermission ||
        isInMailService ||
        isRecipient ||
        isInCopy ||
        hasDelegation ||
        isSupervisor
      )
    );

    if (!canArchive) {
      return res.status(403).json({
        success: false,
        message: 'Permission refusée'
      });
    }

    // Récupérer le format de référence depuis les paramètres
    const referenceFormatSetting = await Settings.findOne({ key: 'general_referenceFormat' });
    const referenceFormat = referenceFormatSetting?.value || 'GED-{YEAR}-{SERVICE}-{NUMBER}';
    
    // Générer le nouveau nom de fichier
    const archiveFileName = await generateArchiveFileName(mail, referenceFormat);
    const fileExtension = path.extname(mail.fileName);
    const newFileName = `${archiveFileName}${fileExtension}`;
    
    // Créer le chemin d'archivage
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const archiveRelativePath = createArchivePath(mail);
    const archiveFullPath = path.join(uploadPath, archiveRelativePath);
    
    // Créer les dossiers si nécessaire
    if (!fs.existsSync(archiveFullPath)) {
      fs.mkdirSync(archiveFullPath, { recursive: true });
    }
    
    // Déplacer le fichier principal
    const oldFilePath = path.join(uploadPath, mail.filePath);
    const newRelativeFilePath = path.join(archiveRelativePath, newFileName);
    const newFullFilePath = path.join(uploadPath, newRelativeFilePath);
    
    if (fs.existsSync(oldFilePath)) {
      // Vérifier si un fichier avec ce nom existe déjà
      let finalFilePath = newFullFilePath;
      let finalRelativePath = newRelativeFilePath;
      let counter = 1;
      
      while (fs.existsSync(finalFilePath)) {
        const nameWithoutExt = archiveFileName;
        finalRelativePath = path.join(archiveRelativePath, `${nameWithoutExt}_${counter}${fileExtension}`);
        finalFilePath = path.join(uploadPath, finalRelativePath);
        counter++;
      }
      
      // Copier le fichier (plutôt que déplacer pour éviter les problèmes de permissions)
      fs.copyFileSync(oldFilePath, finalFilePath);
      fs.unlinkSync(oldFilePath);
      
      // Mettre à jour le chemin du fichier
      mail.filePath = finalRelativePath;
      mail.fileName = path.basename(finalFilePath);
    }
    
    // Déplacer les fichiers de réponse également
    for (let i = 0; i < mail.responses.length; i++) {
      const response = mail.responses[i];
      if (response.filePath) {
        const oldResponsePath = path.join(uploadPath, response.filePath);
        if (fs.existsSync(oldResponsePath)) {
          const responseExt = path.extname(response.fileName);
          const responseNewName = `${archiveFileName}_reponse_${i + 1}${responseExt}`;
          const newResponseRelativePath = path.join(archiveRelativePath, responseNewName);
          const newResponseFullPath = path.join(uploadPath, newResponseRelativePath);
          
          fs.copyFileSync(oldResponsePath, newResponseFullPath);
          fs.unlinkSync(oldResponsePath);
          
          mail.responses[i].filePath = newResponseRelativePath;
          mail.responses[i].fileName = responseNewName;
        }
      }
    }

    // Archiver le courrier
    mail.status = MAIL_STATUS.ARCHIVED;
    mail.archivedDate = new Date();
    mail.archivedBy = req.user._id;
    mail.reference = archiveFileName; // Mettre à jour la référence
    await mail.save();

    // Synchroniser avec OneDrive si activé (en arrière-plan)
    const fullFilePath = path.join(uploadPath, mail.filePath);
    syncToOneDrive(mail, fullFilePath).catch(err => {
      console.error('Erreur sync OneDrive (non bloquante):', err.message);
    });

    // Notifier les autres destinataires de l'archivage
    const archivedByName = `${req.user.firstName} ${req.user.lastName}`;
    const mailInfo = {
      _id: mail._id,
      reference: archiveFileName,
      subject: mail.subject,
      senderName: mail.senderName
    };

    // Import dynamique pour éviter les dépendances circulaires
    const { sendMailArchivedNotification } = await import('../services/email.service.js');
    
    // Notifier le destinataire principal s'il existe et n'est pas celui qui a archivé
    if (mail.recipient && mail.recipient._id.toString() !== req.user._id.toString() && mail.recipient.email) {
      sendMailArchivedNotification(
        mail.recipient.email,
        `${mail.recipient.firstName} ${mail.recipient.lastName}`,
        mailInfo,
        archivedByName
      ).catch(err => console.error('Erreur notification recipient:', err));
    }

    // Notifier les destinataires en copie
    if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
      for (const cc of mail.recipientsCopy) {
        if (cc._id.toString() !== req.user._id.toString() && cc.email) {
          sendMailArchivedNotification(
            cc.email,
            `${cc.firstName} ${cc.lastName}`,
            mailInfo,
            archivedByName
          ).catch(err => console.error('Erreur notification CC:', err));
        }
      }
    }

    res.json({
      success: true,
      message: 'Courrier archivé',
      data: {
        reference: archiveFileName,
        archivePath: archiveRelativePath,
        fileName: mail.fileName
      }
    });
  } catch (error) {
    console.error('Erreur archivage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/mails/:id - Supprimer un courrier (Admin uniquement)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    // Supprimer le fichier principal
    const mainFilePath = path.join(uploadPath, mail.filePath);
    if (fs.existsSync(mainFilePath)) {
      fs.unlinkSync(mainFilePath);
    }

    // Supprimer les fichiers de réponse
    for (const response of mail.responses) {
      if (response.filePath) {
        const responsePath = path.join(uploadPath, response.filePath);
        if (fs.existsSync(responsePath)) {
          fs.unlinkSync(responsePath);
        }
      }
    }

    await Mail.findByIdAndDelete(req.params.id);

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
});

// POST /api/mails/export - Exporter les courriers en PDF
router.post('/export', authenticate, authorize(PERMISSIONS.EXPORT_MAILS), async (req, res) => {
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
});

// DELETE /api/mails/:id/response/:responseId - Supprimer une réponse (Admin uniquement)
router.delete('/:id/response/:responseId', authenticate, authorize(PERMISSIONS.DELETE_MAILS), async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const responseIndex = mail.responses.findIndex(
      r => r._id.toString() === req.params.responseId
    );

    if (responseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Réponse non trouvée'
      });
    }

    mail.responses.splice(responseIndex, 1);
    await mail.save();

    res.json({
      success: true,
      message: 'Réponse supprimée'
    });
  } catch (error) {
    console.error('Erreur suppression réponse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/mails/:id/reopen - Rouvrir un courrier (passer de traité/archivé à à traiter)
router.put('/:id/reopen', authenticate, authorize(PERMISSIONS.DELETE_MAILS), async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    if (mail.status === MAIL_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Ce courrier est déjà à traiter'
      });
    }

    // Réinitialiser le statut
    mail.status = MAIL_STATUS.PENDING;
    mail.processedDate = null;
    mail.processedBy = null;
    mail.archivedDate = null;
    mail.archivedBy = null;

    await mail.save();

    res.json({
      success: true,
      message: 'Courrier rouvert avec succès'
    });
  } catch (error) {
    console.error('Erreur réouverture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
