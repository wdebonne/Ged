import express from 'express';
import { body } from 'express-validator';
import { PERMISSIONS } from '../models/index.js';
import { authenticate, authorize, canImportMails, isAdmin } from '../middleware/auth.middleware.js';
import { uploadCourrier, uploadResponse, uploadPending, handleUploadError } from '../middleware/upload.middleware.js';
import { listMails, getMailById } from '../controllers/mail/mailList.controller.js';
import { listPendingMails, uploadPendingFiles, getPendingMailFile, deletePendingMail } from '../controllers/mail/mailPending.controller.js';
import { createMail, importPendingMail } from '../controllers/mail/mailImport.controller.js';
import {
  markMailAsRead,
  processMail,
  addMailResponse,
  archiveMail,
  bulkMailAction,
  trashMail,
  deleteMailResponse,
  reopenMail
} from '../controllers/mail/mailActions.controller.js';
import { addComment, deleteComment } from '../controllers/mail/mailComments.controller.js';
import {
  downloadMailPdf,
  downloadMailHistoryPdf,
  downloadMailZip,
  exportMailsReport
} from '../controllers/mail/mailExport.controller.js';

// Routes des courriers entrants. Les handlers sont dans src/controllers/mail/
// (list, pending, import, actions, comments, export) et les helpers de
// permissions/archivage partagés dans mail.helpers.js.
const router = express.Router();

// Liste des courriers
router.get('/', authenticate, listMails);

// Courriers en attente d'import
router.get('/pending', authenticate, canImportMails, listPendingMails);

// Créer un courrier directement avec upload de fichier
router.post('/', authenticate, canImportMails, uploadCourrier.single('document'), handleUploadError, createMail);

// Uploader des courriers en attente
router.post('/pending/upload', authenticate, canImportMails, uploadPending.array('files', 20), handleUploadError, uploadPendingFiles);

// Fichier PDF d'un courrier en attente
router.get('/pending/:id/file', authenticate, canImportMails, getPendingMailFile);

// Supprimer un courrier en attente
router.delete('/pending/:id', authenticate, canImportMails, deletePendingMail);

// Importer un courrier en attente
router.post('/import', authenticate, canImportMails, [
  body('pendingMailId').notEmpty().withMessage('ID du courrier requis'),
  body('subject').trim().notEmpty().withMessage('Objet requis'),
  body('senderId').notEmpty().withMessage('Expéditeur requis'),
  body('serviceId').notEmpty().withMessage('Service requis'),
  body('recipientId').notEmpty().withMessage('Destinataire requis')
], importPendingMail);

// Exports PDF / ZIP d'un courrier
router.get('/:id/pdf', authenticate, downloadMailPdf);
router.get('/:id/pdf/history', authenticate, downloadMailHistoryPdf);
router.get('/:id/pdf/all', authenticate, downloadMailZip);

// Détails d'un courrier
router.get('/:id', authenticate, getMailById);

// Cycle de vie du courrier
router.post('/:id/read', authenticate, markMailAsRead);
router.post('/:id/process', authenticate, processMail);
router.post('/:id/response', authenticate, authorize(PERMISSIONS.PROCESS_MAILS), uploadResponse.single('file'), handleUploadError, addMailResponse);
router.post('/:id/archive', authenticate, archiveMail);

// Actions groupées (archiver / réattribuer / taguer)
router.post('/bulk', authenticate, bulkMailAction);

// Commentaires internes
router.post('/:id/comments', authenticate, addComment);
router.delete('/:id/comments/:commentId', authenticate, deleteComment);

// Mettre un courrier à la corbeille (Admin uniquement)
router.delete('/:id', authenticate, isAdmin, trashMail);

// Exporter les courriers en PDF (registre)
router.post('/export', authenticate, authorize(PERMISSIONS.EXPORT_MAILS), exportMailsReport);

// Supprimer une réponse (Admin uniquement)
router.delete('/:id/response/:responseId', authenticate, authorize(PERMISSIONS.DELETE_MAILS), deleteMailResponse);

// Rouvrir un courrier (passer de traité/archivé à à traiter)
router.put('/:id/reopen', authenticate, authorize(PERMISSIONS.DELETE_MAILS), reopenMail);

export default router;
