import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { Settings, Mail, OutgoingMail } from '../models/index.js';
import { createNextCloudClient, uploadFile as nextcloudUploadFile } from './nextcloud.service.js';

const uploadPath = process.env.UPLOAD_PATH || './uploads';

// --- Configuration keys (same pattern as nextcloud.service.js) ---

const CONFIG_KEYS = {
  enabled: 'excel_register_enabled',
  templatePath: 'excel_register_templatePath',
  templateSource: 'excel_register_templateSource',
  nextcloudTemplatePath: 'excel_register_nextcloudTemplatePath',
  incomingSheetName: 'excel_register_incomingSheetName',
  outgoingSheetName: 'excel_register_outgoingSheetName',
  incomingStartRow: 'excel_register_incomingStartRow',
  outgoingStartRow: 'excel_register_outgoingStartRow',
  incomingMapping: 'excel_register_incomingMapping',
  outgoingMapping: 'excel_register_outgoingMapping',
  dateFormat: 'excel_register_dateFormat',
  debounceDelay: 'excel_register_debounceDelay',
  autoSaveToNextCloud: 'excel_register_autoSaveToNextCloud',
  nextcloudOutputPath: 'excel_register_nextcloudOutputPath',
  outputFileName: 'excel_register_outputFileName',
  lastUpdateDate: 'excel_register_lastUpdateDate',
  appBaseUrl: 'excel_register_appBaseUrl'
};

const DEFAULTS = {
  incomingSheetName: 'Courrier Arrivé',
  outgoingSheetName: 'Courrier Départ',
  incomingStartRow: 2,
  outgoingStartRow: 2,
  dateFormat: 'DD/MM/YYYY',
  debounceDelay: 30,
  outputFileName: 'Registre-Courrier-{YEAR}'
};

// --- Available fields for mapping ---

const INCOMING_FIELDS = [
  { key: 'reference', label: 'Référence', type: 'string' },
  { key: 'subject', label: 'Objet', type: 'string' },
  { key: 'senderName', label: 'Nom expéditeur', type: 'string' },
  { key: 'senderOrganization', label: 'Organisation expéditeur', type: 'string' },
  { key: 'senderEmail', label: 'Email expéditeur', type: 'string' },
  { key: 'senderPhone', label: 'Téléphone expéditeur', type: 'string' },
  { key: 'recipientFullName', label: 'Destinataire', type: 'string' },
  { key: 'recipientsCopyNames', label: 'Destinataires en copie', type: 'string' },
  { key: 'serviceName', label: 'Service', type: 'string' },
  { key: 'receivedDate', label: 'Date de réception', type: 'date' },
  { key: 'importedDate', label: "Date d'import", type: 'date' },
  { key: 'processedDate', label: 'Date de traitement', type: 'date' },
  { key: 'archivedDate', label: "Date d'archivage", type: 'date' },
  { key: 'status', label: 'Statut', type: 'string' },
  { key: 'priority', label: 'Priorité', type: 'string' },
  { key: 'hasResponse', label: 'A une réponse', type: 'boolean' },
  { key: 'responsesCount', label: 'Nombre de réponses', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'string' },
  { key: 'tags', label: 'Tags', type: 'string' },
  { key: 'source', label: 'Source', type: 'string' },
  { key: 'fileName', label: 'Nom du fichier', type: 'string' },
  { key: 'appLink', label: "Lien vers l'application", type: 'link' },
  { key: 'filePath', label: 'Chemin du fichier', type: 'string' }
];

const OUTGOING_FIELDS = [
  { key: 'reference', label: 'Référence', type: 'string' },
  { key: 'subject', label: 'Objet', type: 'string' },
  { key: 'destinationName', label: 'Nom destinataire', type: 'string' },
  { key: 'destinationOrganization', label: 'Organisation destinataire', type: 'string' },
  { key: 'senderFullName', label: 'Expéditeur (agent)', type: 'string' },
  { key: 'serviceName', label: 'Service', type: 'string' },
  { key: 'status', label: 'Statut', type: 'string' },
  { key: 'priority', label: 'Priorité', type: 'string' },
  { key: 'sentDate', label: "Date d'envoi", type: 'date' },
  { key: 'createdAt', label: 'Date de création', type: 'date' },
  { key: 'archivedDate', label: "Date d'archivage", type: 'date' },
  { key: 'sendingMethod', label: "Mode d'envoi", type: 'string' },
  { key: 'trackingNumber', label: 'Numéro de suivi', type: 'string' },
  { key: 'linkedIncomingRef', label: 'Réf. courrier entrant lié', type: 'string' },
  { key: 'notes', label: 'Notes', type: 'string' },
  { key: 'tags', label: 'Tags', type: 'string' },
  { key: 'fileName', label: 'Nom du fichier', type: 'string' },
  { key: 'appLink', label: "Lien vers l'application", type: 'link' },
  { key: 'filePath', label: 'Chemin du fichier', type: 'string' }
];

const STATUS_LABELS = {
  pending: 'En attente',
  processed: 'Traité',
  archived: 'Archivé',
  draft: 'Brouillon',
  sent: 'Envoyé'
};

const PRIORITY_LABELS = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
};

const SENDING_METHOD_LABELS = {
  courrier: 'Courrier',
  email: 'Email',
  fax: 'Fax',
  main_propre: 'Main propre',
  autre: 'Autre'
};

// --- Settings CRUD ---

export const getExcelSettings = async () => {
  const settings = {};
  for (const [key, dbKey] of Object.entries(CONFIG_KEYS)) {
    const setting = await Settings.findOne({ key: dbKey });
    settings[key] = setting ? setting.value : (DEFAULTS[key] ?? null);
  }
  return settings;
};

export const saveExcelSettings = async (config) => {
  const updates = [];
  for (const [key, value] of Object.entries(config)) {
    const dbKey = CONFIG_KEYS[key];
    if (dbKey && value !== undefined) {
      updates.push(
        Settings.findOneAndUpdate(
          { key: dbKey },
          { key: dbKey, value, category: 'excel' },
          { upsert: true, new: true }
        )
      );
    }
  }
  await Promise.all(updates);
  return getExcelSettings();
};

export const getAvailableFields = (type) => {
  return type === 'outgoing' ? OUTGOING_FIELDS : INCOMING_FIELDS;
};

// --- Field value resolution ---

const formatDate = (date, format) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  switch (format) {
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
    default: return `${day}/${month}/${year}`;
  }
};

const resolveIncomingField = (mail, fieldKey, settings) => {
  switch (fieldKey) {
    case 'reference': return mail.reference || '';
    case 'subject': return mail.subject || '';
    case 'senderName': return mail.senderName || mail.sender?.name || '';
    case 'senderOrganization': return mail.sender?.organization || '';
    case 'senderEmail': return mail.sender?.email || '';
    case 'senderPhone': return mail.sender?.phone || '';
    case 'recipientFullName':
      return mail.recipient ? `${mail.recipient.firstName || ''} ${mail.recipient.lastName || ''}`.trim() : '';
    case 'recipientsCopyNames':
      return (mail.recipientsCopy || [])
        .map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim())
        .filter(Boolean)
        .join(', ');
    case 'serviceName': return mail.service?.name || '';
    case 'receivedDate': return formatDate(mail.receivedDate, settings.dateFormat);
    case 'importedDate': return formatDate(mail.importedDate, settings.dateFormat);
    case 'processedDate': return formatDate(mail.processedDate, settings.dateFormat);
    case 'archivedDate': return formatDate(mail.archivedDate, settings.dateFormat);
    case 'status': return STATUS_LABELS[mail.status] || mail.status || '';
    case 'priority': return PRIORITY_LABELS[mail.priority] || mail.priority || '';
    case 'hasResponse': return mail.hasResponse ? 'Oui' : 'Non';
    case 'responsesCount': return (mail.responses || []).length;
    case 'notes': return mail.notes || '';
    case 'tags': return (mail.tags || []).join(', ');
    case 'source': return mail.source === 'imap' ? 'IMAP' : 'Manuel';
    case 'fileName': return mail.fileName || '';
    case 'appLink': {
      const base = (settings.appBaseUrl || '').replace(/\/+$/, '');
      return base ? `${base}/mails/${mail._id}` : '';
    }
    case 'filePath': {
      if (mail.externalStorage?.path) return mail.externalStorage.path;
      return mail.filePath || '';
    }
    default: return '';
  }
};

const resolveOutgoingField = (mail, fieldKey, settings) => {
  switch (fieldKey) {
    case 'reference': return mail.reference || '';
    case 'subject': return mail.subject || '';
    case 'destinationName': return mail.destinationName || mail.destination?.name || '';
    case 'destinationOrganization': return mail.destination?.organization || '';
    case 'senderFullName':
      return mail.sender ? `${mail.sender.firstName || ''} ${mail.sender.lastName || ''}`.trim() : '';
    case 'serviceName': return mail.service?.name || '';
    case 'status': return STATUS_LABELS[mail.status] || mail.status || '';
    case 'priority': return PRIORITY_LABELS[mail.priority] || mail.priority || '';
    case 'sentDate': return formatDate(mail.sentDate, settings.dateFormat);
    case 'createdAt': return formatDate(mail.createdAt, settings.dateFormat);
    case 'archivedDate': return formatDate(mail.archivedDate, settings.dateFormat);
    case 'sendingMethod': return SENDING_METHOD_LABELS[mail.sendingMethod] || mail.sendingMethod || '';
    case 'trackingNumber': return mail.trackingNumber || '';
    case 'linkedIncomingRef': return mail.linkedIncomingMail?.reference || '';
    case 'notes': return mail.notes || '';
    case 'tags': return (mail.tags || []).join(', ');
    case 'fileName': return mail.fileName || '';
    case 'appLink': {
      const base = (settings.appBaseUrl || '').replace(/\/+$/, '');
      return base ? `${base}/outgoing-mails/${mail._id}` : '';
    }
    case 'filePath': {
      if (mail.externalStorage?.path) return mail.externalStorage.path;
      return mail.filePath || '';
    }
    default: return '';
  }
};

export const resolveFieldValue = (mail, fieldKey, type, settings) => {
  return type === 'outgoing'
    ? resolveOutgoingField(mail, fieldKey, settings)
    : resolveIncomingField(mail, fieldKey, settings);
};

// --- Template loading ---

export const loadTemplate = async (settings) => {
  const workbook = new ExcelJS.Workbook();

  if (settings.templateSource === 'nextcloud' && settings.nextcloudTemplatePath) {
    const client = await createNextCloudClient();
    if (!client) throw new Error('NextCloud non configuré');
    const buffer = await client.getFileContents(settings.nextcloudTemplatePath);
    await workbook.xlsx.load(buffer);
  } else if (settings.templatePath) {
    const fullPath = path.join(uploadPath, settings.templatePath);
    if (!fs.existsSync(fullPath)) throw new Error('Fichier template introuvable');
    await workbook.xlsx.readFile(fullPath);
  } else {
    return null;
  }

  return workbook;
};

// --- Template preview ---

const columnNumberToLetter = (num) => {
  let letter = '';
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
};

export const getTemplatePreview = async () => {
  const settings = await getExcelSettings();
  const workbook = await loadTemplate(settings);
  if (!workbook) return [];

  const sheets = [];
  workbook.eachSheet((worksheet) => {
    const columns = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      columns.push({
        column: columnNumberToLetter(colNumber),
        header: cell.value != null ? String(cell.value) : '',
        colNumber
      });
    });
    sheets.push({ name: worksheet.name, columns });
  });

  return sheets;
};

// --- Register generation (on-demand) ---

const populateIncomingQuery = () => ({
  populate: [
    { path: 'sender', select: 'name organization email phone' },
    { path: 'service', select: 'name' },
    { path: 'recipient', select: 'firstName lastName' },
    { path: 'recipientsCopy', select: 'firstName lastName' },
  ]
});

const populateOutgoingQuery = () => ({
  populate: [
    { path: 'destination', select: 'name organization email phone' },
    { path: 'service', select: 'name' },
    { path: 'sender', select: 'firstName lastName' },
    { path: 'linkedIncomingMail', select: 'reference' },
  ]
});

const fillSheet = (worksheet, mails, mapping, startRow, type, settings) => {
  if (!mapping || Object.keys(mapping).length === 0) return;

  mails.forEach((mail, index) => {
    const row = worksheet.getRow(startRow + index);
    for (const [column, fieldKey] of Object.entries(mapping)) {
      const cell = row.getCell(column);
      const value = resolveFieldValue(mail, fieldKey, type, settings);
      const fieldDef = (type === 'outgoing' ? OUTGOING_FIELDS : INCOMING_FIELDS)
        .find(f => f.key === fieldKey);

      if (fieldDef?.type === 'link' && value) {
        cell.value = { text: value, hyperlink: value };
      } else {
        cell.value = value;
      }
    }
    row.commit();
  });
};

export const generateRegister = async (options = {}) => {
  const {
    dateFrom, dateTo, status, service,
    includeIncoming = true, includeOutgoing = true
  } = options;

  const settings = await getExcelSettings();

  let workbook;
  try {
    workbook = await loadTemplate(settings);
  } catch {
    workbook = null;
  }
  if (!workbook) {
    workbook = new ExcelJS.Workbook();
  }

  if (includeIncoming) {
    const sheetName = settings.incomingSheetName || DEFAULTS.incomingSheetName;
    let sheet = workbook.getWorksheet(sheetName);
    if (!sheet) sheet = workbook.addWorksheet(sheetName);

    const query = {};
    if (status) query.status = status;
    if (service) query.service = service;
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) query.receivedDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = end;
      }
    }

    const { populate } = populateIncomingQuery();
    const mails = await Mail.find(query).populate(populate).sort({ receivedDate: 1 });
    const startRow = parseInt(settings.incomingStartRow) || DEFAULTS.incomingStartRow;
    fillSheet(sheet, mails, settings.incomingMapping || {}, startRow, 'incoming', settings);
  }

  if (includeOutgoing) {
    const sheetName = settings.outgoingSheetName || DEFAULTS.outgoingSheetName;
    let sheet = workbook.getWorksheet(sheetName);
    if (!sheet) sheet = workbook.addWorksheet(sheetName);

    const query = {};
    if (status) query.status = status;
    if (service) query.service = service;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const { populate } = populateOutgoingQuery();
    const mails = await OutgoingMail.find(query).populate(populate).sort({ createdAt: 1 });
    const startRow = parseInt(settings.outgoingStartRow) || DEFAULTS.outgoingStartRow;
    fillSheet(sheet, mails, settings.outgoingMapping || {}, startRow, 'outgoing', settings);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  if (settings.autoSaveToNextCloud && settings.nextcloudOutputPath) {
    try {
      await saveToNextCloud(Buffer.from(buffer), settings);
    } catch (err) {
      console.error('Erreur sauvegarde registre NextCloud:', err.message);
    }
  }

  return Buffer.from(buffer);
};

// --- NextCloud output ---

const saveToNextCloud = async (buffer, settings) => {
  const fileName = (settings.outputFileName || DEFAULTS.outputFileName)
    .replace('{YEAR}', new Date().getFullYear())
    .replace('{DATE}', new Date().toISOString().slice(0, 10)) + '.xlsx';

  const tempDir = path.join(uploadPath, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `register-${Date.now()}.xlsx`);
  fs.writeFileSync(tempPath, buffer);

  try {
    await nextcloudUploadFile(tempPath, settings.nextcloudOutputPath, fileName);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

// --- Automatic update queue with debounce ---

let pendingUpdates = [];
let debounceTimer = null;
let isProcessing = false;

export const queueRegisterUpdate = async (mailType, mailId) => {
  try {
    const enabled = await Settings.getValue('excel_register_enabled', false);
    if (!enabled) return;
  } catch {
    return;
  }

  pendingUpdates.push({ mailType, mailId, addedAt: new Date() });

  if (debounceTimer) clearTimeout(debounceTimer);

  Settings.getValue('excel_register_debounceDelay', DEFAULTS.debounceDelay)
    .then(delay => {
      const delayMs = (parseInt(delay) || DEFAULTS.debounceDelay) * 1000;
      debounceTimer = setTimeout(() => processRegisterQueue(), delayMs);
    })
    .catch(() => {
      debounceTimer = setTimeout(() => processRegisterQueue(), DEFAULTS.debounceDelay * 1000);
    });
};

const getRegisterFilePath = () => {
  const dir = path.join(uploadPath, 'registers');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `registre-courrier-${new Date().getFullYear()}.xlsx`);
};

const processRegisterQueue = async () => {
  if (isProcessing) return;
  if (pendingUpdates.length === 0) return;

  isProcessing = true;
  const batch = [...pendingUpdates];
  pendingUpdates = [];

  try {
    const settings = await getExcelSettings();
    const registerPath = getRegisterFilePath();

    let workbook;
    if (fs.existsSync(registerPath)) {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(registerPath);
    } else {
      try {
        workbook = await loadTemplate(settings);
      } catch {
        workbook = null;
      }
      if (!workbook) {
        workbook = new ExcelJS.Workbook();
      }
    }

    const incomingIds = batch.filter(u => u.mailType === 'incoming').map(u => u.mailId);
    const outgoingIds = batch.filter(u => u.mailType === 'outgoing').map(u => u.mailId);

    if (incomingIds.length > 0) {
      const sheetName = settings.incomingSheetName || DEFAULTS.incomingSheetName;
      let sheet = workbook.getWorksheet(sheetName);
      if (!sheet) sheet = workbook.addWorksheet(sheetName);

      const { populate } = populateIncomingQuery();
      const mails = await Mail.find({ _id: { $in: incomingIds } })
        .populate(populate)
        .sort({ receivedDate: 1 });

      const lastRow = sheet.lastRow ? sheet.lastRow.number : (parseInt(settings.incomingStartRow) || DEFAULTS.incomingStartRow) - 1;
      const startRow = Math.max(lastRow + 1, parseInt(settings.incomingStartRow) || DEFAULTS.incomingStartRow);
      fillSheet(sheet, mails, settings.incomingMapping || {}, startRow, 'incoming', settings);
    }

    if (outgoingIds.length > 0) {
      const sheetName = settings.outgoingSheetName || DEFAULTS.outgoingSheetName;
      let sheet = workbook.getWorksheet(sheetName);
      if (!sheet) sheet = workbook.addWorksheet(sheetName);

      const { populate } = populateOutgoingQuery();
      const mails = await OutgoingMail.find({ _id: { $in: outgoingIds } })
        .populate(populate)
        .sort({ createdAt: 1 });

      const lastRow = sheet.lastRow ? sheet.lastRow.number : (parseInt(settings.outgoingStartRow) || DEFAULTS.outgoingStartRow) - 1;
      const startRow = Math.max(lastRow + 1, parseInt(settings.outgoingStartRow) || DEFAULTS.outgoingStartRow);
      fillSheet(sheet, mails, settings.outgoingMapping || {}, startRow, 'outgoing', settings);
    }

    await workbook.xlsx.writeFile(registerPath);

    await Settings.findOneAndUpdate(
      { key: CONFIG_KEYS.lastUpdateDate },
      { key: CONFIG_KEYS.lastUpdateDate, value: new Date(), category: 'excel' },
      { upsert: true }
    );

    if (settings.autoSaveToNextCloud && settings.nextcloudOutputPath) {
      try {
        const buffer = fs.readFileSync(registerPath);
        await saveToNextCloud(buffer, settings);
      } catch (err) {
        console.error('Erreur sync NextCloud registre:', err.message);
      }
    }

    console.log(`Registre Excel mis à jour: ${incomingIds.length} entrant(s), ${outgoingIds.length} sortant(s)`);
  } catch (err) {
    console.error('Erreur traitement queue registre Excel:', err);
    pendingUpdates.push(...batch);
  } finally {
    isProcessing = false;
    if (pendingUpdates.length > 0) {
      debounceTimer = setTimeout(() => processRegisterQueue(), 5000);
    }
  }
};

// --- Register status ---

export const getRegisterStatus = async () => {
  const settings = await getExcelSettings();
  const registerPath = getRegisterFilePath();
  const exists = fs.existsSync(registerPath);

  let fileSize = 0;
  let lastModified = null;
  if (exists) {
    const stat = fs.statSync(registerPath);
    fileSize = stat.size;
    lastModified = stat.mtime;
  }

  return {
    enabled: !!settings.enabled,
    fileExists: exists,
    fileSize,
    lastModified,
    lastUpdateDate: settings.lastUpdateDate || null,
    pendingUpdates: pendingUpdates.length,
    isProcessing,
    templateConfigured: !!(settings.templatePath || settings.nextcloudTemplatePath)
  };
};

export default {
  getExcelSettings,
  saveExcelSettings,
  getAvailableFields,
  resolveFieldValue,
  loadTemplate,
  getTemplatePreview,
  generateRegister,
  queueRegisterUpdate,
  getRegisterStatus
};
