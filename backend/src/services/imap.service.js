import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PendingMail, Settings } from '../models/index.js';
import { extractTextFromPDF } from './ocr.service.js';

let imapClient = null;
let imapInterval = null;
let imapStatus = {
  running: false,
  lastCheck: null,
  lastError: null,
  messagesProcessed: 0,
  lastFiltered: 0
};

// Cache des paramètres IMAP
let imapSettings = null;

// Récupérer les paramètres IMAP depuis la base de données
const getImapSettings = async () => {
  try {
    const settings = await Settings.find({ key: { $regex: /^imap_/ } });
    const config = {};
    
    settings.forEach(s => {
      const key = s.key.replace('imap_', '');
      let value = s.value;
      
      // Convertir les booléens et nombres
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      
      config[key] = value;
    });
    
    return config;
  } catch (error) {
    console.error('Erreur récupération paramètres IMAP:', error);
    return null;
  }
};

// Configuration IMAP
const getImapConfig = async () => {
  const settings = await getImapSettings();
  if (!settings) return null;
  
  imapSettings = settings;
  
  return {
    user: settings.user || process.env.IMAP_USER,
    password: settings.password || process.env.IMAP_PASSWORD,
    host: settings.host || process.env.IMAP_HOST,
    port: parseInt(settings.port) || parseInt(process.env.IMAP_PORT) || 993,
    tls: settings.tls ?? (process.env.IMAP_TLS === 'true'),
    tlsOptions: { rejectUnauthorized: false }
  };
};

// Vérifier si un email correspond aux filtres
const emailMatchesFilters = (emailData, settings) => {
  // Si autoImport est activé, on importe tout
  if (settings.autoImport === true || settings.autoImport === 'true') {
    return { matches: true, reason: 'Import automatique activé' };
  }
  
  const fromEmail = emailData.from?.text?.toLowerCase() || '';
  const subject = emailData.subject?.toLowerCase() || '';
  const body = (emailData.text || emailData.html || '').toLowerCase();
  
  // Filtrer par domaines
  if (settings.filterDomains) {
    const domains = settings.filterDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
    for (const domain of domains) {
      if (fromEmail.includes(domain)) {
        return { matches: true, reason: `Domaine correspondant: ${domain}` };
      }
    }
  }
  
  // Filtrer par adresses email
  if (settings.filterEmails) {
    const emails = settings.filterEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    for (const email of emails) {
      if (fromEmail.includes(email)) {
        return { matches: true, reason: `Email correspondant: ${email}` };
      }
    }
  }
  
  // Filtrer par mots-clés dans le sujet
  if (settings.filterSubjectKeywords) {
    const keywords = settings.filterSubjectKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    for (const keyword of keywords) {
      if (subject.includes(keyword)) {
        return { matches: true, reason: `Mot-clé sujet: ${keyword}` };
      }
    }
  }
  
  // Filtrer par mots-clés dans le corps
  if (settings.filterBodyKeywords) {
    const keywords = settings.filterBodyKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    for (const keyword of keywords) {
      if (body.includes(keyword)) {
        return { matches: true, reason: `Mot-clé corps: ${keyword}` };
      }
    }
  }
  
  // Aucun filtre défini = import tout
  const hasFilters = settings.filterDomains || settings.filterEmails || 
                     settings.filterSubjectKeywords || settings.filterBodyKeywords;
  
  if (!hasFilters) {
    return { matches: true, reason: 'Aucun filtre défini' };
  }
  
  return { matches: false, reason: 'Aucun critère correspondant' };
};

// Démarrer le service IMAP
export const startImapService = async () => {
  const settings = await getImapSettings();
  
  if (!settings?.enabled && process.env.IMAP_ENABLED !== 'true') {
    console.log('Service IMAP désactivé');
    return;
  }

  console.log('🔄 Démarrage du service IMAP...');
  
  const checkInterval = (parseInt(settings?.checkInterval) || parseInt(process.env.IMAP_CHECK_INTERVAL) || 5) * 60 * 1000;

  // Vérification initiale
  await checkEmails();

  // Planifier les vérifications périodiques
  imapInterval = setInterval(async () => {
    await checkEmails();
  }, checkInterval);

  imapStatus.running = true;
  console.log(`✅ Service IMAP démarré (vérification toutes les ${settings?.checkInterval || process.env.IMAP_CHECK_INTERVAL || 5} minutes)`);
};

// Arrêter le service IMAP
export const stopImapService = () => {
  if (imapInterval) {
    clearInterval(imapInterval);
    imapInterval = null;
  }
  
  if (imapClient) {
    try {
      imapClient.end();
    } catch (e) {
      // Ignorer les erreurs de fermeture
    }
    imapClient = null;
  }

  imapStatus.running = false;
  console.log('⏹️ Service IMAP arrêté');
};

// Vérifier les emails maintenant
export const checkImapNow = async () => {
  return await checkEmails();
};

// Obtenir le statut du service
export const getImapStatus = async () => {
  const settings = await getImapSettings();
  return {
    ...imapStatus,
    enabled: settings?.enabled || process.env.IMAP_ENABLED === 'true',
    host: settings?.host || process.env.IMAP_HOST,
    user: settings?.user || process.env.IMAP_USER,
    checkInterval: settings?.checkInterval || process.env.IMAP_CHECK_INTERVAL || 5,
    autoImport: settings?.autoImport ?? true,
    hasFilters: !!(settings?.filterDomains || settings?.filterEmails || 
                   settings?.filterSubjectKeywords || settings?.filterBodyKeywords)
  };
};

// Vérifier les emails
const checkEmails = async () => {
  const settings = await getImapSettings();
  
  console.log('📧 Vérification IMAP - Paramètres:', {
    enabled: settings?.enabled,
    host: settings?.host,
    user: settings?.user,
    mailbox: settings?.mailbox,
    processAllMails: settings?.processAllMails
  });
  
  if (!settings?.enabled && process.env.IMAP_ENABLED !== 'true') {
    console.log('📧 IMAP: Désactivé dans les paramètres');
    return { count: 0, error: 'IMAP_DISABLED', message: 'IMAP non activé dans les paramètres' };
  }

  return new Promise(async (resolve, reject) => {
    const config = await getImapConfig();
    
    if (!config || !config.host || !config.user || !config.password) {
      console.error('Configuration IMAP incomplète');
      imapStatus.lastError = 'Configuration incomplète';
      return resolve({ count: 0, error: 'CONFIG_INCOMPLETE', message: 'Configuration IMAP incomplète (host, user ou password manquant)' });
    }

    console.log(`📧 Connexion IMAP à ${config.host}:${config.port} (TLS: ${config.tls})`);

    imapClient = new Imap(config);
    let processedCount = 0;
    let filteredCount = 0;

    imapClient.once('ready', () => {
      const mailbox = settings?.mailbox || process.env.IMAP_MAILBOX || 'INBOX';
      console.log(`📧 Ouverture du dossier: ${mailbox}`);
      
      imapClient.openBox(mailbox, false, async (err, box) => {
        if (err) {
          console.error('Erreur ouverture boîte mail:', err);
          imapStatus.lastError = err.message;
          imapClient.end();
          return resolve({ count: 0, error: 'MAILBOX_ERROR', message: `Impossible d'ouvrir le dossier ${mailbox}: ${err.message}` });
        }

        console.log(`📧 Dossier ouvert: ${box.messages.total} message(s) total, ${box.messages.unseen || 0} non lu(s)`);

        // Rechercher les messages selon le paramètre processAllMails
        // Si processAllMails est activé, on cherche TOUS les messages, sinon seulement les non lus
        const searchCriteria = settings?.processAllMails ? ['ALL'] : ['UNSEEN'];
        console.log(`📧 Critère de recherche: ${searchCriteria[0]}`);
        
        imapClient.search(searchCriteria, async (err, results) => {
          if (err) {
            console.error('Erreur recherche emails:', err);
            imapStatus.lastError = err.message;
            imapClient.end();
            return resolve({ count: 0, error: 'SEARCH_ERROR', message: err.message });
          }

          // Filtrer les résultats valides (numéros > 0)
          const validResults = (results || []).filter(r => r && r > 0);
          
          console.log(`📧 Résultats recherche: ${results?.length || 0} trouvé(s), ${validResults.length} valide(s)`);

          if (validResults.length === 0) {
            const msg = settings?.processAllMails 
              ? 'Aucun message dans le dossier'
              : 'Aucun message non lu';
            console.log(`📧 ${msg}`);
            imapStatus.lastCheck = new Date();
            imapClient.end();
            return resolve({ count: 0, message: msg });
          }

          console.log(`📧 ${validResults.length} message(s) à traiter: [${validResults.slice(0, 10).join(', ')}${validResults.length > 10 ? '...' : ''}]`);

          // search() retourne des UIDs, donc utiliser fetch() qui travaille avec les UIDs
          const fetch = imapClient.fetch(validResults, {
            bodies: '',
            struct: true,
            markSeen: false
          });

          const processedMessages = [];  // Stockera les infos du message (uid)
          const skippedMessages = [];    // Stockera les infos du message (uid)
          const messageProcessingPromises = []; // Stocker les promesses de traitement

          fetch.on('message', (msg, seqno) => {
            let messageId = null;
            let emailData = null;
            let messageUid = null;

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              // Créer une promesse pour ce message et l'ajouter à la liste
              const messagePromise = new Promise((resolveMsg) => {
                stream.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);
                    emailData = parsed;
                    messageId = parsed.messageId;
                    
                    // Vérifier si l'email correspond aux filtres
                    const filterResult = emailMatchesFilters(parsed, settings || {});
                    
                    if (!filterResult.matches) {
                      console.log(`⏭️ Email ignoré (${filterResult.reason}): ${parsed.subject}`);
                      skippedMessages.push({ uid: messageUid, seqno });
                      filteredCount++;
                      resolveMsg();
                      return;
                    }
                    
                    // Vérifier si cet email a déjà été traité (doublon basé sur messageId)
                    if (parsed.messageId) {
                      const existingMail = await PendingMail.findOne({ imapMessageId: parsed.messageId });
                      if (existingMail) {
                        console.log(`⏭️ Email déjà importé (doublon): ${parsed.subject}`);
                        // Marquer comme traité pour le déplacer également
                        processedMessages.push({ uid: messageUid, seqno, alreadyProcessed: true });
                        resolveMsg();
                        return;
                      }
                    }
                    
                    console.log(`✔️ Email accepté (${filterResult.reason}): ${parsed.subject}`);
                    
                    // Traiter les pièces jointes PDF
                    if (parsed.attachments && parsed.attachments.length > 0) {
                      for (const attachment of parsed.attachments) {
                        if (attachment.contentType === 'application/pdf') {
                          await saveAttachment(attachment, parsed);
                          processedCount++;
                        }
                      }
                    }
                    
                    processedMessages.push({ uid: messageUid, seqno });
                    resolveMsg();
                  } catch (parseError) {
                    console.error('Erreur parsing email:', parseError);
                    resolveMsg();
                  }
                });
              });
              messageProcessingPromises.push(messagePromise);
            });

            msg.once('attributes', (attrs) => {
              messageUid = attrs.uid;
            });
          });

          fetch.once('error', (err) => {
            console.error('Erreur fetch:', err);
            imapStatus.lastError = err.message;
          });

          fetch.once('end', async () => {
            // Attendre que tous les messages soient traités (parsing, OCR, sauvegarde)
            console.log(`📧 Attente du traitement de ${messageProcessingPromises.length} message(s)...`);
            await Promise.all(messageProcessingPromises);
            console.log(`📧 Traitement terminé: ${processedCount} fichier(s) importé(s), ${filteredCount} filtré(s)`);
            
            // Marquer les messages traités comme lus et les déplacer/supprimer
            if (processedMessages.length > 0) {
              const processedFolder = settings?.processedFolder || process.env.IMAP_PROCESSED_FOLDER || 'Traités';
              const markAsRead = settings?.markAsRead ?? true;
              const deleteAfterProcess = settings?.deleteAfterProcess || false;
              
              console.log(`📧 Traitement de ${processedMessages.length} message(s)...`);
              
              for (const msgInfo of processedMessages) {
                try {
                  const uid = msgInfo.uid;
                  if (!uid) {
                    console.log('⚠️ UID manquant pour un message, skip');
                    continue;
                  }
                  
                  console.log(`📧 Traitement du message UID ${uid}...`);
                  
                  // Marquer comme lu si l'option est activée (utiliser UID)
                  if (markAsRead) {
                    await new Promise((resolve) => {
                      imapClient.addFlags(uid, ['\\Seen'], (err) => {
                        if (err) {
                          console.log(`Note: Impossible de marquer comme lu (UID ${uid}):`, err.message);
                        }
                        resolve();
                      });
                    });
                  }

                  // Supprimer ou déplacer selon le choix de l'utilisateur
                  if (deleteAfterProcess) {
                    // Supprimer le message
                    await new Promise((resolve) => {
                      imapClient.addFlags(uid, ['\\Deleted'], (err) => {
                        if (err) {
                          console.log(`Note: Impossible de supprimer le message (UID ${uid}):`, err.message);
                        } else {
                          console.log(`🗑️ Message marqué pour suppression (UID ${uid})`);
                        }
                        resolve();
                      });
                    });
                  } else {
                    // Déplacer vers le dossier traité
                    await new Promise((resolve) => {
                      imapClient.move(uid, processedFolder, (err) => {
                        if (err) {
                          console.log(`Note: Impossible de déplacer vers ${processedFolder} (UID ${uid}):`, err.message);
                          // En cas d'erreur TRYCREATE, essayer de créer le dossier
                          if (err.message && err.message.includes('TRYCREATE')) {
                            imapClient.addBox(processedFolder, (createErr) => {
                              if (!createErr) {
                                console.log(`📁 Dossier ${processedFolder} créé`);
                                imapClient.move(uid, processedFolder, (retryErr) => {
                                  if (retryErr) {
                                    console.log(`Note: Échec du déplacement après création:`, retryErr.message);
                                  } else {
                                    console.log(`📨 Message déplacé vers ${processedFolder} (UID ${uid})`);
                                  }
                                  resolve();
                                });
                              } else {
                                resolve();
                              }
                            });
                          } else {
                            resolve();
                          }
                        } else {
                          console.log(`📨 Message déplacé vers ${processedFolder} (UID ${uid})`);
                          resolve();
                        }
                      });
                    });
                  }
                } catch (e) {
                  console.error('Erreur traitement message:', e);
                }
              }

              // Si des messages ont été supprimés, expunge pour les supprimer définitivement
              if (deleteAfterProcess) {
                await new Promise((resolve) => {
                  imapClient.expunge((err) => {
                    if (err) console.log('Erreur expunge:', err.message);
                    resolve();
                  });
                });
              }
            }
            
            // Marquer les messages ignorés comme lus (mais ne pas les déplacer)
            for (const msgInfo of skippedMessages) {
              try {
                if (msgInfo.uid) {
                  await new Promise((resolve) => {
                    imapClient.addFlags(msgInfo.uid, ['\\Seen'], (err) => {
                      if (err) {
                        console.log(`Note: Impossible de marquer comme lu (UID ${msgInfo.uid}):`, err.message);
                      }
                      resolve();
                    });
                  });
                }
              } catch (e) {
                // Ignorer les erreurs
              }
            }

            imapStatus.lastCheck = new Date();
            imapStatus.lastError = null;
            imapStatus.messagesProcessed += processedCount;
            imapStatus.lastFiltered = filteredCount;
            
            console.log(`📊 Résultat: ${processedCount} importé(s), ${filteredCount} filtré(s)`);
            
            imapClient.end();
            resolve({ count: processedCount, filtered: filteredCount });
          });
        });
      });
    });

    imapClient.once('error', (err) => {
      console.error('Erreur IMAP:', err);
      imapStatus.lastError = err.message;
      resolve({ count: 0 });
    });

    imapClient.once('end', () => {
      console.log('Connexion IMAP fermée');
    });

    imapClient.connect();
  });
};

// Sauvegarder une pièce jointe
const saveAttachment = async (attachment, emailData) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const pendingPath = path.join(uploadPath, 'pending');

    if (!fs.existsSync(pendingPath)) {
      fs.mkdirSync(pendingPath, { recursive: true });
    }

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const fileName = `Courrier Arrivé - le ${dateStr} à ${timeStr}-${uuidv4().slice(0, 8)}.pdf`;
    const filePath = path.join(pendingPath, fileName);

    // Sauvegarder le fichier
    fs.writeFileSync(filePath, attachment.content);

    // Extraire le texte OCR
    let ocrContent = '';
    try {
      ocrContent = await extractTextFromPDF(filePath);
    } catch (ocrError) {
      console.error('Erreur OCR:', ocrError);
    }

    // Créer l'entrée dans la base de données
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

export default {
  startImapService,
  stopImapService,
  checkImapNow,
  getImapStatus
};
