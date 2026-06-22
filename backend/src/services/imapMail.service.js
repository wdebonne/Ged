import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PendingMail, Settings } from '../models/index.js';
import { extractTextFromPDF } from './ocr.service.js';
import { generateEmailPDF } from './pdf.service.js';

let imapMailClient = null;
let imapMailInterval = null;
let imapMailStatus = {
  running: false,
  lastCheck: null,
  lastError: null,
  messagesProcessed: 0,
  lastFiltered: 0
};

let imapMailSettings = null;

const getImapMailSettings = async () => {
  try {
    const settings = await Settings.find({ key: { $regex: /^imap_mail_/ } });
    const config = {};
    settings.forEach(s => {
      const key = s.key.replace('imap_mail_', '');
      let value = s.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      config[key] = value;
    });
    return config;
  } catch (error) {
    console.error('Erreur récupération paramètres IMAP Mail:', error);
    return null;
  }
};

const getImapMailConfig = async () => {
  const settings = await getImapMailSettings();
  if (!settings) return null;
  imapMailSettings = settings;
  return {
    user: settings.user,
    password: settings.password,
    host: settings.host,
    port: parseInt(settings.port) || 993,
    tls: settings.tls ?? true,
    tlsOptions: { rejectUnauthorized: false }
  };
};

const emailMatchesFilters = (emailData, settings) => {
  if (settings.autoImport === true || settings.autoImport === 'true') {
    return { matches: true, reason: 'Import automatique activé' };
  }
  const fromEmail = emailData.from?.text?.toLowerCase() || '';
  const subject = emailData.subject?.toLowerCase() || '';
  const body = (emailData.text || emailData.html || '').toLowerCase();

  if (settings.filterDomains) {
    const domains = settings.filterDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
    for (const domain of domains) {
      if (fromEmail.includes(domain)) return { matches: true, reason: `Domaine: ${domain}` };
    }
  }
  if (settings.filterEmails) {
    const emails = settings.filterEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    for (const email of emails) {
      if (fromEmail.includes(email)) return { matches: true, reason: `Email: ${email}` };
    }
  }
  if (settings.filterSubjectKeywords) {
    const keywords = settings.filterSubjectKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    for (const keyword of keywords) {
      if (subject.includes(keyword)) return { matches: true, reason: `Sujet: ${keyword}` };
    }
  }
  if (settings.filterBodyKeywords) {
    const keywords = settings.filterBodyKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    for (const keyword of keywords) {
      if (body.includes(keyword)) return { matches: true, reason: `Corps: ${keyword}` };
    }
  }
  const hasFilters = settings.filterDomains || settings.filterEmails ||
                     settings.filterSubjectKeywords || settings.filterBodyKeywords;
  if (!hasFilters) return { matches: true, reason: 'Aucun filtre défini' };
  return { matches: false, reason: 'Aucun critère correspondant' };
};

export const startImapMailService = async () => {
  const settings = await getImapMailSettings();
  if (!settings?.enabled) {
    console.log('Service IMAP Email-PDF désactivé');
    return;
  }
  console.log('🔄 Démarrage du service IMAP Email-PDF...');
  const checkInterval = (parseInt(settings?.checkInterval) || 5) * 60 * 1000;
  await checkEmails();
  imapMailInterval = setInterval(async () => { await checkEmails(); }, checkInterval);
  imapMailStatus.running = true;
  console.log(`✅ Service IMAP Email-PDF démarré (toutes les ${settings?.checkInterval || 5} minutes)`);
};

export const stopImapMailService = () => {
  if (imapMailInterval) { clearInterval(imapMailInterval); imapMailInterval = null; }
  if (imapMailClient) {
    try { imapMailClient.end(); } catch (e) { /* ignore */ }
    imapMailClient = null;
  }
  imapMailStatus.running = false;
  console.log('⏹️ Service IMAP Email-PDF arrêté');
};

export const checkImapMailNow = async () => { return await checkEmails(); };

export const getImapMailStatus = async () => {
  const settings = await getImapMailSettings();
  return {
    ...imapMailStatus,
    enabled: !!settings?.enabled,
    host: settings?.host,
    user: settings?.user,
    checkInterval: settings?.checkInterval || 5,
    autoImport: settings?.autoImport ?? true,
    alwaysGenerateBodyPdf: settings?.alwaysGenerateBodyPdf ?? false,
    hasFilters: !!(settings?.filterDomains || settings?.filterEmails ||
                   settings?.filterSubjectKeywords || settings?.filterBodyKeywords)
  };
};

const saveEmailAsPDF = async (emailData) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const pendingPath = path.join(uploadPath, 'pending');
    if (!fs.existsSync(pendingPath)) fs.mkdirSync(pendingPath, { recursive: true });

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `Email Recu - le ${dateStr} a ${timeStr}-${uuidv4().slice(0, 8)}.pdf`;
    const filePath = path.join(pendingPath, fileName);

    const pdfBuffer = await generateEmailPDF({
      from: emailData.from?.text || '',
      to: emailData.to?.text || '',
      cc: emailData.cc?.text || '',
      subject: emailData.subject || '',
      date: emailData.date,
      text: emailData.text || '',
      html: emailData.html || ''
    });

    fs.writeFileSync(filePath, pdfBuffer);

    let ocrContent = '';
    try { ocrContent = await extractTextFromPDF(filePath); } catch (e) { /* ignore */ }

    const pendingMail = new PendingMail({
      fileName,
      originalName: `Email - ${emailData.subject || 'Sans objet'}.pdf`,
      filePath,
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
      source: 'imap',
      imapMessageId: emailData.messageId,
      imapSubject: emailData.subject,
      imapFrom: emailData.from?.text || '',
      imapDate: emailData.date,
      ocrContent,
      ocrProcessed: true,
      receivedDate: emailData.date || new Date()
    });

    await pendingMail.save();
    console.log(`✅ Email converti en PDF: ${fileName}`);
  } catch (error) {
    console.error('Erreur conversion email en PDF:', error);
  }
};

const saveAttachment = async (attachment, emailData) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const pendingPath = path.join(uploadPath, 'pending');
    if (!fs.existsSync(pendingPath)) fs.mkdirSync(pendingPath, { recursive: true });

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `Courrier Arrivé - le ${dateStr} à ${timeStr}-${uuidv4().slice(0, 8)}.pdf`;
    const filePath = path.join(pendingPath, fileName);

    fs.writeFileSync(filePath, attachment.content);

    let ocrContent = '';
    try { ocrContent = await extractTextFromPDF(filePath); } catch (e) { /* ignore */ }

    const pendingMail = new PendingMail({
      fileName,
      originalName: attachment.filename || fileName,
      filePath,
      fileSize: attachment.size,
      mimeType: attachment.contentType,
      source: 'imap',
      imapMessageId: emailData.messageId,
      imapSubject: emailData.subject,
      imapFrom: emailData.from?.text || '',
      imapDate: emailData.date,
      ocrContent,
      ocrProcessed: true,
      receivedDate: emailData.date || new Date()
    });

    await pendingMail.save();
    console.log(`✅ Pièce jointe sauvegardée: ${fileName}`);
  } catch (error) {
    console.error('Erreur sauvegarde pièce jointe:', error);
  }
};

const checkEmails = async () => {
  const settings = await getImapMailSettings();
  if (!settings?.enabled) {
    return { count: 0, error: 'DISABLED', message: 'IMAP Email-PDF non activé' };
  }

  return new Promise(async (resolve) => {
    const config = await getImapMailConfig();
    if (!config || !config.host || !config.user || !config.password) {
      imapMailStatus.lastError = 'Configuration incomplète';
      return resolve({ count: 0, error: 'CONFIG_INCOMPLETE', message: 'Configuration IMAP Email-PDF incomplète' });
    }

    imapMailClient = new Imap(config);
    let processedCount = 0;
    let filteredCount = 0;

    imapMailClient.once('ready', () => {
      const mailbox = settings?.mailbox || 'INBOX';
      imapMailClient.openBox(mailbox, false, async (err, box) => {
        if (err) {
          imapMailStatus.lastError = err.message;
          imapMailClient.end();
          return resolve({ count: 0, error: 'MAILBOX_ERROR', message: err.message });
        }

        const searchCriteria = settings?.processAllMails ? ['ALL'] : ['UNSEEN'];
        imapMailClient.search(searchCriteria, async (err, results) => {
          if (err) {
            imapMailStatus.lastError = err.message;
            imapMailClient.end();
            return resolve({ count: 0, error: 'SEARCH_ERROR', message: err.message });
          }

          const validResults = (results || []).filter(r => r && r > 0);
          if (validResults.length === 0) {
            imapMailStatus.lastCheck = new Date();
            imapMailClient.end();
            return resolve({ count: 0, message: 'Aucun message' });
          }

          const fetch = imapMailClient.fetch(validResults, {
            bodies: '', struct: true, markSeen: false
          });

          const processedMessages = [];
          const skippedMessages = [];
          const messageProcessingPromises = [];
          const alwaysBodyPdf = settings?.alwaysGenerateBodyPdf === true || settings?.alwaysGenerateBodyPdf === 'true';

          fetch.on('message', (msg, seqno) => {
            let messageUid = null;

            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });

              const messagePromise = new Promise((resolveMsg) => {
                stream.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);

                    const filterResult = emailMatchesFilters(parsed, settings || {});
                    if (!filterResult.matches) {
                      skippedMessages.push({ uid: messageUid, seqno });
                      filteredCount++;
                      resolveMsg();
                      return;
                    }

                    if (parsed.messageId) {
                      const existing = await PendingMail.findOne({ imapMessageId: parsed.messageId });
                      if (existing) {
                        processedMessages.push({ uid: messageUid, seqno, alreadyProcessed: true });
                        resolveMsg();
                        return;
                      }
                    }

                    const pdfAttachments = (parsed.attachments || []).filter(a => a.contentType === 'application/pdf');
                    const hasPdfAttachments = pdfAttachments.length > 0;

                    if (hasPdfAttachments) {
                      for (const attachment of pdfAttachments) {
                        await saveAttachment(attachment, parsed);
                        processedCount++;
                      }
                      if (alwaysBodyPdf) {
                        await saveEmailAsPDF(parsed);
                        processedCount++;
                      }
                    } else {
                      await saveEmailAsPDF(parsed);
                      processedCount++;
                    }

                    processedMessages.push({ uid: messageUid, seqno });
                    resolveMsg();
                  } catch (parseError) {
                    console.error('Erreur parsing email (IMAP Mail):', parseError);
                    resolveMsg();
                  }
                });
              });
              messageProcessingPromises.push(messagePromise);
            });

            msg.once('attributes', (attrs) => { messageUid = attrs.uid; });
          });

          fetch.once('error', (err) => {
            imapMailStatus.lastError = err.message;
          });

          fetch.once('end', async () => {
            await Promise.all(messageProcessingPromises);

            if (processedMessages.length > 0) {
              const processedFolder = settings?.processedFolder || 'Traités';
              const markAsRead = settings?.markAsRead ?? true;
              const deleteAfterProcess = settings?.deleteAfterProcess || false;

              for (const msgInfo of processedMessages) {
                try {
                  const uid = msgInfo.uid;
                  if (!uid) continue;

                  if (markAsRead) {
                    await new Promise((r) => {
                      imapMailClient.addFlags(uid, ['\\Seen'], () => r());
                    });
                  }

                  if (deleteAfterProcess) {
                    await new Promise((r) => {
                      imapMailClient.addFlags(uid, ['\\Deleted'], () => r());
                    });
                  } else {
                    await new Promise((r) => {
                      imapMailClient.move(uid, processedFolder, (err) => {
                        if (err && err.message?.includes('TRYCREATE')) {
                          imapMailClient.addBox(processedFolder, () => {
                            imapMailClient.move(uid, processedFolder, () => r());
                          });
                        } else {
                          r();
                        }
                      });
                    });
                  }
                } catch (e) { /* ignore */ }
              }

              if (deleteAfterProcess) {
                await new Promise((r) => { imapMailClient.expunge(() => r()); });
              }
            }

            for (const msgInfo of skippedMessages) {
              try {
                if (msgInfo.uid) {
                  await new Promise((r) => {
                    imapMailClient.addFlags(msgInfo.uid, ['\\Seen'], () => r());
                  });
                }
              } catch (e) { /* ignore */ }
            }

            imapMailStatus.lastCheck = new Date();
            imapMailStatus.lastError = null;
            imapMailStatus.messagesProcessed += processedCount;
            imapMailStatus.lastFiltered = filteredCount;

            imapMailClient.end();
            resolve({ count: processedCount, filtered: filteredCount });
          });
        });
      });
    });

    imapMailClient.once('error', (err) => {
      imapMailStatus.lastError = err.message;
      resolve({ count: 0 });
    });

    imapMailClient.once('end', () => {});

    imapMailClient.connect();
  });
};

export default {
  startImapMailService,
  stopImapMailService,
  checkImapMailNow,
  getImapMailStatus
};
