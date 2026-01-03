import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { Settings } from '../models/index.js';

// État du service OneDrive
let onedriveStatus = {
  connected: false,
  lastSync: null,
  lastError: null,
  tokenExpiry: null
};

// Cache du token d'accès
let accessToken = null;
let refreshToken = null;

/**
 * Récupérer les paramètres OneDrive depuis la base de données
 */
export const getOneDriveSettings = async () => {
  try {
    const settings = await Settings.find({ key: { $regex: /^onedrive_/ } });
    const config = {};
    
    settings.forEach(s => {
      const key = s.key.replace('onedrive_', '');
      let value = s.value;
      
      // Convertir les booléens
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      
      config[key] = value;
    });
    
    return config;
  } catch (error) {
    console.error('Erreur récupération paramètres OneDrive:', error);
    return null;
  }
};

/**
 * Sauvegarder un paramètre OneDrive
 */
export const saveOneDriveSetting = async (key, value, isSecret = false) => {
  try {
    await Settings.findOneAndUpdate(
      { key: `onedrive_${key}` },
      { 
        key: `onedrive_${key}`, 
        value: String(value), 
        category: 'onedrive',
        isSecret 
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Erreur sauvegarde paramètre OneDrive:', error);
    throw error;
  }
};

/**
 * Générer l'URL d'autorisation OAuth
 */
export const getAuthorizationUrl = async (redirectUri) => {
  const settings = await getOneDriveSettings();
  
  if (!settings?.clientId || !settings?.tenantId) {
    throw new Error('Configuration OneDrive incomplète (Client ID ou Tenant ID manquant)');
  }
  
  const authUrl = new URL(`https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.append('client_id', settings.clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', 'Files.ReadWrite.All offline_access');
  authUrl.searchParams.append('response_mode', 'query');
  
  return authUrl.toString();
};

/**
 * Échanger le code d'autorisation contre un token
 */
export const exchangeCodeForToken = async (code, redirectUri) => {
  const settings = await getOneDriveSettings();
  
  if (!settings?.clientId || !settings?.clientSecret || !settings?.tenantId) {
    throw new Error('Configuration OneDrive incomplète');
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', settings.clientId);
  params.append('client_secret', settings.clientSecret);
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');
  params.append('scope', 'Files.ReadWrite.All offline_access');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || 'Erreur d\'authentification OneDrive');
  }
  
  // Sauvegarder les tokens
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  
  await saveOneDriveSetting('accessToken', data.access_token, true);
  await saveOneDriveSetting('refreshToken', data.refresh_token, true);
  await saveOneDriveSetting('tokenExpiry', Date.now() + (data.expires_in * 1000));
  await saveOneDriveSetting('connected', 'true');
  
  onedriveStatus.connected = true;
  onedriveStatus.tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return { success: true };
};

/**
 * Rafraîchir le token d'accès
 */
export const refreshAccessToken = async () => {
  const settings = await getOneDriveSettings();
  
  if (!settings?.refreshToken) {
    throw new Error('Aucun refresh token disponible');
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', settings.clientId);
  params.append('client_secret', settings.clientSecret);
  params.append('refresh_token', settings.refreshToken);
  params.append('grant_type', 'refresh_token');
  params.append('scope', 'Files.ReadWrite.All offline_access');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    onedriveStatus.connected = false;
    await saveOneDriveSetting('connected', 'false');
    throw new Error(data.error_description || 'Erreur de rafraîchissement du token');
  }
  
  accessToken = data.access_token;
  if (data.refresh_token) {
    refreshToken = data.refresh_token;
    await saveOneDriveSetting('refreshToken', data.refresh_token, true);
  }
  
  await saveOneDriveSetting('accessToken', data.access_token, true);
  await saveOneDriveSetting('tokenExpiry', Date.now() + (data.expires_in * 1000));
  
  onedriveStatus.tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return data.access_token;
};

/**
 * Obtenir un token d'accès valide
 */
const getValidToken = async () => {
  const settings = await getOneDriveSettings();
  
  if (!settings?.accessToken) {
    throw new Error('Non connecté à OneDrive');
  }
  
  // Vérifier si le token est expiré (avec 5 minutes de marge)
  const tokenExpiry = parseInt(settings.tokenExpiry) || 0;
  if (Date.now() > tokenExpiry - 300000) {
    return await refreshAccessToken();
  }
  
  return settings.accessToken;
};

/**
 * Tester la connexion OneDrive
 */
export const testConnection = async () => {
  try {
    const token = await getValidToken();
    
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur de connexion');
    }
    
    const data = await response.json();
    
    onedriveStatus.connected = true;
    onedriveStatus.lastError = null;
    
    return {
      success: true,
      driveType: data.driveType,
      quota: {
        used: data.quota?.used,
        total: data.quota?.total,
        remaining: data.quota?.remaining
      },
      owner: data.owner?.user?.displayName
    };
  } catch (error) {
    onedriveStatus.connected = false;
    onedriveStatus.lastError = error.message;
    throw error;
  }
};

/**
 * Lister les dossiers OneDrive
 */
export const listFolders = async (parentPath = 'root') => {
  const token = await getValidToken();
  
  let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
  if (parentPath !== 'root') {
    url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(parentPath)}:/children`;
  }
  
  const response = await fetch(`${url}?$filter=folder ne null&$select=id,name,folder,parentReference`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur de listage des dossiers');
  }
  
  const data = await response.json();
  
  return data.value.map(item => ({
    id: item.id,
    name: item.name,
    path: item.parentReference?.path ? 
      `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}` : 
      `/${item.name}`,
    hasChildren: item.folder?.childCount > 0
  }));
};

/**
 * Créer un dossier sur OneDrive
 */
export const createFolder = async (parentPath, folderName) => {
  const token = await getValidToken();
  
  let url = 'https://graph.microsoft.com/v1.0/me/drive/root/children';
  if (parentPath && parentPath !== '/' && parentPath !== 'root') {
    url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(parentPath)}:/children`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur de création du dossier');
  }
  
  return await response.json();
};

/**
 * Uploader un fichier sur OneDrive
 */
export const uploadFile = async (localFilePath, onedrivePath) => {
  const token = await getValidToken();
  const settings = await getOneDriveSettings();
  
  if (!settings?.enabled) {
    return { success: false, message: 'OneDrive désactivé' };
  }
  
  // Lire le fichier
  const fileContent = fs.readFileSync(localFilePath);
  const fileName = path.basename(localFilePath);
  const fileSize = fs.statSync(localFilePath).size;
  
  // Pour les fichiers < 4MB, upload simple
  if (fileSize < 4 * 1024 * 1024) {
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(onedrivePath)}/${encodeURIComponent(fileName)}:/content`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileContent
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur d\'upload');
    }
    
    const data = await response.json();
    
    onedriveStatus.lastSync = new Date();
    
    return {
      success: true,
      fileId: data.id,
      webUrl: data.webUrl,
      size: data.size
    };
  } else {
    // Pour les gros fichiers, utiliser l'upload par session
    // Créer une session d'upload
    const sessionUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(onedrivePath)}/${encodeURIComponent(fileName)}:/createUploadSession`;
    
    const sessionResponse = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename'
        }
      })
    });
    
    if (!sessionResponse.ok) {
      throw new Error('Erreur de création de session d\'upload');
    }
    
    const session = await sessionResponse.json();
    const uploadUrl = session.uploadUrl;
    
    // Upload par chunks de 10MB
    const chunkSize = 10 * 1024 * 1024;
    let start = 0;
    
    while (start < fileSize) {
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = fileContent.slice(start, end);
      
      const chunkResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length,
          'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`
        },
        body: chunk
      });
      
      if (!chunkResponse.ok && chunkResponse.status !== 202) {
        throw new Error('Erreur d\'upload du chunk');
      }
      
      start = end;
    }
    
    onedriveStatus.lastSync = new Date();
    
    return { success: true };
  }
};

/**
 * Synchroniser un courrier archivé vers OneDrive
 */
export const syncArchivedMail = async (mail, localFilePath) => {
  const settings = await getOneDriveSettings();
  
  if (!settings?.enabled || !settings?.syncArchived) {
    return { skipped: true, reason: 'Synchronisation des archives désactivée' };
  }
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(localFilePath)) {
    return { synced: false, reason: 'Fichier local introuvable' };
  }
  
  // Vérifier si on doit supprimer le fichier local après sync
  const shouldDeleteLocal = settings?.deleteLocalAfterSync === true || settings?.deleteLocalAfterSync === 'true';
  
  // Construire le chemin OneDrive
  let targetPath = settings.targetFolder || 'GED-Courrier/Archives';
  
  // Ajouter la structure de dossiers si configurée
  if (settings.createServiceFolders && mail.service?.name) {
    const serviceName = mail.service.name.replace(/[<>:"/\\|?*]/g, '_');
    targetPath = `${targetPath}/${serviceName}`;
  }
  
  if (settings.createYearFolders) {
    const year = new Date(mail.archivedDate || mail.receivedDate).getFullYear();
    targetPath = `${targetPath}/${year}`;
  }
  
  if (settings.createMonthFolders) {
    const date = new Date(mail.archivedDate || mail.receivedDate);
    const months = ['01 - Janvier', '02 - Février', '03 - Mars', '04 - Avril', '05 - Mai', '06 - Juin',
                    '07 - Juillet', '08 - Août', '09 - Septembre', '10 - Octobre', '11 - Novembre', '12 - Décembre'];
    targetPath = `${targetPath}/${months[date.getMonth()]}`;
  }
  
  try {
    // Créer les dossiers si nécessaire (l'API OneDrive le fait automatiquement)
    const result = await uploadFile(localFilePath, targetPath);
    
    // Mettre à jour le modèle Mail avec les infos du stockage externe
    mail.externalStorage = {
      type: 'onedrive',
      path: targetPath + '/' + mail.fileName,
      key: result.id || null, // ID OneDrive du fichier
      localDeleted: shouldDeleteLocal,
      syncedAt: new Date()
    };
    
    // Supprimer le fichier local si l'option est activée
    if (shouldDeleteLocal) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`📁 Fichier local supprimé après sync OneDrive: ${localFilePath}`);
      } catch (deleteError) {
        console.error('Erreur suppression fichier local:', deleteError.message);
      }
    }
    
    // Sync des fichiers de réponse si activé
    if (settings?.syncResponses && mail.responses?.length > 0) {
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      
      for (const response of mail.responses) {
        if (response.filePath) {
          const responseLocalPath = path.join(uploadPath, response.filePath);
          if (fs.existsSync(responseLocalPath)) {
            const responseResult = await uploadFile(responseLocalPath, targetPath);
            
            // Mettre à jour la réponse avec les infos du stockage externe
            response.externalStorage = {
              type: 'onedrive',
              path: targetPath + '/' + response.fileName,
              key: responseResult.id || null,
              localDeleted: shouldDeleteLocal,
              syncedAt: new Date()
            };
            
            // Supprimer le fichier de réponse local si l'option est activée
            if (shouldDeleteLocal) {
              try {
                fs.unlinkSync(responseLocalPath);
                console.log(`📁 Fichier réponse local supprimé après sync OneDrive: ${responseLocalPath}`);
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
      success: true,
      path: targetPath,
      id: result.id,
      localDeleted: shouldDeleteLocal
    };
  } catch (error) {
    console.error('Erreur sync OneDrive:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Déconnecter OneDrive
 */
export const disconnect = async () => {
  await saveOneDriveSetting('connected', 'false');
  await saveOneDriveSetting('accessToken', '');
  await saveOneDriveSetting('refreshToken', '');
  await saveOneDriveSetting('tokenExpiry', '0');
  
  accessToken = null;
  refreshToken = null;
  onedriveStatus.connected = false;
  
  return { success: true };
};

/**
 * Obtenir le statut du service
 */
export const getStatus = async () => {
  const settings = await getOneDriveSettings();
  
  return {
    enabled: settings?.enabled === true || settings?.enabled === 'true',
    connected: settings?.connected === true || settings?.connected === 'true',
    lastSync: onedriveStatus.lastSync,
    lastError: onedriveStatus.lastError,
    syncArchived: settings?.syncArchived === true || settings?.syncArchived === 'true',
    syncResponses: settings?.syncResponses === true || settings?.syncResponses === 'true',
    targetFolder: settings?.targetFolder || 'GED-Courrier/Archives'
  };
};

export default {
  getOneDriveSettings,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  testConnection,
  listFolders,
  createFolder,
  uploadFile,
  syncArchivedMail,
  disconnect,
  getStatus
};
