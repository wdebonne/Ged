import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Signatures binaires (magic bytes) des formats autorisés
const MAGIC_BYTES = {
  pdf:  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },       // %PDF
  jpeg: { bytes: [0xFF, 0xD8, 0xFF],        offset: 0 },
  png:  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  gif:  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },        // GIF8
  webp: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },        // WEBP at offset 8
};

const readMagicBytes = (filePath, length = 12) => new Promise((resolve, reject) => {
  const buf = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, length, 0);
    resolve(buf);
  } catch (err) {
    reject(err);
  } finally {
    fs.closeSync(fd);
  }
});

const matchesSignature = (buf, sig) =>
  sig.bytes.every((b, i) => buf[sig.offset + i] === b);

// Middleware post-upload : vérifie les magic bytes et supprime le fichier si invalide
export const validateMagicBytes = (allowedTypes) => async (req, res, next) => {
  const files = req.files ? Object.values(req.files).flat() : (req.file ? [req.file] : []);
  if (!files.length) return next();

  for (const file of files) {
    try {
      const buf = await readMagicBytes(file.path);
      const valid = allowedTypes.some(type => MAGIC_BYTES[type] && matchesSignature(buf, MAGIC_BYTES[type]));
      if (!valid) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, message: 'Format de fichier non autorisé (signature invalide).' });
      }
    } catch {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'Impossible de vérifier le fichier.' });
    }
  }
  next();
};

const uploadPath = process.env.UPLOAD_PATH || './uploads';

// Configuration du stockage pour les courriers
const courriersStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(uploadPath, 'courriers');
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const uniqueName = `Courrier Arrivé - le ${dateStr} à ${timeStr}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les réponses
const responsesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(uploadPath, 'responses');
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const uniqueName = `Reponse-${dateStr}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les avatars
const avatarsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(uploadPath, 'avatars');
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `avatar-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les courriers en attente
const pendingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(uploadPath, 'pending');
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const uniqueName = `Courrier Arrivé - le ${dateStr} à ${timeStr}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les courriers départ
const outgoingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(uploadPath, 'outgoing');
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    const uniqueName = `Courrier Depart - le ${dateStr} a ${timeStr}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtre pour les fichiers PDF
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF sont autorisés.'), false);
  }
};

// Filtre pour les images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image (JPEG, PNG, GIF, WebP) sont autorisés.'), false);
  }
};

// Filtre pour PDF et images
const pdfAndImageFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF et images sont autorisés.'), false);
  }
};

// Limite de taille de fichier
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB par défaut

// Export des middlewares d'upload
export const uploadCourrier = multer({
  storage: courriersStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: maxFileSize }
});

export const uploadResponse = multer({
  storage: responsesStorage,
  fileFilter: pdfAndImageFilter,
  limits: { fileSize: maxFileSize }
});

export const uploadAvatar = multer({
  storage: avatarsStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB pour les avatars
});

export const uploadOutgoing = multer({
  storage: outgoingStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: maxFileSize }
});

export const uploadPending = multer({
  storage: pendingStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: maxFileSize }
});

// Middleware de gestion des erreurs d'upload
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Erreur d'upload: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};
