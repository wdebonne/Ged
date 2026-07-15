import mongoose from 'mongoose';
import { Mail, User } from '../../models/index.js';
import {
  notifyNewComment,
  notifyCommentMention
} from '../../services/notification.service.js';
import { canViewMail } from './mail.helpers.js';

// POST /api/mails/:id/comments - Ajouter un commentaire interne
export async function addComment(req, res) {
  try {
    const content = (req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Le commentaire ne peut pas être vide'
      });
    }
    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Commentaire trop long (2000 caractères maximum)'
      });
    }

    const mail = await Mail.findById(req.params.id)
      .populate('recipient', 'firstName lastName email')
      .populate('recipientsCopy', 'firstName lastName email')
      .populate('service', 'name supervisors');

    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    if (!(await canViewMail(mail, req.user))) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    // Résoudre les mentions (utilisateurs actifs uniquement)
    const mentionIds = [...new Set((Array.isArray(req.body.mentions) ? req.body.mentions : [])
      .filter(m => mongoose.Types.ObjectId.isValid(m)))];
    const mentionedUsers = mentionIds.length > 0
      ? await User.find({ _id: { $in: mentionIds }, isActive: true }).select('firstName lastName email')
      : [];

    mail.comments.push({
      author: req.user._id,
      content,
      mentions: mentionedUsers.map(u => u._id)
    });
    await mail.save();

    // Notifications : utilisateurs mentionnés, puis destinataire principal (sans doublon ni auto-notification)
    const notified = new Set([req.user._id.toString()]);
    for (const mentioned of mentionedUsers) {
      if (!notified.has(mentioned._id.toString())) {
        notifyCommentMention(mail, mentioned, req.user);
        notified.add(mentioned._id.toString());
      }
    }
    if (mail.recipient && !notified.has(mail.recipient._id.toString())) {
      notifyNewComment(mail, mail.recipient, req.user);
    }

    const updatedMail = await Mail.findById(mail._id)
      .populate('comments.author', 'firstName lastName avatar')
      .populate('comments.mentions', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Commentaire ajouté',
      data: updatedMail.comments[updatedMail.comments.length - 1]
    });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// DELETE /api/mails/:id/comments/:commentId - Supprimer un commentaire (auteur ou admin)
export async function deleteComment(req, res) {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    const comment = mail.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé'
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdminUser = req.user.group?.name === 'Administrateur';
    if (!isAuthor && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Permission refusée'
      });
    }

    comment.deleteOne();
    await mail.save();

    res.json({
      success: true,
      message: 'Commentaire supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}
