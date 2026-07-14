import cron from 'node-cron';
import { Mail, Settings, MAIL_STATUS } from '../models/index.js';
import { sendMailReminderNotification, sendMailOverdueNotification } from './email.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

let scheduledTask = null;

// Récupérer le nombre de jours avant échéance pour le rappel (défaut : J-3)
export const getReminderDaysBefore = async () => {
  const value = parseInt(await Settings.getValue('mail_reminder_days_before', 3));
  return Number.isFinite(value) && value > 0 ? value : 3;
};

// Notifier le destinataire principal + les copies.
// Retourne false si au moins un envoi a échoué (SMTP indisponible…),
// pour que le courrier soit retenté au prochain passage du job.
const notifyRecipients = async (mail, sendFn, days) => {
  const recipients = [mail.recipient, ...(mail.recipientsCopy || [])].filter(u => u?.email);
  let allOk = true;
  for (const user of recipients) {
    try {
      const result = await sendFn(
        user.email,
        `${user.firstName} ${user.lastName}`,
        mail,
        days,
        { userId: user._id }
      );
      if (result?.success === false) allOk = false;
    } catch (err) {
      allOk = false;
      console.error(`Erreur envoi rappel échéance (${mail.reference}):`, err.message);
    }
  }
  return allOk;
};

/**
 * Vérifie les échéances des courriers à traiter :
 * - rappel unique quand l'échéance est à J-N (N configurable, défaut 3)
 * - alerte unique quand l'échéance est dépassée
 */
export const runDueDateCheck = async () => {
  const now = new Date();
  const reminderDays = await getReminderDaysBefore();
  const reminderLimit = new Date(now.getTime() + reminderDays * DAY_MS);

  const populateRecipients = [
    { path: 'recipient', select: 'firstName lastName email' },
    { path: 'recipientsCopy', select: 'firstName lastName email' }
  ];

  // 1. Rappels : échéance dans les N prochains jours, rappel jamais envoyé
  const upcomingMails = await Mail.find({
    status: MAIL_STATUS.PENDING,
    dueDate: { $gte: now, $lte: reminderLimit },
    reminderSentAt: null
  }).populate(populateRecipients);

  for (const mail of upcomingMails) {
    const daysRemaining = Math.max(1, Math.ceil((mail.dueDate - now) / DAY_MS));
    const sent = await notifyRecipients(mail, sendMailReminderNotification, daysRemaining);
    if (sent) {
      await Mail.updateOne({ _id: mail._id }, { $set: { reminderSentAt: now } });
    }
  }

  // 2. Alertes de retard : échéance dépassée, alerte jamais envoyée
  const overdueMails = await Mail.find({
    status: MAIL_STATUS.PENDING,
    dueDate: { $lt: now },
    overdueSentAt: null
  }).populate(populateRecipients);

  for (const mail of overdueMails) {
    const daysOverdue = Math.max(1, Math.ceil((now - mail.dueDate) / DAY_MS));
    const sent = await notifyRecipients(mail, sendMailOverdueNotification, daysOverdue);
    if (sent) {
      await Mail.updateOne({ _id: mail._id }, { $set: { overdueSentAt: now } });
    }
  }

  if (upcomingMails.length > 0 || overdueMails.length > 0) {
    console.log(`⏰ Échéances : ${upcomingMails.length} rappel(s), ${overdueMails.length} alerte(s) de retard envoyé(s)`);
  }

  return { reminders: upcomingMails.length, overdue: overdueMails.length };
};

/**
 * Initialise le job quotidien de vérification des échéances
 * (REMINDER_CRON pour changer l'horaire, défaut 8h00 Europe/Paris)
 */
export const initReminderScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const schedule = process.env.REMINDER_CRON || '0 8 * * *';

  if (!cron.validate(schedule)) {
    console.error(`❌ Expression cron REMINDER_CRON invalide: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, () => {
    runDueDateCheck().catch(e => console.error('Erreur job rappels échéances:', e.message));
  }, { timezone: 'Europe/Paris' });

  console.log(`⏰ Rappels d'échéance activés (${schedule})`);
};
