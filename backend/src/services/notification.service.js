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
