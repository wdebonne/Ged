/**
 * Middleware pour servir les fichiers depuis le stockage local ou externe
 */

import fs from 'fs';
import path from 'path';
import { Mail } from '../models/index.js';
import * as externalStorageService from '../services/externalStorage.service.js';

const ALLOWED_DIRS = ['courriers', 'archives', 'responses'];

// Résolution unique au démarrage pour éviter toute manipulation de la valeur de base
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'));

/**
 * Vérifie que filePath normalisé reste strictement sous UPLOAD_BASE.
 * Retourne le chemin absolu sûr, ou null si le chemin s'en échappe.
 */
function resolveAndBound(rawSegment) {
  // path.normalize résout les '..' et '.' ; replace supprime le slash initial
  const normalized = path.normalize(rawSegment.replace(/^\/+/, ''));
  const resolved = path.resolve(UPLOAD_BASE, normalized);
  // Le chemin doit être un sous-chemin strict de UPLOAD_BASE
  if (!resolved.startsWith(UPLOAD_BASE + path.sep)) {
    return null;
  }
  return { normalized, resolved };
}

/**
 * Middleware pour servir les fichiers de courrier.
 * Intercepte les requêtes /uploads/courriers/*, /uploads/archives/*, /uploads/responses/*
 * et sert le fichier depuis le stockage externe si nécessaire.
 */
export const serveMailFiles = async (req, res, next) => {
  try {
    // req.path est déjà relatif au point de montage /uploads (ex: '/courriers/file.pdf')
    const safe = resolveAndBound(req.path);

    if (!safe) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const { normalized: filePath, resolved: resolvedPath } = safe;

    // Whitelist : seuls les répertoires autorisés sont servis
    const isAllowed = ALLOWED_DIRS.some(
      dir => filePath.startsWith(dir + '/') || filePath.startsWith(dir + path.sep)
    );

    if (!isAllowed) {
      // Pas un fichier de courrier, passer au middleware suivant (static)
      return next();
    }

    // Chercher le courrier correspondant à ce fichier
    const mail = await Mail.findOne({
      $or: [
        { filePath: filePath },
        { filePath: `/${filePath}` },
        { 'responses.filePath': filePath },
        { 'responses.filePath': `/${filePath}` }
      ]
    });

    if (!mail) {
      // Pas de courrier trouvé, passer au middleware suivant
      return next();
    }

    // Vérifier si c'est le fichier principal ou une réponse
    let responseId = null;
    let externalStorage = mail.externalStorage;
    let fileName = mail.fileName;

    if (mail.responses && mail.responses.length > 0) {
      for (const response of mail.responses) {
        if (response.filePath === filePath || response.filePath === `/${filePath}`) {
          responseId = response._id;
          externalStorage = response.externalStorage;
          fileName = response.fileName;
          break;
        }
      }
    }

    // Si pas de stockage externe ou fichier local non supprimé, passer au suivant
    if (!externalStorage?.localDeleted || !externalStorage?.type) {
      return next();
    }

    console.log(`📥 Fichier demandé depuis stockage externe (${externalStorage.type}): ${filePath}`);

    // Télécharger le fichier depuis le stockage externe
    try {
      const result = await externalStorageService.getFileStream(mail, responseId);

      res.setHeader('Content-Type', result.contentType || 'application/pdf');
      if (result.contentLength) {
        res.setHeader('Content-Length', result.contentLength);
      }
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName || 'document.pdf')}"`);
      res.setHeader('X-Storage-Type', externalStorage.type);

      result.stream.pipe(res);

    } catch (downloadError) {
      console.error(`Erreur téléchargement depuis ${externalStorage.type}:`, downloadError.message);

      // Fallback vers le fichier local — chemin déjà résolu et borné
      if (fs.existsSync(resolvedPath)) {
        console.log('📁 Fallback vers fichier local');
        return next();
      }

      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le stockage externe'
      });
    }

  } catch (error) {
    console.error('Erreur middleware serveMailFiles:', error);
    next();
  }
};

export default serveMailFiles;
