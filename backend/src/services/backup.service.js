import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { createClient } from 'webdav';
import { Settings } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUploadPath = () => process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
const getBackupDir = () => path.join(getUploadPath(), 'backups');

let scheduledTask = null;

const ensureBackupDir = () => {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const ensureBackupDirPublic = ensureBackupDir;

const exportAllCollections = async () => {
  const collections = {};
  const allCollections = await mongoose.connection.db.listCollections().toArray();
  for (const col of allCollections) {
    const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
    collections[col.name] = docs;
  }
  return collections;
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
};

/**
 * Crée une sauvegarde complète (base de données + fichiers)
 */
export const createBackup = async ({ includeFiles = true, label = '' } = {}) => {
  ensureBackupDir();

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeLbl = label ? '-' + label.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) : '';
  const filename = `backup-${dateStr}${safeLbl}.zip`;
  const backupPath = path.join(getBackupDir(), filename);

  const collections = await exportAllCollections();

  const stats = {
    courriers: collections.mails?.length ?? 0,
    'courriers en attente': collections.pendingmails?.length ?? 0,
    expediteurs: collections.senders?.length ?? 0,
    objets: collections.subjects?.length ?? 0,
    services: collections.services?.length ?? 0,
    utilisateurs: collections.users?.length ?? 0,
    groupes: collections.groups?.length ?? 0,
    'modèles mail': collections.emailtemplates?.length ?? 0,
    paramètres: collections.settings?.length ?? 0,
  };

  const manifest = {
    version: '1.0',
    createdAt: now.toISOString(),
    includesFiles: includeFiles,
    collections: Object.keys(collections),
    stats,
    appVersion: await Settings.getValue('app_version', '1.0.0'),
  };

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // EJSON préserve les types BSON (ObjectId, Date…) pour une restauration fidèle
    for (const [name, docs] of Object.entries(collections)) {
      archive.append(EJSON.stringify(docs, null, 2), { name: `db/${name}.json` });
    }

    if (includeFiles) {
      const uploadPath = getUploadPath();
      // Inclure tous les sous-dossiers d'uploads sauf "backups" (évite la récursion)
      const entries = fs.readdirSync(uploadPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'backups') {
          archive.directory(path.join(uploadPath, entry.name), `files/${entry.name}`);
        }
      }
    }

    archive.finalize();
  });

  const fileStats = fs.statSync(backupPath);

  return {
    filename,
    size: fileStats.size,
    sizeFormatted: formatSize(fileStats.size),
    createdAt: now.toISOString(),
    manifest,
  };
};

/**
 * Liste les sauvegardes disponibles
 */
export const listBackups = () => {
  const dir = ensureBackupDir();
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const filePath = path.join(dir, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Supprime une sauvegarde
 */
export const deleteBackup = (filename) => {
  const safe = path.basename(filename);
  if (!safe.endsWith('.zip')) throw new Error('Fichier invalide');
  const filePath = path.join(getBackupDir(), safe);
  if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable');
  fs.unlinkSync(filePath);
};

/**
 * Vérifie l'intégrité d'une sauvegarde
 */
export const verifyBackup = (filename) => {
  const safe = path.basename(filename);
  if (!safe.endsWith('.zip')) throw new Error('Fichier invalide');

  const filePath = path.join(getBackupDir(), safe);
  if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable');

  const fileStats = fs.statSync(filePath);
  if (fileStats.size === 0) throw new Error('Fichier vide');

  // Vérification des magic bytes ZIP (PK\x03\x04)
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);

  if (!(buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04)) {
    throw new Error('Format ZIP invalide (signature incorrecte)');
  }

  // Vérification du contenu avec AdmZip
  const zip = new AdmZip(filePath);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) throw new Error('manifest.json manquant dans l\'archive');

  const manifest = JSON.parse(zip.readAsText(manifestEntry));

  const missingCollections = (manifest.collections || []).filter(
    col => !zip.getEntry(`db/${col}.json`)
  );

  const entries = zip.getEntries();
  const fileCount = entries.filter(e => e.entryName.startsWith('files/')).length;

  return {
    valid: true,
    filename: safe,
    size: fileStats.size,
    sizeFormatted: formatSize(fileStats.size),
    manifest,
    missingCollections,
    fileCount,
    entryCount: entries.length,
  };
};

/**
 * Restaure une sauvegarde (écrase les données courantes)
 */
export const restoreBackup = async (filename) => {
  const safe = path.basename(filename);
  if (!safe.endsWith('.zip')) throw new Error('Fichier invalide');

  const filePath = path.join(getBackupDir(), safe);
  if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable');

  const zip = new AdmZip(filePath);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) throw new Error('Archive invalide : manifest.json manquant');

  const manifest = JSON.parse(zip.readAsText(manifestEntry));
  const restoredCollections = {};

  for (const colName of (manifest.collections || [])) {
    const entry = zip.getEntry(`db/${colName}.json`);
    if (!entry) continue;

    const raw = zip.readAsText(entry);
    // EJSON.parse restaure les vrais types BSON (ObjectId, Date…)
    // On retombe sur JSON.parse pour les vieilles sauvegardes sans EJSON
    let docs;
    try {
      docs = EJSON.parse(raw);
    } catch {
      docs = JSON.parse(raw);
    }
    if (!Array.isArray(docs)) continue;

    const col = mongoose.connection.db.collection(colName);
    await col.deleteMany({});

    if (docs.length > 0) {
      await col.insertMany(docs, { ordered: false });
    }

    restoredCollections[colName] = docs.length;
  }

  let restoredFiles = 0;
  if (manifest.includesFiles) {
    const uploadPath = getUploadPath();
    const fileEntries = zip.getEntries().filter(
      e => e.entryName.startsWith('files/') && !e.isDirectory
    );

    for (const entry of fileEntries) {
      const relativePath = entry.entryName.replace('files/', '');
      const destPath = path.join(uploadPath, relativePath);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
      restoredFiles++;
    }
  }

  return {
    collections: restoredCollections,
    filesRestored: restoredFiles,
    manifest,
  };
};

/**
 * Envoie une sauvegarde vers NextCloud
 */
export const uploadToNextCloud = async (filename) => {
  const enabled = await Settings.getValue('storage_nextcloud_enabled', false);
  const serverUrl = await Settings.getValue('storage_nextcloud_serverUrl');
  const username = await Settings.getValue('storage_nextcloud_username');
  const password = await Settings.getValue('storage_nextcloud_password');

  if (!enabled || !serverUrl || !username || !password) {
    throw new Error('NextCloud non configuré ou désactivé');
  }

  const basePath = await Settings.getValue('storage_nextcloud_basePath', 'GED-Courrier');
  const backupFolder = `${basePath}/Sauvegardes`;
  const safe = path.basename(filename);
  const filePath = path.join(getBackupDir(), safe);

  if (!fs.existsSync(filePath)) throw new Error('Fichier de sauvegarde introuvable');

  const client = createClient(serverUrl, { username, password });

  try {
    await client.createDirectory(backupFolder, { recursive: true });
  } catch (_) {
    // Dossier déjà existant
  }

  const fileContent = fs.readFileSync(filePath);
  await client.putFileContents(`${backupFolder}/${safe}`, fileContent, { overwrite: true });

  return { success: true, remotePath: `${backupFolder}/${safe}` };
};

/**
 * Envoie un rapport de sauvegarde par email
 */
export const sendBackupReport = async ({ success, filename, size, stats, error, destination } = {}) => {
  const smtpHost = await Settings.getValue('smtp_host');
  const recipients = await Settings.getValue('backup_email_recipients', '');

  if (!smtpHost || !recipients) return;

  const smtpPort = await Settings.getValue('smtp_port', 587);
  const smtpUser = await Settings.getValue('smtp_user');
  const smtpPassword = await Settings.getValue('smtp_password');
  const smtpFrom = await Settings.getValue('smtp_from', smtpUser);
  const smtpSecure = await Settings.getValue('smtp_secure', false);
  const appName = await Settings.getValue('app_name', 'GED Courrier');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: smtpSecure === 'true' || smtpSecure === true,
    auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
  });

  const now = new Date().toLocaleString('fr-FR');
  const statusColor = success ? '#16a34a' : '#dc2626';
  const statusIcon = success ? '✅' : '❌';
  const statusText = success ? 'Réussie' : 'Échouée';
  const sizeStr = size ? formatSize(size) : 'N/A';

  const statsRows = stats
    ? Object.entries(stats)
        .map(([k, v]) => `<tr><td style="padding:6px 16px;color:#374151">${k}</td><td style="padding:6px 16px;font-weight:600">${v}</td></tr>`)
        .join('')
    : '';

  const html = `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px">
  <h2 style="color:${statusColor};margin-top:0">${statusIcon} Rapport de sauvegarde — ${statusText}</h2>
  <table style="border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:16px">
    <tr style="background:#f3f4f6"><td style="padding:8px 16px;color:#6b7280;font-size:13px">Application</td><td style="padding:8px 16px;font-weight:600">${appName}</td></tr>
    <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px">Date</td><td style="padding:8px 16px">${now}</td></tr>
    <tr style="background:#f3f4f6"><td style="padding:8px 16px;color:#6b7280;font-size:13px">Fichier</td><td style="padding:8px 16px;font-family:monospace;font-size:12px">${filename ?? 'N/A'}</td></tr>
    <tr><td style="padding:8px 16px;color:#6b7280;font-size:13px">Taille</td><td style="padding:8px 16px">${sizeStr}</td></tr>
    <tr style="background:#f3f4f6"><td style="padding:8px 16px;color:#6b7280;font-size:13px">Destination</td><td style="padding:8px 16px">${destination ?? 'Local'}</td></tr>
    ${error ? `<tr><td style="padding:8px 16px;color:#dc2626;font-size:13px">Erreur</td><td style="padding:8px 16px;color:#dc2626">${error}</td></tr>` : ''}
  </table>
  ${statsRows ? `
  <h3 style="color:#111827">Données sauvegardées</h3>
  <table style="border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden">
    <tr style="background:#e0f2fe"><th style="padding:8px 16px;text-align:left;color:#0369a1">Élément</th><th style="padding:8px 16px;text-align:left;color:#0369a1">Quantité</th></tr>
    ${statsRows}
  </table>` : ''}
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">Ce message est automatique, merci de ne pas y répondre.</p>
</div>`;

  const toList = recipients.split(',').map(e => e.trim()).filter(Boolean);

  await transporter.sendMail({
    from: `${appName} <${smtpFrom}>`,
    to: toList,
    subject: `[${appName}] Sauvegarde ${statusText} — ${now}`,
    html,
  });
};

/**
 * Récupère la configuration de sauvegarde automatique
 */
export const getBackupConfig = async () => {
  const keys = {
    auto_enabled: 'backup_auto_enabled',
    schedule: 'backup_schedule',
    max_local: 'backup_max_local',
    include_files: 'backup_include_files',
    nextcloud_enabled: 'backup_nextcloud_upload',
    email_report: 'backup_email_report',
    email_recipients: 'backup_email_recipients',
  };

  const config = {};
  for (const [field, dbKey] of Object.entries(keys)) {
    const setting = await Settings.findOne({ key: dbKey });
    config[field] = setting?.value ?? null;
  }

  return {
    auto_enabled: config.auto_enabled ?? false,
    schedule: config.schedule ?? '0 2 * * *',
    max_local: config.max_local ?? 10,
    include_files: config.include_files !== false,
    nextcloud_enabled: config.nextcloud_enabled ?? false,
    email_report: config.email_report ?? false,
    email_recipients: config.email_recipients ?? '',
  };
};

/**
 * Sauvegarde la configuration de sauvegarde automatique
 */
export const saveBackupConfig = async (config) => {
  const map = {
    auto_enabled: 'backup_auto_enabled',
    schedule: 'backup_schedule',
    max_local: 'backup_max_local',
    include_files: 'backup_include_files',
    nextcloud_enabled: 'backup_nextcloud_upload',
    email_report: 'backup_email_report',
    email_recipients: 'backup_email_recipients',
  };

  const updates = Object.entries(map)
    .filter(([key]) => config[key] !== undefined)
    .map(([key, dbKey]) =>
      Settings.findOneAndUpdate(
        { key: dbKey },
        { key: dbKey, value: config[key], category: 'backup' },
        { upsert: true, new: true }
      )
    );

  await Promise.all(updates);
  await initBackupScheduler();
  return getBackupConfig();
};

const cleanupOldBackups = async () => {
  const maxLocal = await Settings.getValue('backup_max_local', 10);
  const max = Math.max(1, parseInt(maxLocal) || 10);
  const backups = listBackups();

  if (backups.length > max) {
    for (const backup of backups.slice(max)) {
      try {
        fs.unlinkSync(path.join(getBackupDir(), backup.filename));
        console.log(`🗑️ Ancienne sauvegarde supprimée: ${backup.filename}`);
      } catch (e) {
        console.error(`Erreur suppression ${backup.filename}:`, e.message);
      }
    }
  }
};

const runAutoBackup = async () => {
  const config = await getBackupConfig();
  let result = null;
  let destination = 'Local';

  try {
    console.log('⏰ Démarrage de la sauvegarde automatique...');
    result = await createBackup({ includeFiles: config.include_files });

    if (config.nextcloud_enabled) {
      try {
        await uploadToNextCloud(result.filename);
        destination = 'Local + NextCloud';
      } catch (e) {
        console.error('Erreur upload NextCloud (sauvegarde locale conservée):', e.message);
      }
    }

    await cleanupOldBackups();
    console.log(`✅ Sauvegarde automatique réussie: ${result.filename}`);

    if (config.email_report) {
      try {
        await sendBackupReport({
          success: true,
          filename: result.filename,
          size: result.size,
          stats: result.manifest.stats,
          destination,
        });
      } catch (e) {
        console.error('Erreur envoi rapport:', e.message);
      }
    }
  } catch (err) {
    console.error('❌ Erreur sauvegarde automatique:', err.message);

    if (config.email_report) {
      try {
        await sendBackupReport({ success: false, error: err.message, destination });
      } catch (e) {
        console.error('Erreur envoi rapport d\'erreur:', e.message);
      }
    }
  }
};

/**
 * Initialise le planificateur de sauvegardes automatiques
 */
export const initBackupScheduler = async () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const config = await getBackupConfig();

  if (!config.auto_enabled) {
    console.log('📦 Sauvegarde automatique désactivée');
    return;
  }

  const schedule = config.schedule || '0 2 * * *';

  if (!cron.validate(schedule)) {
    console.error(`❌ Expression cron invalide: ${schedule}`);
    return;
  }

  scheduledTask = cron.schedule(schedule, runAutoBackup, { timezone: 'Europe/Paris' });
  console.log(`📦 Sauvegarde automatique activée (${schedule})`);
};
