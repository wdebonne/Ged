/**
 * Service de stockage externe unifié
 * Gère S3, NextCloud et OneDrive de manière transparente
 */

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { Settings, Mail } from '../models/index.js';

// Import des services de stockage
import * as s3Service from './s3.service.js';
import * as nextcloudService from './nextcloud.service.js';
import * as onedriveService from './onedrive.service.js';

// Clés de configuration pour l'option "supprimer local après sync"
const DELETE_LOCAL_KEYS = {
  s3: 'storage_s3_deleteLocalAfterSync',
  nextcloud: 'storage_nextcloud_deleteLocalAfterSync',
  onedrive: 'storage_onedrive_deleteLocalAfterSync'
};

/**
 * Récupérer le stockage externe actif et configuré
 */
export const getActiveExternalStorage = async () => {
  // Vérifier S3
  const s3Status = await s3Service.getStatus();
  if (s3Status.connected && s3Status.enabled) {
    return { type: 's3', status: s3Status };
  }
  
  // Vérifier NextCloud
  try {
    const nextcloudStatus = await nextcloudService.getStatus();
    if (nextcloudStatus.connected && nextcloudStatus.enabled) {
      return { type: 'nextcloud', status: nextcloudStatus };
    }
  } catch (e) {
    // NextCloud non configuré
  }
  
  // Vérifier OneDrive
  try {
    const onedriveStatus = await onedriveService.getStatus();
    if (onedriveStatus.connected && onedriveStatus.enabled) {
      return { type: 'onedrive', status: onedriveStatus };
    }
  } catch (e) {
    // OneDrive non configuré
  }
  
  return null;
};

/**
 * Vérifier si l'option "supprimer local après sync" est activée
 */
export const shouldDeleteLocalAfterSync = async (storageType) => {
  const key = DELETE_LOCAL_KEYS[storageType];
  if (!key) return false;
  
  const setting = await Settings.findOne({ key });
  return setting?.value === 'true' || setting?.value === true;
};

/**
 * Télécharger un fichier depuis le stockage externe
 * @param {string} storageType - Type de stockage ('s3', 'nextcloud', 'onedrive')
 * @param {string} externalPath - Chemin/clé du fichier sur le stockage externe
 * @param {string} externalKey - Clé S3 ou ID OneDrive (optionnel)
 * @returns {Promise<{stream: Readable, contentType: string, contentLength: number}>}
 */
export const downloadFile = async (storageType, externalPath, externalKey = null) => {
  switch (storageType) {
    case 's3':
      return await downloadFromS3(externalKey || externalPath);
    case 'nextcloud':
      return await downloadFromNextCloud(externalPath);
    case 'onedrive':
      return await downloadFromOneDrive(externalKey || externalPath);
    default:
      throw new Error(`Type de stockage non supporté: ${storageType}`);
  }
};

/**
 * Télécharger depuis S3
 */
const downloadFromS3 = async (key) => {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  
  // Récupérer la configuration S3
  const [enabledSetting, regionSetting, accessKeySetting, secretKeySetting, bucketSetting, endpointSetting, providerSetting] = await Promise.all([
    Settings.findOne({ key: 'storage_s3_enabled' }),
    Settings.findOne({ key: 'storage_s3_region' }),
    Settings.findOne({ key: 'storage_s3_accessKeyId' }),
    Settings.findOne({ key: 'storage_s3_secretAccessKey' }),
    Settings.findOne({ key: 'storage_s3_bucket' }),
    Settings.findOne({ key: 'storage_s3_endpoint' }),
    Settings.findOne({ key: 'storage_s3_provider' })
  ]);
  
  if (!enabledSetting?.value) {
    throw new Error('S3 non activé');
  }
  
  const clientConfig = {
    region: regionSetting?.value || 'eu-west-1',
    credentials: {
      accessKeyId: accessKeySetting?.value,
      secretAccessKey: secretKeySetting?.value
    }
  };
  
  // Pour les fournisseurs autres qu'AWS
  if (providerSetting?.value !== 'aws' && endpointSetting?.value) {
    clientConfig.endpoint = endpointSetting.value;
    clientConfig.forcePathStyle = true;
  }
  
  const client = new S3Client(clientConfig);
  
  const command = new GetObjectCommand({
    Bucket: bucketSetting?.value,
    Key: key
  });
  
  const response = await client.send(command);
  
  return {
    stream: response.Body,
    contentType: response.ContentType || 'application/pdf',
    contentLength: response.ContentLength
  };
};

/**
 * Télécharger depuis NextCloud
 */
const downloadFromNextCloud = async (remotePath) => {
  const { createClient } = await import('webdav');
  
  // Récupérer la configuration NextCloud
  const [enabledSetting, urlSetting, userSetting, passSetting] = await Promise.all([
    Settings.findOne({ key: 'storage_nextcloud_enabled' }),
    Settings.findOne({ key: 'storage_nextcloud_url' }),
    Settings.findOne({ key: 'storage_nextcloud_username' }),
    Settings.findOne({ key: 'storage_nextcloud_password' })
  ]);
  
  if (!enabledSetting?.value) {
    throw new Error('NextCloud non activé');
  }
  
  const serverUrl = urlSetting?.value;
  const webdavUrl = serverUrl.endsWith('/') 
    ? `${serverUrl}remote.php/dav/files/${userSetting?.value}`
    : `${serverUrl}/remote.php/dav/files/${userSetting?.value}`;
  
  const client = createClient(webdavUrl, {
    username: userSetting?.value,
    password: passSetting?.value
  });
  
  // Obtenir les infos du fichier
  const stat = await client.stat(remotePath);
  
  // Créer un stream de lecture
  const buffer = await client.getFileContents(remotePath);
  const stream = Readable.from(buffer);
  
  return {
    stream,
    contentType: stat.mime || 'application/pdf',
    contentLength: stat.size
  };
};

/**
 * Télécharger depuis OneDrive
 */
const downloadFromOneDrive = async (itemId) => {
  // Récupérer la configuration OneDrive
  const [enabledSetting, accessTokenSetting] = await Promise.all([
    Settings.findOne({ key: 'storage_onedrive_enabled' }),
    Settings.findOne({ key: 'storage_onedrive_accessToken' })
  ]);
  
  if (!enabledSetting?.value) {
    throw new Error('OneDrive non activé');
  }
  
  const accessToken = accessTokenSetting?.value;
  if (!accessToken) {
    throw new Error('OneDrive non connecté');
  }
  
  // Télécharger le fichier via l'API Graph
  const fetch = (await import('node-fetch')).default;
  
  // Obtenir le lien de téléchargement
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    redirect: 'follow'
  });
  
  if (!response.ok) {
    throw new Error(`Erreur OneDrive: ${response.status} ${response.statusText}`);
  }
  
  return {
    stream: response.body,
    contentType: response.headers.get('content-type') || 'application/pdf',
    contentLength: parseInt(response.headers.get('content-length')) || 0
  };
};

/**
 * Supprimer le fichier local après synchronisation réussie
 * @param {string} localPath - Chemin du fichier local
 */
export const deleteLocalFile = async (localPath) => {
  try {
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`📁 Fichier local supprimé: ${localPath}`);
      return true;
    }
  } catch (error) {
    console.error(`Erreur suppression fichier local ${localPath}:`, error.message);
  }
  return false;
};

/**
 * Mettre à jour un courrier avec les infos de stockage externe
 * @param {string} mailId - ID du courrier
 * @param {Object} externalInfo - Infos du stockage externe
 */
export const updateMailExternalStorage = async (mailId, externalInfo) => {
  const { type, path: externalPath, key, deleteLocal = false, responseId = null } = externalInfo;
  
  const mail = await Mail.findById(mailId);
  if (!mail) {
    throw new Error('Courrier non trouvé');
  }
  
  if (responseId) {
    // Mettre à jour une réponse spécifique
    const response = mail.responses.id(responseId);
    if (response) {
      response.externalStorage = {
        type,
        path: externalPath,
        key,
        localDeleted: deleteLocal,
        syncedAt: new Date()
      };
      
      if (deleteLocal && response.filePath) {
        await deleteLocalFile(response.filePath);
      }
    }
  } else {
    // Mettre à jour le fichier principal
    mail.externalStorage = {
      type,
      path: externalPath,
      key,
      localDeleted: deleteLocal,
      syncedAt: new Date()
    };
    
    if (deleteLocal && mail.filePath) {
      await deleteLocalFile(mail.filePath);
    }
  }
  
  await mail.save();
  return mail;
};

/**
 * Récupérer un fichier (local ou externe)
 * Retourne un stream lisible
 * @param {Object} mail - Document courrier
 * @param {string} responseId - ID de la réponse (optionnel)
 */
export const getFileStream = async (mail, responseId = null) => {
  let filePath, externalStorage, fileName;
  
  if (responseId) {
    const response = mail.responses.id(responseId);
    if (!response) {
      throw new Error('Réponse non trouvée');
    }
    filePath = response.filePath;
    externalStorage = response.externalStorage;
    fileName = response.fileName;
  } else {
    filePath = mail.filePath;
    externalStorage = mail.externalStorage;
    fileName = mail.fileName;
  }
  
  // Si le fichier est sur le stockage externe et local supprimé
  if (externalStorage?.localDeleted && externalStorage?.type) {
    console.log(`📥 Téléchargement depuis ${externalStorage.type}: ${externalStorage.path || externalStorage.key}`);
    
    const result = await downloadFile(
      externalStorage.type,
      externalStorage.path,
      externalStorage.key
    );
    
    return {
      stream: result.stream,
      contentType: result.contentType,
      contentLength: result.contentLength,
      fileName,
      fromExternal: true,
      storageType: externalStorage.type
    };
  }
  
  // Sinon, fichier local
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Fichier non trouvé');
  }
  
  const stats = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  
  return {
    stream,
    contentType: 'application/pdf',
    contentLength: stats.size,
    fileName,
    fromExternal: false
  };
};

/**
 * Vérifier si un fichier existe (local ou externe)
 */
export const fileExists = async (mail, responseId = null) => {
  let filePath, externalStorage;
  
  if (responseId) {
    const response = mail.responses.id(responseId);
    if (!response) return false;
    filePath = response.filePath;
    externalStorage = response.externalStorage;
  } else {
    filePath = mail.filePath;
    externalStorage = mail.externalStorage;
  }
  
  // Si stocké en externe avec local supprimé
  if (externalStorage?.localDeleted && externalStorage?.type) {
    // On suppose qu'il existe sur le stockage externe
    return true;
  }
  
  // Vérifier le fichier local
  return filePath && fs.existsSync(filePath);
};

export default {
  getActiveExternalStorage,
  shouldDeleteLocalAfterSync,
  downloadFile,
  deleteLocalFile,
  updateMailExternalStorage,
  getFileStream,
  fileExists
};
