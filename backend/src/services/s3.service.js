/**
 * Service de stockage Amazon S3 / Compatible S3 (MinIO, Wasabi, etc.)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CreateBucketCommand, HeadBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Settings } from '../models/index.js';

// Clés de configuration
const CONFIG_KEYS = {
  enabled: 'storage_s3_enabled',
  provider: 'storage_s3_provider', // aws, minio, wasabi, other
  endpoint: 'storage_s3_endpoint',
  region: 'storage_s3_region',
  accessKeyId: 'storage_s3_accessKeyId',
  secretAccessKey: 'storage_s3_secretAccessKey',
  bucket: 'storage_s3_bucket',
  basePath: 'storage_s3_basePath',
  syncArchivedMails: 'storage_s3_syncArchivedMails',
  syncResponseFiles: 'storage_s3_syncResponseFiles',
  useServiceSubfolder: 'storage_s3_useServiceSubfolder',
  useYearSubfolder: 'storage_s3_useYearSubfolder',
  useMonthSubfolder: 'storage_s3_useMonthSubfolder',
  deleteLocalAfterSync: 'storage_s3_deleteLocalAfterSync'
};

// Noms des mois
const MONTH_NAMES = {
  1: '01 - Janvier', 2: '02 - Février', 3: '03 - Mars',
  4: '04 - Avril', 5: '05 - Mai', 6: '06 - Juin',
  7: '07 - Juillet', 8: '08 - Août', 9: '09 - Septembre',
  10: '10 - Octobre', 11: '11 - Novembre', 12: '12 - Décembre'
};

/**
 * Récupérer les paramètres S3
 */
export const getS3Settings = async () => {
  const settings = {};
  
  for (const [key, dbKey] of Object.entries(CONFIG_KEYS)) {
    const setting = await Settings.findOne({ key: dbKey });
    if (setting) {
      // Ne pas renvoyer le secret complet
      if (key === 'secretAccessKey' && setting.value) {
        settings[key] = '••••••••' + setting.value.slice(-4);
        settings[`${key}Set`] = true;
      } else {
        settings[key] = setting.value;
      }
    }
  }
  
  return settings;
};

/**
 * Sauvegarder les paramètres S3
 */
export const saveS3Settings = async (config) => {
  const updates = [];
  
  for (const [key, value] of Object.entries(config)) {
    const dbKey = CONFIG_KEYS[key];
    if (dbKey && value !== undefined) {
      // Ne pas écraser le secret si masqué
      if (key === 'secretAccessKey' && value.startsWith('••••')) {
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
  return getS3Settings();
};

/**
 * Créer un client S3
 */
const createS3Client = async () => {
  const enabledSetting = await Settings.findOne({ key: CONFIG_KEYS.enabled });
  if (!enabledSetting?.value) {
    return null;
  }
  
  const [providerSetting, endpointSetting, regionSetting, accessKeySetting, secretKeySetting] = await Promise.all([
    Settings.findOne({ key: CONFIG_KEYS.provider }),
    Settings.findOne({ key: CONFIG_KEYS.endpoint }),
    Settings.findOne({ key: CONFIG_KEYS.region }),
    Settings.findOne({ key: CONFIG_KEYS.accessKeyId }),
    Settings.findOne({ key: CONFIG_KEYS.secretAccessKey })
  ]);
  
  const provider = providerSetting?.value || 'aws';
  const region = regionSetting?.value || 'eu-west-1';
  const accessKeyId = accessKeySetting?.value;
  const secretAccessKey = secretKeySetting?.value;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Identifiants S3 non configurés');
  }
  
  const clientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };
  
  // Pour les fournisseurs autres qu'AWS, utiliser un endpoint personnalisé
  if (provider !== 'aws' && endpointSetting?.value) {
    clientConfig.endpoint = endpointSetting.value;
    clientConfig.forcePathStyle = true; // Nécessaire pour MinIO et autres
  }
  
  return new S3Client(clientConfig);
};

/**
 * Obtenir le statut de la connexion S3
 */
export const getStatus = async () => {
  try {
    const settings = await getS3Settings();
    
    if (!settings.enabled) {
      return { connected: false, enabled: false };
    }
    
    const client = await createS3Client();
    if (!client) {
      return { connected: false, enabled: true, error: 'Client non configuré' };
    }
    
    const bucketSetting = await Settings.findOne({ key: CONFIG_KEYS.bucket });
    if (!bucketSetting?.value) {
      return { connected: false, enabled: true, error: 'Bucket non configuré' };
    }
    
    // Vérifier que le bucket existe
    await client.send(new HeadBucketCommand({ Bucket: bucketSetting.value }));
    
    return {
      connected: true,
      enabled: true,
      bucket: bucketSetting.value,
      provider: settings.provider || 'aws'
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
 * Tester la connexion S3
 */
export const testConnection = async () => {
  try {
    const client = await createS3Client();
    if (!client) {
      return { success: false, message: 'S3 non configuré ou désactivé' };
    }
    
    const bucketSetting = await Settings.findOne({ key: CONFIG_KEYS.bucket });
    if (!bucketSetting?.value) {
      return { success: false, message: 'Bucket non configuré' };
    }
    
    // Tester l'accès au bucket
    await client.send(new HeadBucketCommand({ Bucket: bucketSetting.value }));
    
    // Tester l'écriture (fichier temporaire)
    const testKey = `_test_connection_${Date.now()}.txt`;
    await client.send(new PutObjectCommand({
      Bucket: bucketSetting.value,
      Key: testKey,
      Body: 'Test de connexion GED Courrier',
      ContentType: 'text/plain'
    }));
    
    // Supprimer le fichier de test
    await client.send(new DeleteObjectCommand({
      Bucket: bucketSetting.value,
      Key: testKey
    }));
    
    return {
      success: true,
      message: 'Connexion S3 réussie',
      bucket: bucketSetting.value
    };
  } catch (error) {
    console.error('Erreur test S3:', error);
    return {
      success: false,
      message: error.message || 'Erreur de connexion S3'
    };
  }
};

/**
 * Lister les objets/dossiers dans un chemin
 */
export const listObjects = async (prefix = '') => {
  try {
    const client = await createS3Client();
    if (!client) {
      throw new Error('S3 non configuré');
    }
    
    const bucketSetting = await Settings.findOne({ key: CONFIG_KEYS.bucket });
    if (!bucketSetting?.value) {
      throw new Error('Bucket non configuré');
    }
    
    // Nettoyer le prefix
    let cleanPrefix = prefix.replace(/^\/+/, '');
    if (cleanPrefix && !cleanPrefix.endsWith('/')) {
      cleanPrefix += '/';
    }
    
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucketSetting.value,
      Prefix: cleanPrefix,
      Delimiter: '/'
    }));
    
    const folders = (response.CommonPrefixes || []).map(p => ({
      name: p.Prefix.replace(cleanPrefix, '').replace(/\/$/, ''),
      path: '/' + p.Prefix.replace(/\/$/, ''),
      type: 'folder'
    }));
    
    const files = (response.Contents || [])
      .filter(obj => obj.Key !== cleanPrefix)
      .map(obj => ({
        name: obj.Key.replace(cleanPrefix, ''),
        path: '/' + obj.Key,
        type: 'file',
        size: obj.Size,
        lastModified: obj.LastModified
      }));
    
    return { folders, files };
  } catch (error) {
    console.error('Erreur listObjects S3:', error);
    throw error;
  }
};

/**
 * Créer un "dossier" (objet vide avec / à la fin)
 */
export const createFolder = async (folderPath) => {
  try {
    const client = await createS3Client();
    if (!client) {
      throw new Error('S3 non configuré');
    }
    
    const bucketSetting = await Settings.findOne({ key: CONFIG_KEYS.bucket });
    if (!bucketSetting?.value) {
      throw new Error('Bucket non configuré');
    }
    
    // Nettoyer le chemin
    let cleanPath = folderPath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanPath) {
      cleanPath += '/';
    }
    
    await client.send(new PutObjectCommand({
      Bucket: bucketSetting.value,
      Key: cleanPath,
      Body: '',
      ContentType: 'application/x-directory'
    }));
    
    return { success: true, path: '/' + cleanPath };
  } catch (error) {
    console.error('Erreur createFolder S3:', error);
    throw error;
  }
};

/**
 * Upload un fichier vers S3
 */
export const uploadFile = async (localFilePath, remotePath, fileName) => {
  try {
    const client = await createS3Client();
    if (!client) {
      throw new Error('S3 non configuré');
    }
    
    const bucketSetting = await Settings.findOne({ key: CONFIG_KEYS.bucket });
    if (!bucketSetting?.value) {
      throw new Error('Bucket non configuré');
    }
    
    // Construire la clé S3
    let key = remotePath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (key) {
      key += '/';
    }
    key += fileName;
    
    // Lire le fichier
    const fileContent = fs.readFileSync(localFilePath);
    const contentType = getContentType(fileName);
    
    await client.send(new PutObjectCommand({
      Bucket: bucketSetting.value,
      Key: key,
      Body: fileContent,
      ContentType: contentType
    }));
    
    return {
      success: true,
      key,
      bucket: bucketSetting.value
    };
  } catch (error) {
    console.error('Erreur uploadFile S3:', error);
    throw error;
  }
};

/**
 * Déterminer le content-type d'un fichier
 */
const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain'
  };
  return types[ext] || 'application/octet-stream';
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
  
  let remotePath = (basePathSetting?.value || 'GED-Courrier').replace(/^\/+/, '').replace(/\/+$/, '');
  
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
 * Synchroniser un courrier archivé vers S3
 */
export const syncArchivedMail = async (mail, localFilePath) => {
  try {
    // Vérifier si S3 est activé
    const enabledSetting = await Settings.findOne({ key: CONFIG_KEYS.enabled });
    if (!enabledSetting?.value) {
      return { synced: false, reason: 'S3 désactivé' };
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
      type: 's3',
      path: remotePath + '/' + mail.fileName,
      key: result.key,
      localDeleted: shouldDeleteLocal,
      syncedAt: new Date()
    };
    
    // Supprimer le fichier local si l'option est activée
    if (shouldDeleteLocal) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`📁 Fichier local supprimé après sync S3: ${localFilePath}`);
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
            const responseResult = await uploadFile(responseLocalPath, remotePath, response.fileName);
            
            // Mettre à jour la réponse avec les infos du stockage externe
            response.externalStorage = {
              type: 's3',
              path: remotePath + '/' + response.fileName,
              key: responseResult.key,
              localDeleted: shouldDeleteLocal,
              syncedAt: new Date()
            };
            
            // Supprimer le fichier de réponse local si l'option est activée
            if (shouldDeleteLocal) {
              try {
                fs.unlinkSync(responseLocalPath);
                console.log(`📁 Fichier réponse local supprimé après sync S3: ${responseLocalPath}`);
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
      key: result.key,
      bucket: result.bucket,
      localDeleted: shouldDeleteLocal
    };
  } catch (error) {
    console.error('Erreur syncArchivedMail S3:', error);
    return {
      synced: false,
      error: error.message
    };
  }
};

/**
 * Déconnecter S3 (supprimer les credentials)
 */
export const disconnect = async () => {
  await Promise.all([
    Settings.findOneAndUpdate(
      { key: CONFIG_KEYS.enabled },
      { value: false },
      { upsert: true }
    ),
    Settings.findOneAndDelete({ key: CONFIG_KEYS.accessKeyId }),
    Settings.findOneAndDelete({ key: CONFIG_KEYS.secretAccessKey })
  ]);
  
  return { success: true };
};

export default {
  getS3Settings,
  saveS3Settings,
  getStatus,
  testConnection,
  listObjects,
  createFolder,
  uploadFile,
  syncArchivedMail,
  disconnect
};
