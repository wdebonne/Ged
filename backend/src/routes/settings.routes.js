import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { Settings, PERMISSIONS } from '../models/index.js';
import EmailTemplate from '../models/EmailTemplate.model.js';
import { authenticate, authorize, isAdmin } from '../middleware/auth.middleware.js';
import { extractTextFromPDF, extractTextFromImage, getOCRLanguages, isOCRAvailable } from '../services/ocr.service.js';
import { testLDAPConnection, fetchLDAPGroups, buildLdapUrl } from '../services/ldap.service.js';

const router = express.Router();

// Configuration multer pour l'upload du logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'branding');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez PNG, JPG, SVG ou WebP.'));
    }
  }
});

// GET /api/settings/public/branding - Obtenir les paramètres de branding (public)
router.get('/public/branding', async (req, res) => {
  try {
    const brandingKeys = ['app_name', 'app_version', 'app_logo', 'footer_text', 'footer_visible'];
    const settings = await Settings.find({ key: { $in: brandingKeys } });

    const branding = {};
    settings.forEach(s => {
      branding[s.key] = s.value;
    });

    // Valeurs par défaut
    res.json({
      success: true,
      data: {
        appName: branding.app_name || 'GED Courrier',
        appVersion: branding.app_version || 'v1.0.0',
        appLogo: branding.app_logo || '',
        footerText: branding.footer_text || 'Fait avec ❤️ par le Service Informatique de Pavilly',
        footerVisible: branding.footer_visible !== 'false'
      }
    });
  } catch (error) {
    console.error('Erreur branding:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/settings/public/export-options - Obtenir les options d'export de l'historique (pour utilisateurs connectés)
router.get('/public/export-options', authenticate, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'export_history_options' });
    
    // Options par défaut si non configurées
    const defaultOptions = {
      creation: true,
      service: true,
      recipient: true,
      readLogs: true,
      processed: true,
      responses: true,
      archived: true
    };

    res.json({
      success: true,
      data: setting?.value || defaultOptions
    });
  } catch (error) {
    console.error('Erreur export options:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/settings/public/chatbot - Obtenir les paramètres du chatbot (pour utilisateurs connectés)
router.get('/public/chatbot', authenticate, async (req, res) => {
  try {
    // Récupérer tous les paramètres chatbot
    const settings = await Settings.find({ category: 'chatbot' });

    // Convertir en objet avec clés camelCase
    const config = {};
    settings.forEach(setting => {
      const key = setting.key.replace('chatbot_', '');
      // Convertir snake_case en camelCase
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      let value = setting.value;
      // Convertir les booléens
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Masquer les mots de passe
      if (setting.isSecret) {
        config[camelKey] = value ? '********' : '';
      } else {
        config[camelKey] = value;
      }
    });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erreur chatbot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/settings/branding/logo - Upload du logo
router.post('/branding/logo', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    // Supprimer l'ancien logo si existant
    const oldLogoSetting = await Settings.findOne({ key: 'app_logo' });
    if (oldLogoSetting?.value) {
      const oldPath = path.join(process.cwd(), 'uploads', oldLogoSetting.value);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const logoPath = `branding/${req.file.filename}`;
    
    await Settings.findOneAndUpdate(
      { key: 'app_logo' },
      { value: logoPath, category: 'appearance', description: 'Logo de l\'application' },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Logo mis à jour',
      data: { logoPath }
    });
  } catch (error) {
    console.error('Erreur upload logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// DELETE /api/settings/branding/logo - Supprimer le logo
router.delete('/branding/logo', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const logoSetting = await Settings.findOne({ key: 'app_logo' });
    if (logoSetting?.value) {
      const logoPath = path.join(process.cwd(), 'uploads', logoSetting.value);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    await Settings.findOneAndUpdate(
      { key: 'app_logo' },
      { value: '' },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Logo supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression logo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/settings - Obtenir tous les paramètres
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const { category = '' } = req.query;

    const query = {};
    if (category) {
      query.category = category;
    }

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Masquer les valeurs secrètes
    const sanitizedSettings = settings.map(s => ({
      ...s.toObject(),
      value: s.isSecret ? '********' : s.value
    }));

    res.json({
      success: true,
      data: sanitizedSettings
    });
  } catch (error) {
    console.error('Erreur liste paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/settings/:key - Obtenir un paramètre
router.get('/:key', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Paramètre non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        ...setting.toObject(),
        value: setting.isSecret ? '********' : setting.value
      }
    });
  } catch (error) {
    console.error('Erreur détails paramètre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/settings - Mettre à jour plusieurs paramètres
router.put('/', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Format invalide'
      });
    }

    const results = [];

    for (const { key, value, category, description, isSecret } of settings) {
      if (!key) continue;

      // Ne pas mettre à jour si la valeur est masquée
      if (value === '********') {
        results.push({ key, success: true, skipped: true });
        continue;
      }

      const updateData = { 
        category, 
        description, 
        isSecret 
      };
      
      // Toujours mettre à jour la valeur
      updateData.value = value;

      const updated = await Settings.findOneAndUpdate(
        { key },
        updateData,
        { upsert: true, new: true }
      );

      results.push({
        key: updated.key,
        success: true
      });
    }

    res.json({
      success: true,
      message: 'Paramètres mis à jour',
      data: results
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/settings/:key - Mettre à jour un paramètre
router.put('/:key', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, category, description, isSecret } = req.body;

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, category, description, isSecret },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Paramètre mis à jour',
      data: {
        ...setting.toObject(),
        value: setting.isSecret ? '********' : setting.value
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/settings/:key - Supprimer un paramètre
router.delete('/:key', authenticate, isAdmin, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Paramètre non trouvé'
      });
    }

    await Settings.findOneAndDelete({ key: req.params.key });

    res.json({
      success: true,
      message: 'Paramètre supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression paramètre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/settings/ldap/test - Tester la connexion LDAP
router.post('/ldap/test', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), async (req, res) => {
  try {
    const { server, port, useTLS, bindDN, bindPassword } = req.body;

    // Si le mot de passe est masqué, récupérer le vrai depuis la base
    let realPassword = bindPassword;
    if (bindPassword === '********' || !bindPassword) {
      const savedPassword = await Settings.findOne({ key: 'ldap_bindPassword' });
      if (savedPassword) {
        realPassword = savedPassword.value;
      }
    }

    const result = await testLDAPConnection({
      url: buildLdapUrl({ server, port, useTLS }),
      bindDN,
      bindPassword: realPassword
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur test LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion LDAP'
    });
  }
});

// POST /api/settings/ldap/groups - Lister les groupes disponibles dans l'annuaire LDAP
router.post('/ldap/groups', authenticate, authorize(PERMISSIONS.MANAGE_LDAP), async (req, res) => {
  try {
    const { server, port, useTLS, bindDN, bindPassword, baseDN } = req.body;

    // Si le mot de passe est masqué, récupérer le vrai depuis la base
    let realPassword = bindPassword;
    if (bindPassword === '********' || !bindPassword) {
      const savedPassword = await Settings.findOne({ key: 'ldap_bindPassword' });
      if (savedPassword) {
        realPassword = savedPassword.value;
      }
    }

    const result = await fetchLDAPGroups({ server, port, useTLS, bindDN, bindPassword: realPassword, baseDN });

    res.json(result);
  } catch (error) {
    console.error('Erreur récupération groupes LDAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de connexion LDAP',
      groups: []
    });
  }
});

// POST /api/settings/imap/test - Tester la connexion IMAP
router.post('/imap/test', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    const { host, port, user, password, tls } = req.body;

    if (!host || !user || !password) {
      return res.status(400).json({
        success: false,
        message: 'Hôte, utilisateur et mot de passe requis'
      });
    }

    // Récupérer le mot de passe réel si masqué
    let realPassword = password;
    if (password === '********' || !password) {
      const savedPassword = await Settings.findOne({ key: 'imap_password' });
      if (savedPassword) {
        realPassword = savedPassword.value;
      }
    }

    const Imap = (await import('imap')).default;
    
    const imapConfig = {
      user,
      password: realPassword,
      host,
      port: parseInt(port) || 993,
      tls: tls ?? true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000
    };

    const imap = new Imap(imapConfig);
    
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { imap.end(); } catch (e) {}
        reject(new Error('Timeout de connexion (10s)'));
      }, 10000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        
        // Lister les dossiers disponibles
        imap.getBoxes((err, boxes) => {
          if (err) {
            imap.end();
            return resolve({ success: true, folders: [], message: 'Connexion réussie (impossible de lister les dossiers)' });
          }
          
          // Extraire les noms de dossiers récursivement
          const folders = [];
          const extractFolders = (boxObj, prefix = '') => {
            for (const [name, box] of Object.entries(boxObj)) {
              const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
              folders.push(fullName);
              if (box.children) {
                extractFolders(box.children, fullName);
              }
            }
          };
          extractFolders(boxes);
          
          imap.end();
          resolve({ 
            success: true, 
            folders: folders.sort(),
            message: `Connexion IMAP réussie - ${folders.length} dossier(s) trouvé(s)`
          });
        });
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      imap.connect();
    });

    res.json({
      success: result.success,
      message: result.message,
      folders: result.folders
    });
  } catch (error) {
    console.error('Erreur test IMAP:', error);
    res.status(500).json({
      success: false,
      message: `Erreur de connexion IMAP: ${error.message}`
    });
  }
});

// POST /api/settings/smtp/test - Tester l'envoi SMTP avec un modèle
router.post('/smtp/test', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const { recipient, templateId, smtpConfig } = req.body;

    if (!recipient || !smtpConfig?.host) {
      return res.status(400).json({
        success: false,
        message: 'Destinataire et configuration SMTP requis'
      });
    }

    // Si le mot de passe est masqué, récupérer le vrai depuis la base
    let password = smtpConfig.password;
    if (password === '********' || !password) {
      const savedPassword = await Settings.findOne({ key: 'smtp_password' });
      if (savedPassword) {
        password = savedPassword.value;
      }
    }

    // Créer le transporteur SMTP
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      auth: smtpConfig.user ? {
        user: smtpConfig.user,
        pass: password
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Vérifier la connexion
    await transporter.verify();

    // Préparer le contenu
    let subject = 'Test de configuration SMTP - GED Courrier';
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">✅ Test SMTP réussi</h2>
        <p>Cet email confirme que votre configuration SMTP fonctionne correctement.</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Envoyé depuis GED Courrier le ${new Date().toLocaleString('fr-FR')}
        </p>
      </div>
    `;

    // Si un modèle est spécifié, l'utiliser
    if (templateId) {
      const template = await EmailTemplate.findById(templateId);
      if (template) {
        // Données d'exemple pour le test
        const sampleData = {
          appName: 'GED Courrier',
          appUrl: 'http://localhost:5173',
          currentDate: new Date().toLocaleDateString('fr-FR'),
          currentYear: new Date().getFullYear(),
          userName: 'Utilisateur Test',
          userEmail: recipient,
          userFirstName: 'Test',
          userLastName: 'Utilisateur',
          temporaryPassword: 'TempPass123!',
          loginUrl: 'http://localhost:5173/login',
          resetLink: 'http://localhost:5173/reset-password?token=abc123',
          resetToken: 'abc123',
          expirationTime: '24 heures',
          mailReference: 'ENT-2025-001234',
          mailSubject: 'Demande de test',
          senderName: 'Expéditeur Test',
          mailDate: new Date().toLocaleDateString('fr-FR'),
          mailPriority: 'Normal',
          mailUrl: 'http://localhost:5173/courriers/123',
          assignedBy: 'Administrateur',
          daysRemaining: '3',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
          daysOverdue: '2'
        };

        html = template.htmlContent;
        subject = template.subject;

        // Remplacer les variables
        Object.entries(sampleData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          html = html.replace(regex, value);
          subject = subject.replace(regex, value);
        });
      }
    }

    // Envoyer l'email
    await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'GED Courrier'}" <${smtpConfig.from || smtpConfig.user}>`,
      to: recipient,
      subject: subject,
      html: html
    });

    res.json({
      success: true,
      message: `Email de test envoyé avec succès à ${recipient}`
    });
  } catch (error) {
    console.error('Erreur test SMTP:', error);
    res.status(500).json({
      success: false,
      message: `Erreur SMTP: ${error.message}`
    });
  }
});

// ==================== OCR ====================

// GET /api/settings/ocr/config - Obtenir la configuration OCR
router.get('/ocr/config', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    // Vérifier si l'OCR est disponible (packages installés)
    const ocrAvailable = isOCRAvailable();
    
    const ocrKeys = [
      'ocr_enabled',
      'ocr_language',
      'ocr_confidence_threshold',
      'ocr_max_pages',
      'ocr_auto_process',
      'ocr_preserve_layout',
      'ocr_deskew',
      'ocr_clean_text'
    ];

    const settings = await Settings.find({ key: { $in: ocrKeys } });
    const config = {};
    
    settings.forEach(s => {
      const keyName = s.key.replace('ocr_', '');
      config[keyName] = s.value;
    });

    // Valeurs par défaut
    res.json({
      success: true,
      data: {
        available: ocrAvailable,
        enabled: ocrAvailable && (config.enabled ?? true),
        language: config.language || 'fra',
        confidenceThreshold: parseInt(config.confidence_threshold) || 60,
        maxPages: parseInt(config.max_pages) || 50,
        autoProcess: config.auto_process ?? true,
        preserveLayout: config.preserve_layout ?? false,
        deskew: config.deskew ?? true,
        cleanText: config.clean_text ?? true
      }
    });
  } catch (error) {
    console.error('Erreur config OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/settings/ocr/config - Sauvegarder la configuration OCR
router.put('/ocr/config', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const { 
      enabled, 
      language, 
      confidenceThreshold, 
      maxPages, 
      autoProcess,
      preserveLayout,
      deskew,
      cleanText
    } = req.body;

    const updates = [
      { key: 'ocr_enabled', value: enabled, category: 'ocr', description: 'OCR activé' },
      { key: 'ocr_language', value: language, category: 'ocr', description: 'Langue OCR' },
      { key: 'ocr_confidence_threshold', value: confidenceThreshold, category: 'ocr', description: 'Seuil de confiance OCR' },
      { key: 'ocr_max_pages', value: maxPages, category: 'ocr', description: 'Nombre max de pages OCR' },
      { key: 'ocr_auto_process', value: autoProcess, category: 'ocr', description: 'Traitement OCR automatique' },
      { key: 'ocr_preserve_layout', value: preserveLayout, category: 'ocr', description: 'Préserver la mise en page' },
      { key: 'ocr_deskew', value: deskew, category: 'ocr', description: 'Redresser les documents' },
      { key: 'ocr_clean_text', value: cleanText, category: 'ocr', description: 'Nettoyer le texte extrait' }
    ];

    for (const update of updates) {
      await Settings.findOneAndUpdate(
        { key: update.key },
        update,
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: 'Configuration OCR enregistrée'
    });
  } catch (error) {
    console.error('Erreur sauvegarde OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Configuration multer pour test OCR
const ocrTestStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ocr-test-${Date.now()}${ext}`);
  }
});

const ocrTestUpload = multer({
  storage: ocrTestStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez PDF, PNG, JPG, TIFF ou WebP.'));
    }
  }
});

// POST /api/settings/ocr/test - Tester l'OCR sur un fichier
router.post('/ocr/test', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), ocrTestUpload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    // Vérifier si l'OCR est disponible
    if (!isOCRAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'OCR non disponible - packages tesseract.js et pdf-to-img non installés sur ce serveur'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    filePath = req.file.path;
    const language = req.body.language || 'fra';
    const startTime = Date.now();
    
    let extractedText = '';
    let method = '';
    
    if (req.file.mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(filePath, { language });
      method = 'PDF (texte natif ou OCR)';
    } else {
      extractedText = await extractTextFromImage(filePath, { language });
      method = 'Image OCR (Tesseract)';
    }
    
    const processingTime = Date.now() - startTime;
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = extractedText.length;

    // Supprimer le fichier temporaire
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      data: {
        text: extractedText.substring(0, 5000), // Limiter à 5000 caractères pour la réponse
        truncated: extractedText.length > 5000,
        fullLength: charCount,
        wordCount,
        charCount,
        processingTime: `${processingTime}ms`,
        method,
        language
      }
    });
  } catch (error) {
    console.error('Erreur test OCR:', error);
    
    // Nettoyer le fichier temporaire en cas d'erreur
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({
      success: false,
      message: `Erreur OCR: ${error.message}`
    });
  }
});

// GET /api/settings/ocr/languages - Obtenir les langues disponibles
router.get('/ocr/languages', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const languages = getOCRLanguages();
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    console.error('Erreur langues OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
