import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { Mail, OutgoingMail, Settings, AUDIT_CATEGORIES } from '../models/index.js';
import { logAudit } from './audit.service.js';

const getUploadPath = () => process.env.UPLOAD_PATH || './uploads';

const unlinkIfExists = (relativePath) => {
  if (!relativePath) return;
  const fullPath = path.join(getUploadPath(), relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// Lecture de la durée de rétention configurable (défaut 30 jours)
export const getTrashRetentionDays = async () => {
  const value = parseInt(await Settings.getValue('trash_retention_days', 30));
  return Number.isFinite(value) && value >= 0 ? value : 30;
};

// Purge définitive d'un courrier entrant en corbeille : fichier local (s'il existe encore) +
// document Mongo. Ne touche pas au stockage externe (S3/OneDrive/Nextcloud) déjà synchronisé.
export const purgeMail = async (mail, { req, isSystemAction = false } = {}) => {
  unlinkIfExists(mail.filePath);
  for (const response of mail.responses || []) {
    if (response.filePath) unlinkIfExists(response.filePath);
  }
  await Mail.findByIdAndDelete(mail._id);
  await logAudit({
    req,
    action: 'mail.purged',
    category: AUDIT_CATEGORIES.DELETION,
    entityType: 'Mail',
    entityId: mail._id,
    entityLabel: `${mail.reference} - ${mail.subject}`,
    isSystemAction
  });
};

// Purge définitive d'un courrier sortant en corbeille
export const purgeOutgoingMail = async (mail, { req, isSystemAction = false } = {}) => {
  unlinkIfExists(mail.filePath);
  await OutgoingMail.findByIdAndDelete(mail._id);
  await logAudit({
    req,
    action: 'outgoing.purged',
    category: AUDIT_CATEGORIES.DELETION,
    entityType: 'OutgoingMail',
    entityId: mail._id,
    entityLabel: `${mail.reference} - ${mail.subject}`,
    isSystemAction
  });
};

// Purge tout ce qui dépasse la durée de rétention (job planifié)
export const purgeExpiredTrash = async () => {
  const retentionDays = await getTrashRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const expiredMails = await Mail.find({ deletedAt: { $ne: null, $lte: cutoff } }).setOptions({ withDeleted: true });
  for (const mail of expiredMails) {
    await purgeMail(mail, { isSystemAction: true });
  }

  const expiredOutgoing = await OutgoingMail.find({ deletedAt: { $ne: null, $lte: cutoff } }).setOptions({ withDeleted: true });
  for (const mail of expiredOutgoing) {
    await purgeOutgoingMail(mail, { isSystemAction: true });
  }

  if (expiredMails.length > 0 || expiredOutgoing.length > 0) {
    console.log(`🗑️ Purge corbeille : ${expiredMails.length} courrier(s) entrant(s), ${expiredOutgoing.length} courrier(s) sortant(s)`);
  }

  return { mails: expiredMails.length, outgoing: expiredOutgoing.length };
};

let scheduledTask = null;

// Job quotidien de purge automatique de la corbeille (TRASH_PURGE_CRON, défaut 3h00 Europe/Paris)
export const initTrashPurgeScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const schedule = process.env.TRASH_PURGE_CRON || '0 3 * * *';

  if (!cron.validate(schedule)) {
    console.error(`❌ Expression cron TRASH_PURGE_CRON invalide: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, () => {
    purgeExpiredTrash().catch(e => console.error('Erreur purge corbeille:', e.message));
  }, { timezone: 'Europe/Paris' });

  console.log(`🗑️ Purge automatique de la corbeille activée (${schedule})`);
};
