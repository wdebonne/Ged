/**
 * Service de stockage NextCloud / ownCloud
 * Utilise l'API WebDAV
 */

import { createClient } from 'webdav';
import fs from 'fs';
import path from 'path';
import { Settings } from '../models/index.js';

// Clés de configuration
const CONFIG_KEYS = {
  enabled: 'storage_nextcloud_enabled',
  serverUrl: 'storage_nextcloud_serverUrl',
  username: 'storage_nextcloud_username',
  password: 'storage_nextcloud_password',
  basePath: 'storage_nextcloud_basePath',
  syncArchivedMails: 'storage_nextcloud_syncArchivedMails',
  syncResponseFiles: 'storage_nextcloud_syncResponseFiles',
  useServiceSubfolder: 'storage_nextcloud_useServiceSubfolder',
  useYearSubfolder: 'storage_nextcloud_useYearSubfolder',
  useMonthSubfolder: 'storage_nextcloud_useMonthSubfolder',
  deleteLocalAfterSync: 'storage_nextcloud_deleteLocalAfterSync'
};

// Noms des mois
const MONTH_NAMES = {
  1: '01 - Janvier', 2: '02 - Février', 3: '03 - Mars',
  4: '04 - Avril', 5: '05 - Mai', 6: '06 - Juin',
  7: '07 - Juillet', 8: '08 - Août', 9: '09 - Septembre',
  10: '10 - Octobre', 11: '11 - Novembre', 12: '12 - Décembre'
};

/**
 * Récupérer les paramètres NextCloud
 */
export const getNextCloudSettings = async () => {
  const settings = {};
  
  for (const [key, dbKey] of Object.entries(CONFIG_KEYS)) {
    const setting = await Settings.findOne({ key: dbKey });
    if (setting) {
      // Ne pas renvoyer le mot de passe complet
      if (key === 'password' && setting.value) {
        settings[key] = '••••••••';
        settings[`${key}Set`] = true;
      } else {
        settings[key] = setting.value;
      }
    }
  }
  
  return settings;
};

/**
 * Sauvegarder les paramètres NextCloud
 */
export const saveNextCloudSettings = async (config) => {
  const updates = [];
  
  for (const [key, value] of Object.entries(config)) {
    const dbKey = CONFIG_KEYS[key];
    if (dbKey && value !== undefined) {
      // Ne pas écraser le mot de passe si masqué
      if (key === 'password' && value === '••••••••') {
        continue;
      }
      
      updates.push(
        Settings.findOneAndUpdate(
          { key: dbKey },
          { key: dbKey, value, category: 'storage' },
          { upsert: true, new: true }
        )
      );
    }
  }
  
  await Promise.all(updates);
  return getNextCloudSettings();
};

/**
 * Créer un client WebDAV NextCloud
 */
const createNextCloudClient = async () => {
  const enabledSetting = await Settings.findOne({ key: CONFIG_KEYS.enabled });
  if (!enabledSetting?.value) {
    return null;
  }
  
  const [serverUrlSetting, usernameSetting, passwordSetting] = await Promise.all([
    Settings.findOne({ key: CONFIG_KEYS.serverUrl }),
    Settings.findOne({ key: CONFIG_KEYS.username }),
    Settings.findOne({ key: CONFIG_KEYS.password })
  ]);
  
  const serverUrl = serverUrlSetting?.value;
  const username = usernameSetting?.value;
  const password = passwordSetting?.value;
  
  if (!serverUrl || !username || !password) {
    throw new Error('Configuration NextCloud incomplète');
  }
  
  // Construire l'URL WebDAV
  // NextCloud: https://server.com/remote.php/dav/files/USERNAME/
  // ownCloud: https://server.com/remote.php/webdav/
  let webdavUrl = serverUrl.replace(/\/+$/, '');
  if (!webdavUrl.includes('/remote.php/')) {
    webdavUrl += `/remote.php/dav/files/${username}`;
  }
  
  return createClient(webdavUrl, {
    username,
    password
  });
};

/**
 * Obtenir le statut de la connexion NextCloud
 */
export const getStatus = async () => {
  try {
    const settings = await getNextCloudSettings();
    
    if (!settings.enabled) {
      return { connected: false, enabled: false };
    }
    
    const client = await createNextCloudClient();
    if (!client) {
      return { connected: false, enabled: true, error: 'Client non configuré' };
    }
    
    // Vérifier la connexion en listant la racine
    await client.getDirectoryContents('/');
    
    return {
      connected: true,
      enabled: true,
      serverUrl: settings.serverUrl,
      username: settings.username
    };
  } catch (error) {
    return {
      connected: false,
      enabled: true,
      error: error.message
    };
  }
};

/**
 * Tester la connexion NextCloud
 */
export const testConnection = async () => {
  try {
    const client = await createNextCloudClient();
    if (!client) {
      return { success: false, message: 'NextCloud non configuré ou désactivé' };
    }
    
    // Vérifier la connexion
    const contents = await client.getDirectoryContents('/');
    
    // Tester l'écriture
    const testPath = `/_test_connection_${Date.now()}.txt`;
    await client.putFileContents(testPath, 'Test de connexion GED Courrier');
    await client.deleteFile(testPath);
    
    const settings = await getNextCloudSettings();
    
    return {
      success: true,
      message: 'Connexion NextCloud réussie',
      serverUrl: settings.serverUrl,
      foldersCount: contents.filter(c => c.type === 'directory').length
    };
  } catch (error) {
    console.error('Erreur test NextCloud:', error);
    return {
      success: false,
      message: error.message || 'Erreur de connexion NextCloud'
    };
  }
};

/**
 * Lister les dossiers dans un chemin
 */
export const listFolders = async (folderPath = '/') => {
  try {
    const client = await createNextCloudClient();
    if (!client) {
      throw new Error('NextCloud non configuré');
    }
    
    const cleanPath = folderPath || '/';
    const contents = await client.getDirectoryContents(cleanPath);
    
    const folders = contents
      .filter(item => item.type === 'directory')
      .map(item => ({
        name: item.basename,
        path: item.filename,
        type: 'folder',
        lastModified: item.lastmod
      }));
    
    const files = contents
      .filter(item => item.type === 'file')
      .map(item => ({
        name: item.basename,
        path: item.filename,
        type: 'file',
        size: item.size,
        lastModified: item.lastmod,
        mime: item.mime
      }));
    
    return { folders, files, currentPath: cleanPath };
  } catch (error) {
    console.error('Erreur listFolders NextCloud:', error);
    throw error;
  }
};

/**
 * Créer un dossier
 */
export const createFolder = async (folderPath, folderName) => {
  try {
    const client = await createNextCloudClient();
    if (!client) {
      throw new Error('NextCloud non configuré');
    }
    
    // Construire le chemin complet
    let fullPath = (folderPath || '/').replace(/\/+$/, '');
    if (folderName) {
      fullPath += '/' + folderName;
    }
    
    await client.createDirectory(fullPath);
    
    return { success: true, path: fullPath };
  } catch (error) {
    console.error('Erreur createFolder NextCloud:', error);
    throw error;
  }
};

/**
 * S'assurer qu'un chemin de dossiers existe (création récursive)
 */
const ensureFolderExists = async (client, folderPath) => {
  const parts = folderPath.split('/').filter(p => p);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath += '/' + part;
    try {
      const exists = await client.exists(currentPath);
      if (!exists) {
        await client.createDirectory(currentPath);
      }
    } catch (error) {
      // Le dossier existe peut-être déjà
      if (!error.message?.includes('405')) {
        console.warn(`Avertissement création dossier ${currentPath}:`, error.message);
      }
    }
  }
};

/**
 * Upload un fichier vers NextCloud
 */
export const uploadFile = async (localFilePath, remotePath, fileName) => {
  try {
    const client = await createNextCloudClient();
    if (!client) {
      throw new Error('NextCloud non configuré');
    }
    
    // S'assurer que le dossier de destination existe
    await ensureFolderExists(client, remotePath);
    
    // Construire le chemin complet
    const fullPath = remotePath.replace(/\/+$/, '') + '/' + fileName;
    
    // Lire et uploader le fichier
    const fileContent = fs.readFileSync(localFilePath);
    await client.putFileContents(fullPath, fileContent, {
      overwrite: true
    });
    
    return {
      success: true,
      path: fullPath
    };
  } catch (error) {
    console.error('Erreur uploadFile NextCloud:', error);
    throw error;
  }
};

/**
 * Construire le chemin de destination pour un courrier
 */
const buildMailPath = async (mail) => {
  const [basePathSetting, useServiceSetting, useYearSetting, useMonthSetting] = await Promise.all([
    Settings.findOne({ key: CONFIG_KEYS.basePath }),
    Settings.findOne({ key: CONFIG_KEYS.useServiceSubfolder }),
    Settings.findOne({ key: CONFIG_KEYS.useYearSubfolder }),
    Settings.findOne({ key: CONFIG_KEYS.useMonthSubfolder })
  ]);
  
  let remotePath = '/' + (basePathSetting?.value || 'GED-Courrier').replace(/^\/+/, '').replace(/\/+$/, '');
  
  // Sous-dossier par service
  if (useServiceSetting?.value && mail.service?.name) {
    const serviceName = mail.service.name.replace(/[<>:"/\\|?*]/g, '_');
    remotePath += '/' + serviceName;
  }
  
  // Sous-dossier par année
  const mailDate = mail.archivedDate || mail.receivedDate || new Date();
  if (useYearSetting?.value) {
    remotePath += '/' + mailDate.getFullYear();
  }
  
  // Sous-dossier par mois
  if (useMonthSetting?.value) {
    const month = mailDate.getMonth() + 1;
    remotePath += '/' + MONTH_NAMES[month];
  }
  
  return remotePath;
};

/**
 * Synchroniser un courrier archivé vers NextCloud
 */
export const syncArchivedMail = async (mail, localFilePath) => {
  try {
    // Vérifier si NextCloud est activé
    const enabledSetting = await Settings.findOne({ key: CONFIG_KEYS.enabled });
    if (!enabledSetting?.value) {
      return { synced: false, reason: 'NextCloud désactivé' };
    }
    
    // Vérifier si la sync des mails archivés est activée
    const syncMailsSetting = await Settings.findOne({ key: CONFIG_KEYS.syncArchivedMails });
    if (!syncMailsSetting?.value) {
      return { synced: false, reason: 'Sync des courriers archivés désactivée' };
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(localFilePath)) {
      return { synced: false, reason: 'Fichier local introuvable' };
    }
    
    // Vérifier si on doit supprimer le fichier local après sync
    const deleteLocalSetting = await Settings.findOne({ key: CONFIG_KEYS.deleteLocalAfterSync });
    const shouldDeleteLocal = deleteLocalSetting?.value === true || deleteLocalSetting?.value === 'true';
    
    // Construire le chemin de destination
    const remotePath = await buildMailPath(mail);
    
    // Upload le fichier principal
    const result = await uploadFile(localFilePath, remotePath, mail.fileName);
    
    // Mettre à jour le modèle Mail avec les infos du stockage externe
    mail.externalStorage = {
      type: 'nextcloud',
      path: remotePath + '/' + mail.fileName,
      key: null,
      localDeleted: shouldDeleteLocal,
      syncedAt: new Date()
    };
    
    // Supprimer le fichier local si l'option est activée
    if (shouldDeleteLocal) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`📁 Fichier local supprimé après sync NextCloud: ${localFilePath}`);
      } catch (deleteError) {
        console.error('Erreur suppression fichier local:', deleteError.message);
      }
    }
    
    // Sync des fichiers de réponse si activé
    const syncResponsesSetting = await Settings.findOne({ key: CONFIG_KEYS.syncResponseFiles });
    if (syncResponsesSetting?.value && mail.responses?.length > 0) {
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      
      for (const response of mail.responses) {
        if (response.filePath) {
          const responseLocalPath = path.join(uploadPath, response.filePath);
          if (fs.existsSync(responseLocalPath)) {
            await uploadFile(responseLocalPath, remotePath, response.fileName);
            
            // Mettre à jour la réponse avec les infos du stockage externe
            response.externalStorage = {
              type: 'nextcloud',
              path: remotePath + '/' + response.fileName,
              key: null,
              localDeleted: shouldDeleteLocal,
              syncedAt: new Date()
            };
            
            // Supprimer le fichier de réponse local si l'option est activée
            if (shouldDeleteLocal) {
              try {
                fs.unlinkSync(responseLocalPath);
                console.log(`📁 Fichier réponse local supprimé après sync NextCloud: ${responseLocalPath}`);
              } catch (deleteError) {
                console.error('Erreur suppression fichier réponse local:', deleteError.message);
              }
            }
          }
        }
      }
    }
    
    // Sauvegarder les modifications du mail
    await mail.save();
    
    return {
      synced: true,
      path: result.path,
      localDeleted: shouldDeleteLocal
    };
  } catch (error) {
    console.error('Erreur syncArchivedMail NextCloud:', error);
    return {
      synced: false,
      error: error.message
    };
  }
};

/**
 * Déconnecter NextCloud (supprimer les credentials)
 */
export const disconnect = async () => {
  await Promise.all([
    Settings.findOneAndUpdate(
      { key: CONFIG_KEYS.enabled },
      { value: false },
      { upsert: true }
    ),
    Settings.findOneAndDelete({ key: CONFIG_KEYS.password })
  ]);
  
  return { success: true };
};

export default {
  getNextCloudSettings,
  saveNextCloudSettings,
  getStatus,
  testConnection,
  listFolders,
  createFolder,
  uploadFile,
  syncArchivedMail,
  disconnect
};
