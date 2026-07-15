import fs from 'fs';
import path from 'path';
import { Mail, Settings, MAIL_STATUS, PERMISSIONS, Delegation } from '../../models/index.js';
import { syncArchivedMail as syncToOneDrive } from '../../services/onedrive.service.js';
import { notifyMailArchived } from '../../services/notification.service.js';

export function isServiceSupervisor(user) {
  if (!user?.services?.length) return false;
  const userId = user._id.toString();
  return user.services.some(service => {
    const ids = (service.supervisors || []).map(s => s?._id?.toString() || s?.toString());
    return ids.includes(userId);
  });
}

export function getSupervisedServiceIds(user) {
  if (!user?.services?.length) return [];
  const userId = user._id.toString();
  return user.services
    .filter(service => {
      const ids = (service.supervisors || []).map(s => s?._id?.toString() || s?.toString());
      return ids.includes(userId);
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

// Parser les tags reçus (tableau JSON ou chaîne "a, b, c")
export function parseTags(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(',');
  return [...new Set(list.map(t => String(t).trim()).filter(Boolean))];
}

// Résoudre la date d'échéance : valeur saisie, sinon délai réglementaire
// par défaut configurable (mail_due_default_days, 0 = désactivé)
export async function resolveDueDate(dueDate, receivedDate) {
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }
  const defaultDays = parseInt(await Settings.getValue('mail_due_default_days', 15));
  if (!Number.isFinite(defaultDays) || defaultDays <= 0) return undefined;
  const base = receivedDate ? new Date(receivedDate) : new Date();
  base.setDate(base.getDate() + defaultDays);
  base.setHours(23, 59, 59, 999);
  return base;
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

// Vérifie si l'utilisateur peut consulter un courrier (même logique que GET /:id)
export async function canViewMail(mail, user) {
  const userPermissions = user.group?.permissions || [];
  const userServiceIds = (user.services || []).map(s => s._id?.toString() || s.toString());
  const recipientId = mail.recipient?._id?.toString() || mail.recipient?.toString();
  const isRecipient = recipientId && recipientId === user._id.toString();
  const isCopyRecipient = (mail.recipientsCopy || []).some(r => (r?._id?.toString() || r?.toString()) === user._id.toString());
  const mailServiceId = mail.service?._id?.toString() || mail.service?.toString();
  const isInUserService = mailServiceId && userServiceIds.includes(mailServiceId);
  const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(user);

  // Vérifier si l'utilisateur a une délégation active pour le destinataire de ce courrier
  let hasDelegation = false;
  if (mail.recipient) {
    const delegators = await Delegation.getDelegatorsForUser(user._id);
    const delegatorIds = delegators.map(d => d._id.toString());
    hasDelegation = delegatorIds.includes(recipientId);
    if (!hasDelegation && mail.recipientsCopy?.length > 0) {
      hasDelegation = mail.recipientsCopy.some(r => delegatorIds.includes(r?._id?.toString() || r?.toString()));
    }
  }

  return userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS) ||
         (canViewServiceMails && isInUserService) ||
         isRecipient ||
         isCopyRecipient ||
         hasDelegation;
}

// Vérifie si l'utilisateur peut agir sur un courrier (archiver, réattribuer, taguer)
// delegatorIds : ids des utilisateurs ayant une délégation active vers `user` (précalculés)
export function canActOnMail(mail, user, delegatorIds = []) {
  const userPermissions = user.group?.permissions || [];
  const hasArchivePermission = userPermissions.includes(PERMISSIONS.ARCHIVE_MAILS);
  const hasProcessPermission = userPermissions.includes(PERMISSIONS.PROCESS_MAILS);
  const hasViewAllPermission = userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS);

  const userServiceIds = (user.services || []).map(s => s._id?.toString() || s.toString());
  const mailServiceId = mail.service?._id?.toString() || mail.service?.toString();
  const isInMailService = mailServiceId && userServiceIds.includes(mailServiceId);
  const recipientId = mail.recipient?._id?.toString() || mail.recipient?.toString();
  const isRecipient = recipientId && recipientId === user._id.toString();
  const isInCopy = (mail.recipientsCopy || []).some(r => (r?._id?.toString() || r?.toString()) === user._id.toString());
  const hasDelegation = recipientId && delegatorIds.includes(recipientId);
  const isSupervisor = mailServiceId && (user.services || []).some(s => {
    const ids = (s.supervisors || []).map(sup => sup?._id?.toString() || sup?.toString());
    return s._id?.toString() === mailServiceId && ids.includes(user._id.toString());
  });

  return hasArchivePermission || (
    hasProcessPermission && (
      hasViewAllPermission ||
      isInMailService ||
      isRecipient ||
      isInCopy ||
      hasDelegation ||
      isSupervisor
    )
  );
}

// Archive un courrier : renommage/déplacement des fichiers, statut, notifications.
// `mail` doit être populate('service') et populate('recipient'/'recipientsCopy').
export async function performArchive(mail, user) {
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
  mail.archivedBy = user._id;
  mail.reference = archiveFileName; // Mettre à jour la référence
  await mail.save();

  // Synchroniser avec OneDrive si activé (en arrière-plan)
  const fullFilePath = path.join(uploadPath, mail.filePath);
  syncToOneDrive(mail, fullFilePath).catch(err => {
    console.error('Erreur sync OneDrive (non bloquante):', err.message);
  });

  // Notifier les autres destinataires de l'archivage
  const archivedByName = `${user.firstName} ${user.lastName}`;
  const mailInfo = {
    _id: mail._id,
    reference: archiveFileName,
    subject: mail.subject,
    senderName: mail.senderName,
    filePath: mail.filePath,
    fileName: mail.fileName
  };

  // Import dynamique pour éviter les dépendances circulaires
  const { sendMailArchivedNotification } = await import('../../services/email.service.js');

  // Notifier le destinataire principal s'il existe et n'est pas celui qui a archivé
  if (mail.recipient && mail.recipient._id.toString() !== user._id.toString() && mail.recipient.email) {
    sendMailArchivedNotification(
      mail.recipient.email,
      `${mail.recipient.firstName} ${mail.recipient.lastName}`,
      mailInfo,
      archivedByName,
      { userId: mail.recipient._id }
    ).catch(err => console.error('Erreur notification recipient:', err));
    notifyMailArchived(mail, mail.recipient, user);
  }

  // Notifier les destinataires en copie
  if (mail.recipientsCopy && mail.recipientsCopy.length > 0) {
    for (const cc of mail.recipientsCopy) {
      if (cc._id.toString() !== user._id.toString() && cc.email) {
        sendMailArchivedNotification(
          cc.email,
          `${cc.firstName} ${cc.lastName}`,
          mailInfo,
          archivedByName,
          { userId: cc._id }
        ).catch(err => console.error('Erreur notification CC:', err));
        notifyMailArchived(mail, cc, user);
      }
    }
  }

  return {
    reference: archiveFileName,
    archivePath: archiveRelativePath,
    fileName: mail.fileName
  };
}
