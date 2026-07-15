import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import contactRoutes from './routes/contact.routes.js';
import outgoingMailRoutes from './routes/outgoingMail.routes.js';
import imapMailRoutes from './routes/imapMail.routes.js';
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
import excelRoutes from './routes/excel.routes.js';
import trashRoutes from './routes/trash.routes.js';
import auditRoutes from './routes/audit.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import searchRoutes from './routes/search.routes.js';

// Middleware
import { serveMailFiles } from './middleware/serveMailFiles.middleware.js';

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Application Express seule (middlewares + routes), sans connexion MongoDB
// ni démarrage des services périodiques : voir server.js pour le boot complet.
// Cette séparation permet de monter l'app dans les tests (supertest).
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
if (!fs.existsSync(path.join(uploadPath, 'outgoing'))) {
  fs.mkdirSync(path.join(uploadPath, 'outgoing'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'templates'))) {
  fs.mkdirSync(path.join(uploadPath, 'templates'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadPath, 'registers'))) {
  fs.mkdirSync(path.join(uploadPath, 'registers'), { recursive: true });
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
app.use('/api/contacts', contactRoutes);
app.use('/api/senders', contactRoutes);
app.use('/api/outgoing-mails', outgoingMailRoutes);
app.use('/api/imap-mail', imapMailRoutes);
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
app.use('/api/excel', excelRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

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

export default app;
