import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import EmailTemplate, { EMAIL_ACTIONS } from '../models/EmailTemplate.model.js';
import Settings from '../models/Settings.model.js';
import User from '../models/User.model.js';

// Créer le transporteur email
const createTransporter = async () => {
  // Essayer de charger la config depuis la BDD d'abord
  try {
    const smtpSettings = await Settings.find({ category: 'smtp' });
    const config = {};
    smtpSettings.forEach(s => {
      config[s.key] = s.value;
    });
    
    if (config.smtp_host && config.smtp_user) {
      return nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port) || 587,
        secure: config.smtp_secure === 'true',
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  } catch (e) {
    console.log('Config SMTP BDD non disponible, utilisation des variables d\'environnement');
  }
  
  // Fallback sur les variables d'environnement
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Récupérer l'adresse d'expédition
const getFromAddress = async () => {
  try {
    const fromSetting = await Settings.findOne({ key: 'smtp_from' });
    if (fromSetting?.value) {
      const fromNameSetting = await Settings.findOne({ key: 'smtp_from_name' });
      const fromName = fromNameSetting?.value || 'GED Courrier';
      return `${fromName} <${fromSetting.value}>`;
    }
  } catch (e) {}
  return process.env.SMTP_FROM || 'GED Courrier <no-reply@example.com>';
};

// Récupérer l'URL de l'application
const getAppUrl = async () => {
  try {
    const urlSetting = await Settings.findOne({ key: 'app_url' });
    if (urlSetting?.value) return urlSetting.value;
  } catch (e) {}
  return process.env.APP_URL || 'http://localhost:5173';
};

// Récupérer le nom de l'application
const getAppName = async () => {
  try {
    const nameSetting = await Settings.findOne({ key: 'app_name' });
    if (nameSetting?.value) return nameSetting.value;
  } catch (e) {}
  return 'GED Courrier';
};

// Remplacer les variables dans un texte
const replaceVariables = (text, variables) => {
  if (!text) return '';
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

// Vérifier si un utilisateur doit recevoir une notification
// prefKey : la clé de préférence (ex: 'email_newMail_recipient')
// userId : l'ID de l'utilisateur à notifier (optionnel, si null on vérifie que le default global)
const shouldNotifyUser = async (userId, prefKey) => {
  // Charger les defaults globaux
  const defaultsSetting = await Settings.findOne({ key: 'notification_defaults' });
  const defaults = defaultsSetting?.value || {
    email_newMail_recipient: true,
    email_newMail_copy: true,
    email_newMail_service: false,
    email_processed: true,
    email_archived: true,
    email_reminder: true,
    email_overdue: true
  };

  const globalDefault = defaults[prefKey] !== undefined ? defaults[prefKey] : true;

  if (!userId) return globalDefault;

  try {
    const user = await User.findById(userId).select('notificationPreferences').lean();
    if (!user?.notificationPreferences?.useCustom) return globalDefault;

    const userPref = user.notificationPreferences[prefKey];
    return userPref !== null && userPref !== undefined ? userPref : globalDefault;
  } catch {
    return globalDefault;
  }
};

// Template HTML par défaut (fallback)
const getDefaultTemplate = (headerColor, headerIcon, headerTitle, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .button { display: inline-block; background: ${headerColor}; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerIcon} ${headerTitle}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© ${new Date().getFullYear()} GED Courrier</p>
    </div>
  </div>
</body>
</html>
`;

// Fonction générique pour envoyer un email avec template
export const sendTemplatedEmail = async (action, recipientEmail, variables, options = {}) => {
  try {
    const transporter = await createTransporter();
    const fromAddress = await getFromAddress();
    const appUrl = await getAppUrl();
    const appName = await getAppName();

    // Enrichir les variables avec les infos communes
    const enrichedVars = {
      ...variables,
      appName,
      appUrl,
      currentDate: new Date().toLocaleDateString('fr-FR'),
      currentYear: new Date().getFullYear().toString()
    };

    // Chercher le template actif pour cette action
    const template = await EmailTemplate.getActiveByAction(action);

    let subject, htmlContent;
    let shouldAttachPdf = false;

    if (template) {
      subject = replaceVariables(template.subject, enrichedVars);
      htmlContent = replaceVariables(template.htmlContent, enrichedVars);
      shouldAttachPdf = template.attachPdf === true;
    } else {
      const defaults = getDefaultTemplates(enrichedVars);
      if (defaults[action]) {
        subject = defaults[action].subject;
        htmlContent = defaults[action].html;
      } else {
        console.error(`Aucun template trouvé pour l'action: ${action}`);
        return { success: false, error: 'Template non trouvé' };
      }
    }

    const mailOptions = {
      from: fromAddress,
      to: recipientEmail,
      subject,
      html: htmlContent
    };

    // Joindre le PDF si le template le demande et qu'un fichier est fourni
    if (shouldAttachPdf && options.pdfFilePath) {
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      const fullPath = path.resolve(uploadPath, options.pdfFilePath);
      if (fs.existsSync(fullPath)) {
        mailOptions.attachments = [{
          filename: options.pdfFileName || path.basename(fullPath),
          path: fullPath,
          contentType: 'application/pdf'
        }];
      }
    }

    await transporter.sendMail(mailOptions);
    console.log(`Email [${action}] envoyé à ${recipientEmail}${mailOptions.attachments ? ' (avec PJ)' : ''}`);
    return { success: true };
  } catch (error) {
    console.error(`Erreur envoi email [${action}]:`, error);
    return { success: false, error: error.message };
  }
};

// Templates par défaut (fallback si aucun template en BDD)
const getDefaultTemplates = (vars) => ({
  [EMAIL_ACTIONS.PASSWORD_RESET]: {
    subject: `Réinitialisation de votre mot de passe - ${vars.appName}`,
    html: getDefaultTemplate('#667eea', '🔐', 'Réinitialisation mot de passe', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
      <p style="text-align: center;">
        <a href="${vars.resetLink}" class="button">Réinitialiser mon mot de passe</a>
      </p>
      <p>Ce lien est valide pendant <strong>${vars.expirationTime || '1 heure'}</strong>.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
    `)
  },
  [EMAIL_ACTIONS.WELCOME]: {
    subject: `Bienvenue sur ${vars.appName}`,
    html: getDefaultTemplate('#22c55e', '👋', 'Bienvenue', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Votre compte a été créé sur <strong>${vars.appName}</strong>.</p>
      <div class="info">
        <p><strong>Email :</strong> ${vars.userEmail}</p>
        ${vars.temporaryPassword ? `<p><strong>Mot de passe temporaire :</strong> ${vars.temporaryPassword}</p>` : ''}
      </div>
      <p style="text-align: center;">
        <a href="${vars.loginUrl || vars.appUrl}" class="button">Se connecter</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.MAIL_TO_PROCESS]: {
    subject: `Nouveau courrier à traiter - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#22c55e', '📬', 'Nouveau courrier', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Vous avez reçu un nouveau courrier à traiter :</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Expéditeur :</strong> ${vars.senderName}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date de réception :</strong> ${vars.mailDate}</p>
        ${vars.mailPriority ? `<p><strong>Priorité :</strong> ${vars.mailPriority}</p>` : ''}
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Voir le courrier</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.MAIL_ASSIGNED]: {
    subject: `Courrier assigné - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#3b82f6', '📋', 'Courrier assigné', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un courrier vous a été assigné par <strong>${vars.assignedBy}</strong> :</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Expéditeur :</strong> ${vars.senderName}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Voir le courrier</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.MAIL_REMINDER]: {
    subject: `Rappel : Courrier à traiter - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#f59e0b', '⏰', 'Rappel', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un courrier est en attente de traitement et arrive à échéance dans <strong>${vars.daysRemaining} jour(s)</strong>.</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date d'échéance :</strong> ${vars.dueDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Traiter le courrier</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.MAIL_OVERDUE]: {
    subject: `URGENT : Courrier en retard - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#ef4444', '🚨', 'Courrier en retard', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un courrier est <strong>en retard de ${vars.daysOverdue} jour(s)</strong> :</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date d'échéance :</strong> ${vars.dueDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Traiter maintenant</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.SUPERVISOR_NEW_MAIL]: {
    subject: `Nouveau courrier pour ${vars.serviceName} - ${vars.mailSubject}`,
    html: getDefaultTemplate('#f59e0b', '📬', `Nouveau courrier - ${vars.serviceName}`, `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un nouveau courrier est arrivé pour le service <strong>${vars.serviceName}</strong> dont vous êtes superviseur.</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Expéditeur :</strong> ${vars.senderName}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date de réception :</strong> ${vars.mailDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Voir le courrier</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.CORECIPIENT_PROCESSED]: {
    subject: `Courrier traité - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#3b82f6', '✅', 'Courrier traité', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un courrier dont vous êtes destinataire a été <strong>traité</strong> par ${vars.processedBy}.</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Expéditeur :</strong> ${vars.senderName}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date de traitement :</strong> ${vars.processedDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Voir le courrier</a>
      </p>
    `)
  },
  [EMAIL_ACTIONS.CORECIPIENT_ARCHIVED]: {
    subject: `Courrier archivé - ${vars.mailReference || vars.mailSubject}`,
    html: getDefaultTemplate('#6b7280', '📦', 'Courrier archivé', `
      <h2>Bonjour ${vars.userFirstName || vars.userName},</h2>
      <p>Un courrier dont vous êtes destinataire a été <strong>archivé</strong> par ${vars.archivedBy}.</p>
      <div class="info">
        <p><strong>Référence :</strong> ${vars.mailReference || 'Non définie'}</p>
        <p><strong>Expéditeur :</strong> ${vars.senderName}</p>
        <p><strong>Objet :</strong> ${vars.mailSubject}</p>
        <p><strong>Date d'archivage :</strong> ${vars.archivedDate}</p>
      </div>
      <p style="text-align: center;">
        <a href="${vars.mailUrl}" class="button">Voir le courrier</a>
      </p>
    `)
  }
});

// ========== FONCTIONS D'ENVOI SPÉCIFIQUES ==========

// Envoyer un email de réinitialisation de mot de passe
export const sendPasswordResetEmail = async (email, firstName, resetUrl) => {
  return sendTemplatedEmail(EMAIL_ACTIONS.PASSWORD_RESET, email, {
    userName: firstName,
    userFirstName: firstName,
    userEmail: email,
    resetLink: resetUrl,
    expirationTime: '1 heure'
  });
};

// Envoyer une notification de nouveau courrier (destinataire principal)
export const sendNewMailNotification = async (recipientEmail, recipientName, mailInfo, { userId, notifType = 'email_newMail_recipient' } = {}) => {
  if (userId) {
    const allowed = await shouldNotifyUser(userId, notifType);
    if (!allowed) return { success: true, skipped: true };
  }
  const appUrl = await getAppUrl();
  return sendTemplatedEmail(EMAIL_ACTIONS.MAIL_TO_PROCESS, recipientEmail, {
    userName: recipientName,
    userFirstName: recipientName.split(' ')[0],
    mailReference: mailInfo.reference,
    mailSubject: mailInfo.subject,
    senderName: mailInfo.senderName,
    mailDate: new Date(mailInfo.receivedDate).toLocaleDateString('fr-FR'),
    mailPriority: mailInfo.priority,
    mailUrl: `${appUrl}/courriers/${mailInfo._id}`
  }, {
    pdfFilePath: mailInfo.filePath,
    pdfFileName: mailInfo.fileName
  });
};

// Notifier le superviseur qu'un nouveau courrier est arrivé pour son service
export const sendServiceMailNotification = async (supervisorEmail, supervisorName, mailInfo, serviceName, { userId } = {}) => {
  if (userId) {
    const allowed = await shouldNotifyUser(userId, 'email_newMail_service');
    if (!allowed) return { success: true, skipped: true };
  }
  const appUrl = await getAppUrl();
  return sendTemplatedEmail(EMAIL_ACTIONS.SUPERVISOR_NEW_MAIL, supervisorEmail, {
    userName: supervisorName,
    userFirstName: supervisorName.split(' ')[0],
    serviceName,
    mailReference: mailInfo.reference,
    mailSubject: mailInfo.subject,
    senderName: mailInfo.senderName,
    mailDate: new Date(mailInfo.receivedDate).toLocaleDateString('fr-FR'),
    mailPriority: mailInfo.priority,
    mailUrl: `${appUrl}/courriers/${mailInfo._id}`
  }, {
    pdfFilePath: mailInfo.filePath,
    pdfFileName: mailInfo.fileName
  });
};

// Notifier les co-destinataires qu'un courrier a été traité
export const sendMailProcessedNotification = async (recipientEmail, recipientName, mailInfo, processedByName, { userId } = {}) => {
  if (userId) {
    const allowed = await shouldNotifyUser(userId, 'email_processed');
    if (!allowed) return { success: true, skipped: true };
  }
  const appUrl = await getAppUrl();
  return sendTemplatedEmail(EMAIL_ACTIONS.CORECIPIENT_PROCESSED, recipientEmail, {
    userName: recipientName,
    userFirstName: recipientName.split(' ')[0],
    mailReference: mailInfo.reference,
    mailSubject: mailInfo.subject,
    senderName: mailInfo.senderName,
    processedBy: processedByName,
    processedDate: new Date().toLocaleDateString('fr-FR'),
    mailUrl: `${appUrl}/courriers/${mailInfo._id}`
  }, {
    pdfFilePath: mailInfo.filePath,
    pdfFileName: mailInfo.fileName
  });
};

// Notifier les co-destinataires qu'un courrier a été archivé
export const sendMailArchivedNotification = async (recipientEmail, recipientName, mailInfo, archivedByName, { userId } = {}) => {
  if (userId) {
    const allowed = await shouldNotifyUser(userId, 'email_archived');
    if (!allowed) return { success: true, skipped: true };
  }
  const appUrl = await getAppUrl();
  return sendTemplatedEmail(EMAIL_ACTIONS.CORECIPIENT_ARCHIVED, recipientEmail, {
    userName: recipientName,
    userFirstName: recipientName.split(' ')[0],
    mailReference: mailInfo.reference,
    mailSubject: mailInfo.subject,
    senderName: mailInfo.senderName,
    archivedBy: archivedByName,
    archivedDate: new Date().toLocaleDateString('fr-FR'),
    mailUrl: `${appUrl}/courriers/${mailInfo._id}`
  }, {
    pdfFilePath: mailInfo.filePath,
    pdfFileName: mailInfo.fileName
  });
};

// Tester la configuration SMTP
export const testSmtpConnection = async () => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return { success: true, message: 'Connexion SMTP réussie' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export { shouldNotifyUser };

export default {
  sendTemplatedEmail,
  sendPasswordResetEmail,
  sendNewMailNotification,
  sendMailProcessedNotification,
  sendMailArchivedNotification,
  sendServiceMailNotification,
  shouldNotifyUser,
  testSmtpConnection
};
