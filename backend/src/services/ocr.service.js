import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// Import dynamique pour les packages OCR optionnels (peuvent ne pas être installés)
let Tesseract = null;
let pdf = null;
let OCR_AVAILABLE = false;

try {
  Tesseract = (await import('tesseract.js')).default;
  pdf = (await import('pdf-to-img')).pdf;
  OCR_AVAILABLE = true;
  console.log('✅ OCR disponible (tesseract.js et pdf-to-img chargés)');
} catch (err) {
  console.warn('⚠️ OCR non disponible - packages tesseract.js ou pdf-to-img non installés');
  console.warn('   Pour activer l\'OCR, installez: npm install tesseract.js pdf-to-img');
}

// Vérifier si l'OCR est disponible
export const isOCRAvailable = () => OCR_AVAILABLE;

// Liste des langues OCR disponibles
const OCR_LANGUAGES = [
  { code: 'fra', name: 'Français', flag: '🇫🇷' },
  { code: 'eng', name: 'Anglais', flag: '🇬🇧' },
  { code: 'deu', name: 'Allemand', flag: '🇩🇪' },
  { code: 'spa', name: 'Espagnol', flag: '🇪🇸' },
  { code: 'ita', name: 'Italien', flag: '🇮🇹' },
  { code: 'por', name: 'Portugais', flag: '🇵🇹' },
  { code: 'nld', name: 'Néerlandais', flag: '🇳🇱' },
  { code: 'pol', name: 'Polonais', flag: '🇵🇱' },
  { code: 'rus', name: 'Russe', flag: '🇷🇺' },
  { code: 'ara', name: 'Arabe', flag: '🇸🇦' },
  { code: 'chi_sim', name: 'Chinois simplifié', flag: '🇨🇳' },
  { code: 'jpn', name: 'Japonais', flag: '🇯🇵' },
  { code: 'kor', name: 'Coréen', flag: '🇰🇷' },
  { code: 'fra+eng', name: 'Français + Anglais', flag: '🇫🇷🇬🇧' },
  { code: 'fra+deu', name: 'Français + Allemand', flag: '🇫🇷🇩🇪' }
];

// Obtenir la liste des langues disponibles
export const getOCRLanguages = () => OCR_LANGUAGES;

// Convertir un PDF en images avec pdf-to-img
const convertPDFToImages = async (pdfPath, outputDir, maxPages = 10) => {
  if (!OCR_AVAILABLE || !pdf) {
    throw new Error('OCR non disponible - packages non installés');
  }
  
  const images = [];
  
  try {
    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Chargement du PDF: ${pdfPath}`);
    
    // Utiliser pdf-to-img pour convertir le PDF
    const document = await pdf(pdfPath, { scale: 2.0 });
    
    let pageNum = 0;
    for await (const image of document) {
      pageNum++;
      
      if (pageNum > maxPages) {
        console.log(`Limite de ${maxPages} pages atteinte`);
        break;
      }
      
      const imagePath = path.join(outputDir, `page-${String(pageNum).padStart(3, '0')}.png`);
      fs.writeFileSync(imagePath, image);
      
      const stats = fs.statSync(imagePath);
      console.log(`Page ${pageNum} convertie: ${Math.round(stats.size / 1024)} KB`);
      
      if (stats.size > 1000) { // Au moins 1KB = image valide
        images.push(imagePath);
      } else {
        console.warn(`Page ${pageNum}: image trop petite, ignorée`);
      }
    }
    
    console.log(`${images.length} images valides générées sur ${pageNum} pages`);
    return images;
  } catch (error) {
    console.error('Erreur conversion PDF:', error);
    throw error;
  }
};

// Extraire le texte d'un fichier PDF
export const extractTextFromPDF = async (filePath, options = {}) => {
  const { language = 'fra', maxPages = 10 } = options;
  
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error('Fichier non trouvé');
    }

    const dataBuffer = fs.readFileSync(filePath);
    
    // Essayer d'abord l'extraction de texte native du PDF
    try {
      const pdfData = await pdfParse(dataBuffer);
      
      if (pdfData.text && pdfData.text.trim().length > 50) {
        // Le PDF contient du texte extractible (non scanné)
        console.log(`PDF avec texte natif détecté (${pdfData.text.length} caractères)`);
        return cleanText(pdfData.text, options);
      }
    } catch (parseError) {
      console.log('Impossible d\'extraire le texte natif du PDF:', parseError.message);
    }

    // PDF scanné - convertir en images et appliquer OCR
    // Vérifier si l'OCR est disponible
    if (!OCR_AVAILABLE) {
      console.warn('PDF scanné détecté mais OCR non disponible');
      return '';
    }
    
    console.log('PDF scanné détecté, conversion en images pour OCR...');
    
    const uploadBase = path.resolve(process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'));
    const tempDir = path.join(uploadBase, 'temp', `ocr_${Date.now()}`);
    let images = [];
    
    try {
      images = await convertPDFToImages(filePath, tempDir, maxPages);
      
      if (images.length === 0) {
        console.log('Aucune image générée à partir du PDF');
        return '';
      }
      
      // Appliquer OCR sur chaque image
      const textParts = [];
      
      for (let i = 0; i < images.length; i++) {
        console.log(`OCR page ${i + 1}/${images.length}...`);
        
        try {
          const pageText = await extractTextFromImage(images[i], { language, cleanText: false });
          if (pageText && pageText.trim().length > 0) {
            textParts.push(`--- Page ${i + 1} ---\n${pageText}`);
          }
        } catch (pageError) {
          console.error(`Erreur OCR page ${i + 1}:`, pageError.message);
        }
      }
      
      const fullText = textParts.join('\n\n');
      console.log(`OCR terminé: ${fullText.length} caractères extraits de ${images.length} pages`);
      
      return cleanText(fullText, options);
      
    } finally {
      // Nettoyer les fichiers temporaires
      try {
        for (const img of images) {
          if (fs.existsSync(img)) {
            fs.unlinkSync(img);
          }
        }
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error('Erreur nettoyage fichiers temporaires:', cleanupError.message);
      }
    }
    
  } catch (error) {
    console.error('Erreur extraction texte PDF:', error);
    throw error;
  }
};

// Extraire le texte d'une image avec OCR
export const extractTextFromImage = async (imagePath, options = {}) => {
  if (!OCR_AVAILABLE || !Tesseract) {
    throw new Error('OCR non disponible - tesseract.js non installé');
  }
  
  const { language = 'fra' } = options;
  
  try {
    console.log(`OCR image: ${imagePath} (langue: ${language})`);
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      imagePath,
      language,
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            // Progress logging optionnel
          }
        }
      }
    );

    console.log(`OCR terminé - Confiance: ${confidence}%`);
    return cleanText(text, options);
  } catch (error) {
    console.error('Erreur OCR image:', error);
    throw error;
  }
};

// Nettoyer le texte extrait
const cleanText = (text, options = {}) => {
  const { cleanText: shouldClean = true } = options;
  
  if (!text) return '';
  
  if (!shouldClean) {
    return text.trim().substring(0, 100000);
  }
  
  return text
    // Supprimer les caractères de contrôle
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normaliser les espaces
    .replace(/\s+/g, ' ')
    // Supprimer les espaces en début et fin
    .trim()
    // Limiter la longueur (pour la base de données)
    .substring(0, 100000);
};

// Traitement OCR en arrière-plan
export const processOCRQueue = async (pendingMails, options = {}) => {
  const { language = 'fra' } = options;
  const results = [];
  
  for (const mail of pendingMails) {
    try {
      if (!mail.ocrProcessed) {
        const text = await extractTextFromPDF(mail.filePath, { language });
        mail.ocrContent = text;
        mail.ocrProcessed = true;
        await mail.save();
        results.push({ id: mail._id, success: true });
      }
    } catch (error) {
      console.error(`Erreur OCR pour ${mail._id}:`, error);
      results.push({ id: mail._id, success: false, error: error.message });
    }
  }
  
  return results;
};

export default {
  extractTextFromPDF,
  extractTextFromImage,
  processOCRQueue,
  getOCRLanguages,
  isOCRAvailable
};
