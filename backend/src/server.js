import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import groupRoutes from './routes/group.routes.js';
import mailRoutes from './routes/mail.routes.js';
import serviceRoutes from './routes/service.routes.js';
import senderRoutes from './routes/sender.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import statsRoutes from './routes/stats.routes.js';
import imapRoutes from './routes/imap.routes.js';
import emailTemplateRoutes from './routes/emailTemplate.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import onedriveRoutes from './routes/onedrive.routes.js';
import s3Routes from './routes/s3.routes.js';
import nextcloudRoutes from './routes/nextcloud.routes.js';
import delegationRoutes from './routes/delegation.routes.js';
import ldapGroupMappingRoutes from './routes/ldapGroupMapping.routes.js';
import backupRoutes from './routes/backup.routes.js';

// Middleware
import { serveMailFiles } from './middleware/serveMailFiles.middleware.js';

// Services
import { startImapService } from './services/imap.service.js';
import { startLdapGroupSyncService } from './services/ldapGroupSync.service.js';
import { initBackupScheduler } from './services/backup.service.js';

// Initialisation de la base
import { User, Settings } from './models/index.js';
import { seedDatabase } from './scripts/seed.js';
import { buildLdapUrl } from './utils/ldap.utils.js';

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Faire confiance au reverse proxy (Nginx/Traefik) pour X-Forwarded-For
app.set('trust proxy', 1);

// Sécurité HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "blob:", "data:"],
      connectSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "blob:"],
    }
  }
}));

// Middleware CORS - Configuration complète
// En production, définir CORS_ORIGIN avec le domaine (ex: https://mondomaine.com)
// Plusieurs origines peuvent être séparées par des virgules
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
}));

// Parser JSON et URL-encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Créer le dossier uploads s'il n'existe pas
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'courriers'))) {
  fs.mkdirSync(path.join(uploadPath, 'courriers'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'responses'))) {
  fs.mkdirSync(path.join(uploadPath, 'responses'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'avatars'))) {
  fs.mkdirSync(path.join(uploadPath, 'avatars'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'pending'))) {
  fs.mkdirSync(path.join(uploadPath, 'pending'), { recursive: true });
}

// Servir les fichiers statiques
// D'abord vérifier si le fichier doit être récupéré depuis le stockage externe
app.use('/uploads', serveMailFiles);
// Puis servir les fichiers locaux
app.use('/uploads', express.static(path.resolve(uploadPath)));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/mails', mailRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/imap', imapRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/onedrive', onedriveRoutes);
app.use('/api/storage/s3', s3Routes);
app.use('/api/storage/nextcloud', nextcloudRoutes);
app.use('/api/delegations', delegationRoutes);
app.use('/api/ldap/group-mappings', ldapGroupMappingRoutes);
app.use('/api/backup', backupRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// En production, servir le frontend depuis le backend
if (process.env.NODE_ENV === 'production') {
  // Docker avec volumes: /app/frontend/dist
  // Sans Docker: ../../frontend/dist (relatif à src/)
  let frontendPath = path.join(__dirname, '../../frontend/dist');
  
  // Si le chemin relatif n'existe pas, essayer le chemin Docker
  if (!fs.existsSync(frontendPath)) {
    frontendPath = '/app/frontend/dist';
  }
  
  if (fs.existsSync(frontendPath)) {
    // Servir les fichiers statiques du frontend
    app.use(express.static(frontendPath, {
      maxAge: '30d', // Cache pour les assets
      etag: true
    }));
    
    // Pour toutes les autres routes (SPA), renvoyer index.html
    app.get('*', (req, res, next) => {
      // Ne pas intercepter les routes API et uploads
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
    
    console.log('📦 Mode production: Frontend servi depuis', frontendPath);
  } else {
    console.warn('⚠️ Frontend non trouvé. Veuillez builder le frontend: cd frontend && npm run build');
  }
}

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connexion à MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ged_courrier');
    console.log('✅ Connexion à MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

// Démarrer le serveur
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Initialiser la base avec les données par défaut si aucun utilisateur n'existe
  // (premier démarrage, ex: nouveau déploiement Docker)
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('🌱 Aucun utilisateur trouvé, initialisation de la base de données...');
    try {
      await seedDatabase();
      console.log('✅ Base de données initialisée avec les comptes par défaut');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation automatique de la base:', error.message);
    }
  }

  // Charger les settings LDAP de la base vers process.env (priorité sur le .env)
  const ldapSettings = await Settings.find({ category: 'ldap', key: /^ldap_/ });
  if (ldapSettings.length > 0) {
    const ldapMap = {};
    ldapSettings.forEach(s => { ldapMap[s.key] = s.value; });

    if (ldapMap.ldap_enabled !== undefined) process.env.LDAP_ENABLED = String(ldapMap.ldap_enabled);
    if (ldapMap.ldap_baseDN) process.env.LDAP_SEARCH_BASE = ldapMap.ldap_baseDN;
    if (ldapMap.ldap_bindDN) process.env.LDAP_BIND_DN = ldapMap.ldap_bindDN;
    if (ldapMap.ldap_bindPassword) process.env.LDAP_BIND_PASSWORD = ldapMap.ldap_bindPassword;
    if (ldapMap.ldap_userFilter) process.env.LDAP_SEARCH_FILTER = ldapMap.ldap_userFilter;
    if (ldapMap.ldap_requiredGroupDN !== undefined) process.env.LDAP_REQUIRED_GROUP_DN = ldapMap.ldap_requiredGroupDN || '';
    if (ldapMap.ldap_server) {
      const useTLS = String(ldapMap.ldap_useTLS) === 'true';
      const port = ldapMap.ldap_port || (useTLS ? 636 : 389);
      process.env.LDAP_URL = buildLdapUrl({ server: ldapMap.ldap_server, port, useTLS });
    }
    console.log('📂 Settings LDAP chargées depuis la base de données');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📧 IMAP: ${process.env.IMAP_ENABLED === 'true' ? 'Activé' : 'Désactivé'}`);
    console.log(`🔐 LDAP: ${process.env.LDAP_ENABLED === 'true' ? 'Activé' : 'Désactivé'}`);
    console.log(`🎫 Kerberos: ${process.env.KERBEROS_ENABLED === 'true' ? 'Activé' : 'Désactivé'}`);
  });

  // Démarrer le service IMAP si activé
  if (process.env.IMAP_ENABLED === 'true') {
    startImapService();
  }

  // Démarrer la synchronisation périodique du groupe LDAP requis (révoque l'accès des
  // utilisateurs ayant quitté LDAP_REQUIRED_GROUP_DN, même en session active)
  if (process.env.LDAP_ENABLED === 'true') {
    startLdapGroupSyncService();
  }

  // Initialiser le planificateur de sauvegardes automatiques
  initBackupScheduler().catch(e => console.error('Erreur init backup scheduler:', e.message));
};

startServer();

export default app;
