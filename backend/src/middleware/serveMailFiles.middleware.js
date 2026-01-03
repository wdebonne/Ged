/**
 * Middleware pour servir les fichiers depuis le stockage local ou externe
 */

import fs from 'fs';
import path from 'path';
import { Mail } from '../models/index.js';
import * as externalStorageService from '../services/externalStorage.service.js';

/**
 * Middleware pour servir les fichiers de courrier
 * Intercepte les requêtes /uploads/courriers/* et /uploads/archives/*
 * et sert le fichier depuis le stockage externe si nécessaire
 */
export const serveMailFiles = async (req, res, next) => {
  try {
    // Extraire le chemin du fichier
    const filePath = req.path.replace(/^\/uploads\//, '');
    
    // Vérifier si c'est un fichier de courrier ou d'archive
    if (!filePath.startsWith('courriers/') && !filePath.startsWith('archives/') && !filePath.startsWith('responses/')) {
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
    let isResponse = false;
    let responseId = null;
    let externalStorage = mail.externalStorage;
    let fileName = mail.fileName;
    
    // Vérifier si c'est une réponse
    if (mail.responses && mail.responses.length > 0) {
      for (const response of mail.responses) {
        if (response.filePath === filePath || response.filePath === `/${filePath}`) {
          isResponse = true;
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
      
      // Définir les headers
      res.setHeader('Content-Type', result.contentType || 'application/pdf');
      if (result.contentLength) {
        res.setHeader('Content-Length', result.contentLength);
      }
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName || 'document.pdf')}"`);
      res.setHeader('X-Storage-Type', externalStorage.type);
      
      // Streamer le fichier
      result.stream.pipe(res);
      
    } catch (downloadError) {
      console.error(`Erreur téléchargement depuis ${externalStorage.type}:`, downloadError.message);
      
      // Si le téléchargement échoue, essayer le fichier local
      const localPath = path.join(process.cwd(), 'uploads', filePath);
      if (fs.existsSync(localPath)) {
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
