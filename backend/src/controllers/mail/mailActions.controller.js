import mongoose from 'mongoose';
import { Mail, User, Service, MAIL_STATUS, RESPONSE_TYPE, Delegation, AUDIT_CATEGORIES } from '../../models/index.js';
import { logAudit } from '../../services/audit.service.js';
import {
  notifyMailProcessed,
  notifyMailReassigned
} from '../../services/notification.service.js';
import { parseTags, canActOnMail, performArchive } from './mail.helpers.js';

// POST /api/mails/:id/read - Marquer comme lu
export async function markMailAsRead(req, res) {
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
}

// POST /api/mails/:id/process - Marquer un courrier comme traité
export async function processMail(req, res) {
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
      senderName: mail.senderName,
      filePath: mail.filePath,
      fileName: mail.fileName
    };

    // Import dynamique pour éviter les dépendances circulaires
    const { sendMailProcessedNotification } = await import('../../services/email.service.js');

    // Notifier le destinataire principal s'il existe et n'est pas celui qui a traité
    if (mail.recipient && mail.recipient._id.toString() !== req.user._id.toString() && mail.recipient.email) {
      sendMailProcessedNotification(
        mail.recipient.email,
        `${mail.recipient.firstName} ${mail.recipient.lastName}`,
        mailInfo,
        processedByName,
        { userId: mail.recipient._id }
      ).catch(err => console.error('Erreur notification recipient:', err));
      notifyMailProcessed(mail, mail.recipient, req.user);
    }

    // Notifier les destinataires en copie
    if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
      for (const cc of mail.recipientsCopy) {
        if (cc._id.toString() !== req.user._id.toString() && cc.email) {
          sendMailProcessedNotification(
            cc.email,
            `${cc.firstName} ${cc.lastName}`,
            mailInfo,
            processedByName,
            { userId: cc._id }
          ).catch(err => console.error('Erreur notification CC:', err));
          notifyMailProcessed(mail, cc, req.user);
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
}

// POST /api/mails/:id/response - Ajouter une réponse
export async function addMailResponse(req, res) {
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
}

// POST /api/mails/:id/archive - Archiver un courrier
export async function archiveMail(req, res) {
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

    // Vérifier les permissions (délégations actives précalculées)
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    const delegatorIds = delegators.map(d => d._id.toString());

    if (!canActOnMail(mail, req.user, delegatorIds)) {
      return res.status(403).json({
        success: false,
        message: 'Permission refusée'
      });
    }

    const result = await performArchive(mail, req.user);

    res.json({
      success: true,
      message: 'Courrier archivé',
      data: result
    });
  } catch (error) {
    console.error('Erreur archivage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// POST /api/mails/bulk - Actions groupées (archiver / réattribuer / taguer)
export async function bulkMailAction(req, res) {
  try {
    const { ids, action, recipientId, serviceId, tags, tagMode = 'add' } = req.body;

    const validIds = [...new Set(Array.isArray(ids) ? ids : [])]
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun courrier sélectionné'
      });
    }

    if (validIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 courriers par action groupée'
      });
    }

    if (!['archive', 'reassign', 'tag'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide'
      });
    }

    // Valider les paramètres propres à chaque action
    let newRecipient = null;
    let newService = null;
    if (action === 'reassign') {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({
          success: false,
          message: 'Destinataire invalide'
        });
      }
      newRecipient = await User.findOne({ _id: recipientId, isActive: true })
        .select('firstName lastName email');
      if (!newRecipient) {
        return res.status(400).json({
          success: false,
          message: 'Destinataire introuvable ou inactif'
        });
      }
      if (serviceId) {
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
          return res.status(400).json({
            success: false,
            message: 'Service invalide'
          });
        }
        newService = await Service.findById(serviceId);
        if (!newService) {
          return res.status(400).json({
            success: false,
            message: 'Service introuvable'
          });
        }
      }
    }

    let tagList = [];
    if (action === 'tag') {
      tagList = parseTags(tags);
      if (tagList.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun tag fourni'
        });
      }
      if (!['add', 'remove'].includes(tagMode)) {
        return res.status(400).json({
          success: false,
          message: 'Mode de tag invalide'
        });
      }
    }

    // Délégations actives précalculées (une seule requête pour tout le lot)
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    const delegatorIds = delegators.map(d => d._id.toString());

    const done = [];
    const skipped = [];

    for (const id of validIds) {
      try {
        const mail = await Mail.findById(id)
          .populate('service')
          .populate('recipient', 'firstName lastName email')
          .populate('recipientsCopy', 'firstName lastName email');

        if (!mail) {
          skipped.push({ id, reason: 'Courrier introuvable' });
          continue;
        }

        if (!canActOnMail(mail, req.user, delegatorIds)) {
          skipped.push({ id, reason: 'Permission refusée' });
          continue;
        }

        if (action === 'archive') {
          if (mail.status !== MAIL_STATUS.PROCESSED) {
            skipped.push({ id, reason: 'Seuls les courriers traités peuvent être archivés' });
            continue;
          }
          await performArchive(mail, req.user);
        } else if (action === 'reassign') {
          if (mail.status === MAIL_STATUS.ARCHIVED) {
            skipped.push({ id, reason: 'Courrier archivé' });
            continue;
          }
          const previousRecipientId = mail.recipient?._id?.toString();
          mail.recipient = newRecipient._id;
          if (newService) {
            mail.service = newService._id;
          }
          // Le nouveau destinataire doit voir le courrier comme non lu
          if (previousRecipientId !== newRecipient._id.toString()) {
            mail.isRead = false;
          }
          await mail.save();
          if (newRecipient._id.toString() !== req.user._id.toString()) {
            notifyMailReassigned(mail, newRecipient, req.user);
          }
        } else {
          // action === 'tag'
          if (tagMode === 'add') {
            mail.tags = [...new Set([...(mail.tags || []), ...tagList])];
          } else {
            mail.tags = (mail.tags || []).filter(t => !tagList.includes(t));
          }
          await mail.save();
        }

        done.push(id);
      } catch (err) {
        console.error(`Erreur action groupée [${action}] sur ${id}:`, err);
        skipped.push({ id, reason: 'Erreur serveur' });
      }
    }

    res.json({
      success: true,
      message: `${done.length} courrier(s) traité(s)${skipped.length ? `, ${skipped.length} ignoré(s)` : ''}`,
      data: { done, skipped }
    });
  } catch (error) {
    console.error('Erreur action groupée:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// DELETE /api/mails/:id - Mettre un courrier à la corbeille (Admin uniquement)
export async function trashMail(req, res) {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    await mail.softDelete(req.user._id, req.body?.reason || '');

    logAudit({
      req,
      action: 'mail.trashed',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`,
      metadata: { reason: req.body?.reason || '' }
    });

    res.json({
      success: true,
      message: 'Courrier déplacé vers la corbeille'
    });
  } catch (error) {
    console.error('Erreur suppression courrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// DELETE /api/mails/:id/response/:responseId - Supprimer une réponse (Admin uniquement)
export async function deleteMailResponse(req, res) {
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

    logAudit({
      req,
      action: 'mail.response_deleted',
      category: AUDIT_CATEGORIES.DELETION,
      entityType: 'Mail',
      entityId: mail._id,
      entityLabel: `${mail.reference} - ${mail.subject}`,
      metadata: { responseId: req.params.responseId }
    });

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
}

// PUT /api/mails/:id/reopen - Rouvrir un courrier (passer de traité/archivé à à traiter)
export async function reopenMail(req, res) {
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
}
