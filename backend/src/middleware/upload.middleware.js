import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

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
