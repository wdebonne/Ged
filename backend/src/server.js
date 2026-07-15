import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Application Express (middlewares + routes) — voir app.js
import app from './app.js';

// Services
import { startImapService } from './services/imap.service.js';
import { startImapMailService } from './services/imapMail.service.js';
import { startLdapGroupSyncService } from './services/ldapGroupSync.service.js';
import { initBackupScheduler } from './services/backup.service.js';
import { initReminderScheduler } from './services/reminder.service.js';
import { initTrashPurgeScheduler } from './services/trash.service.js';

// Initialisation de la base
import { User, Settings, Group, DEFAULT_PERMISSIONS } from './models/index.js';
import { seedDatabase } from './scripts/seed.js';
import { buildLdapUrl, isLdapForceDisabled } from './utils/ldap.utils.js';

// Configuration
dotenv.config();

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

  // Migration : renommer la collection 'senders' en 'contacts'
  try {
    const collections = await mongoose.connection.db.listCollections({ name: 'senders' }).toArray();
    if (collections.length > 0) {
      const contactsExists = await mongoose.connection.db.listCollections({ name: 'contacts' }).toArray();
      if (contactsExists.length === 0) {
        await mongoose.connection.db.collection('senders').rename('contacts');
        console.log('✅ Migration: collection senders renommée en contacts');
      }
    }
  } catch (err) {
    console.error('Erreur migration senders -> contacts:', err.message);
  }

  // Migration : renommer les permissions senders -> contacts dans les groupes existants
  try {
    const permissionMap = {
      'view_senders': 'view_contacts',
      'create_senders': 'create_contacts',
      'edit_senders': 'edit_contacts',
      'delete_senders': 'delete_contacts'
    };
    const groups = await Group.find({ permissions: { $in: Object.keys(permissionMap) } });
    for (const group of groups) {
      group.permissions = group.permissions.map(p => permissionMap[p] || p);
      await group.save();
    }
    if (groups.length > 0) {
      console.log(`✅ Migration: permissions contacts mises à jour pour ${groups.length} groupe(s)`);
    }
  } catch (err) {
    console.error('Erreur migration permissions contacts:', err.message);
  }

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

  // Créer le groupe Observateur s'il n'existe pas (migration pour bases existantes)
  try {
    const observateurGroup = await Group.findOne({ name: 'Observateur' });
    if (!observateurGroup) {
      await Group.create({
        name: 'Observateur',
        description: 'Consultation en lecture seule de tous les courriers (DGS, Maire)',
        permissions: DEFAULT_PERMISSIONS.Observateur,
        color: '#06B6D4',
        isSystem: true
      });
      console.log('✅ Groupe Observateur créé');
    }
  } catch (err) {
    console.error('Erreur création groupe Observateur:', err.message);
  }

  // Charger les settings LDAP de la base vers process.env (priorité sur le .env)
  const ldapSettings = await Settings.find({ category: 'ldap', key: /^ldap_/ });
  if (ldapSettings.length > 0) {
    const ldapMap = {};
    ldapSettings.forEach(s => { ldapMap[s.key] = s.value; });

    if (ldapMap.ldap_enabled !== undefined && !isLdapForceDisabled()) {
      process.env.LDAP_ENABLED = String(ldapMap.ldap_enabled);
    }
    if (ldapMap.ldap_baseDN) process.env.LDAP_SEARCH_BASE = ldapMap.ldap_baseDN;
    if (ldapMap.ldap_bindDN) process.env.LDAP_BIND_DN = ldapMap.ldap_bindDN;
    if (ldapMap.ldap_bindPassword) process.env.LDAP_BIND_PASSWORD = ldapMap.ldap_bindPassword;
    if (ldapMap.ldap_userFilter) process.env.LDAP_SEARCH_FILTER = ldapMap.ldap_userFilter;
    if (ldapMap.ldap_requiredGroupDN !== undefined) process.env.LDAP_REQUIRED_GROUP_DN = ldapMap.ldap_requiredGroupDN || '';
    if (ldapMap.ldap_allowLocalFallback !== undefined) process.env.LDAP_ALLOW_LOCAL_FALLBACK = String(ldapMap.ldap_allowLocalFallback);
    if (ldapMap.ldap_server) {
      const useTLS = String(ldapMap.ldap_useTLS) === 'true';
      const port = ldapMap.ldap_port || (useTLS ? 636 : 389);
      process.env.LDAP_URL = buildLdapUrl({ server: ldapMap.ldap_server, port, useTLS });
    }
    console.log('📂 Settings LDAP chargées depuis la base de données');
  }

  if (isLdapForceDisabled()) {
    process.env.LDAP_ENABLED = 'false';
    console.warn('⛔ LDAP_FORCE_DISABLE actif : LDAP désactivé, le réglage ldap_enabled en base est ignoré');
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

  // Démarrer le service IMAP Email-PDF si activé
  try {
    const imapMailEnabled = await Settings.getValue('imap_mail_enabled', false);
    if (imapMailEnabled === true || imapMailEnabled === 'true') {
      startImapMailService();
    }
  } catch (e) {
    console.error('Erreur démarrage IMAP Email-PDF:', e.message);
  }

  // Démarrer la synchronisation périodique du groupe LDAP requis (révoque l'accès des
  // utilisateurs ayant quitté LDAP_REQUIRED_GROUP_DN, même en session active)
  if (process.env.LDAP_ENABLED === 'true') {
    startLdapGroupSyncService();
  }

  // Initialiser le planificateur de sauvegardes automatiques
  initBackupScheduler().catch(e => console.error('Erreur init backup scheduler:', e.message));

  // Initialiser le job quotidien de rappels d'échéance (J-N + retards)
  initReminderScheduler();

  // Initialiser la purge automatique de la corbeille (rétention configurable, défaut 30 jours)
  initTrashPurgeScheduler();
};

startServer();

export default app;
