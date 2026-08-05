import Notification, { NOTIFICATION_TYPES } from '../models/Notification.model.js';

async function createNotification({ recipient, type, title, message, link, relatedMail, actor }) {
  try {
    await Notification.create({ recipient, type, title, message, link, relatedMail, actor });
  } catch (err) {
    console.error(`Erreur création notification in-app [${type}]:`, err.message);
  }
}

export const notifyNewMailToRecipient = (mail) => createNotification({
  recipient: mail.recipient._id || mail.recipient,
  type: NOTIFICATION_TYPES.NEW_MAIL_RECIPIENT,
  title: 'Nouveau courrier à traiter',
  message: `${mail.senderName || 'Expéditeur inconnu'} — ${mail.subject}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id
});

export const notifyNewMailToCopyRecipient = (mail, ccUser) => createNotification({
  recipient: ccUser._id,
  type: NOTIFICATION_TYPES.NEW_MAIL_COPY,
  title: 'Courrier en copie',
  message: `${mail.senderName || 'Expéditeur inconnu'} — ${mail.subject}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id
});

export const notifyNewMailToServiceSupervisor = (mail, supervisor, serviceName) => createNotification({
  recipient: supervisor._id,
  type: NOTIFICATION_TYPES.NEW_MAIL_SERVICE,
  title: `Nouveau courrier — ${serviceName}`,
  message: `${mail.senderName || 'Expéditeur inconnu'} — ${mail.subject}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id
});

export const notifyMailProcessed = (mail, recipientUser, processedByUser) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_PROCESSED,
  title: 'Courrier traité',
  message: `${mail.subject} — traité par ${processedByUser.firstName} ${processedByUser.lastName}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id,
  actor: processedByUser._id
});

export const notifyMailArchived = (mail, recipientUser, archivedByUser) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_ARCHIVED,
  title: 'Courrier archivé',
  message: `${mail.subject} — archivé par ${archivedByUser.firstName} ${archivedByUser.lastName}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id,
  actor: archivedByUser._id
});

export const notifyMailReminder = (mail, recipientUser, daysRemaining) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_REMINDER,
  title: 'Échéance à venir',
  message: `${mail.subject} — échéance dans ${daysRemaining} jour(s)`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id
});

export const notifyMailOverdue = (mail, recipientUser, daysOverdue) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_OVERDUE,
  title: 'Courrier en retard',
  message: `${mail.subject} — en retard de ${daysOverdue} jour(s)`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id
});

export const notifyMailReassigned = (mail, recipientUser, reassignedByUser) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_REASSIGNED,
  title: 'Courrier attribué',
  message: `${mail.subject} — attribué par ${reassignedByUser.firstName} ${reassignedByUser.lastName}`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id,
  actor: reassignedByUser._id
});

export const notifyNewComment = (mail, recipientUser, authorUser) => createNotification({
  recipient: recipientUser._id,
  type: NOTIFICATION_TYPES.MAIL_COMMENT,
  title: 'Nouveau commentaire',
  message: `${authorUser.firstName} ${authorUser.lastName} a commenté « ${mail.subject} »`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id,
  actor: authorUser._id
});

// ---- Conformité RGPD : durées de conservation ----

// Échéance de conservation à venir (rappel J-N configurable par catégorie)
export const notifyRetentionUpcoming = (user, { count, days }) => createNotification({
  recipient: user._id || user,
  type: NOTIFICATION_TYPES.RGPD_RETENTION_UPCOMING,
  title: 'RGPD — échéance de conservation proche',
  message: `${count} document(s) atteindront leur durée légale de conservation dans ${days} jour(s)`,
  link: '/admin/rgpd'
});

// Durée légale dépassée : ces documents doivent être supprimés
export const notifyRetentionExpired = (user, { count }) => createNotification({
  recipient: user._id || user,
  type: NOTIFICATION_TYPES.RGPD_RETENTION_EXPIRED,
  title: 'RGPD — documents à supprimer',
  message: `${count} document(s) ont dépassé leur durée légale de conservation et doivent être supprimés`,
  link: '/admin/rgpd'
});

// Suppression automatique effectuée (mise en corbeille)
export const notifyRetentionDeleted = (user, { count }) => createNotification({
  recipient: user._id || user,
  type: NOTIFICATION_TYPES.RGPD_DOCUMENTS_DELETED,
  title: 'RGPD — documents supprimés automatiquement',
  message: `${count} document(s) ont été mis en corbeille : durée légale de conservation dépassée`,
  link: '/admin/rgpd'
});

// Changement de durée sur une catégorie, avec l'impact rétroactif
export const notifyRetentionChanged = (user, { categoryName, previousLabel, newLabel, newlyExpiredCount }) => createNotification({
  recipient: user._id || user,
  type: NOTIFICATION_TYPES.RGPD_RETENTION_CHANGED,
  title: `RGPD — durée modifiée : ${categoryName}`,
  message: newlyExpiredCount > 0
    ? `${previousLabel} → ${newLabel} : ${newlyExpiredCount} document(s) dépassent désormais la durée légale et doivent être supprimés`
    : `${previousLabel} → ${newLabel} : aucun document existant n'est immédiatement concerné`,
  link: '/admin/rgpd'
});

export const notifyCommentMention = (mail, mentionedUser, authorUser) => createNotification({
  recipient: mentionedUser._id,
  type: NOTIFICATION_TYPES.COMMENT_MENTION,
  title: 'Vous avez été mentionné',
  message: `${authorUser.firstName} ${authorUser.lastName} vous a mentionné sur « ${mail.subject} »`,
  link: `/courriers/${mail._id}`,
  relatedMail: mail._id,
  actor: authorUser._id
});
