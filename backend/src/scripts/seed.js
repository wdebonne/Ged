import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { User, Group, Service, Sender, Settings, DEFAULT_PERMISSIONS, PERMISSIONS } from '../models/index.js';

const seed = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ged_courrier');
    console.log('✅ Connecté à MongoDB');

    // Vérifier si les données existent déjà
    const existingGroups = await Group.countDocuments();
    if (existingGroups > 0) {
      console.log('⚠️ La base de données contient déjà des données. Utilisez --force pour réinitialiser.');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
      console.log('🗑️ Suppression des données existantes...');
      await Group.deleteMany({});
      await User.deleteMany({});
      await Service.deleteMany({});
      await Sender.deleteMany({});
      await Settings.deleteMany({});
    }

    // Créer les groupes
    console.log('📁 Création des groupes...');
    const groups = await Group.insertMany([
      {
        name: 'Administrateur',
        description: 'Accès complet à toutes les fonctionnalités',
        permissions: DEFAULT_PERMISSIONS.Administrateur,
        color: '#EF4444',
        isSystem: true
      },
      {
        name: 'Superviseur',
        description: 'Supervision des courriers du service',
        permissions: DEFAULT_PERMISSIONS.Superviseur,
        color: '#F59E0B',
        isSystem: true
      },
      {
        name: 'Archiviste',
        description: 'Import et archivage des courriers',
        permissions: DEFAULT_PERMISSIONS.Archiviste,
        color: '#8B5CF6',
        isSystem: true
      },
      {
        name: 'Utilisateur',
        description: 'Consultation et traitement des courriers personnels',
        permissions: DEFAULT_PERMISSIONS.Utilisateur,
        color: '#3B82F6',
        isSystem: true
      }
    ]);

    const adminGroup = groups.find(g => g.name === 'Administrateur');
    const supervisorGroup = groups.find(g => g.name === 'Superviseur');
    const archivistGroup = groups.find(g => g.name === 'Archiviste');
    const userGroup = groups.find(g => g.name === 'Utilisateur');

    console.log('✅ Groupes créés');

    // Créer les services
    console.log('🏢 Création des services...');
    const services = await Service.insertMany([
      { name: 'Direction Générale', code: 'DG', color: '#DC2626' },
      { name: 'Ressources Humaines', code: 'RH', color: '#2563EB' },
      { name: 'Comptabilité', code: 'COMPTA', color: '#059669' },
      { name: 'Services Techniques', code: 'ST', color: '#D97706' },
      { name: 'Urbanisme', code: 'URB', color: '#7C3AED' },
      { name: 'État Civil', code: 'EC', color: '#DB2777' },
      { name: 'Accueil', code: 'ACC', color: '#0891B2' },
      { name: 'Informatique', code: 'DSI', color: '#4F46E5' }
    ]);

    const dsiService = services.find(s => s.code === 'DSI');
    const rhService = services.find(s => s.code === 'RH');

    console.log('✅ Services créés');

    // Créer l'administrateur par défaut
    console.log('👤 Création de l\'administrateur...');
    const admin = await User.create({
      username: 'admin',
      email: 'admin@ged.local',
      password: 'admin123',
      firstName: 'Administrateur',
      lastName: 'Système',
      group: adminGroup._id,
      services: [dsiService._id],
      isActive: true
    });

    console.log('✅ Administrateur créé (login: admin / mot de passe: admin123)');

    // Créer quelques utilisateurs de démonstration
    console.log('👥 Création des utilisateurs de démonstration...');
    await User.insertMany([
      {
        username: 'superviseur',
        email: 'superviseur@ged.local',
        password: 'super123',
        firstName: 'Marie',
        lastName: 'Dupont',
        group: supervisorGroup._id,
        services: [rhService._id, dsiService._id],
        isActive: true
      },
      {
        username: 'archiviste',
        email: 'archiviste@ged.local',
        password: 'archi123',
        firstName: 'Pierre',
        lastName: 'Martin',
        group: archivistGroup._id,
        services: services.map(s => s._id),
        isActive: true
      },
      {
        username: 'utilisateur',
        email: 'utilisateur@ged.local',
        password: 'user123',
        firstName: 'Jean',
        lastName: 'Bernard',
        group: userGroup._id,
        services: [rhService._id],
        isActive: true
      }
    ]);

    console.log('✅ Utilisateurs de démonstration créés');

    // Créer quelques expéditeurs de démonstration
    console.log('📮 Création des expéditeurs de démonstration...');
    await Sender.insertMany([
      { name: 'Préfecture de Seine-Maritime', organization: 'Préfecture', email: 'contact@seine-maritime.gouv.fr' },
      { name: 'Conseil Départemental 76', organization: 'Département', email: 'contact@seinemaritime.fr' },
      { name: 'Région Normandie', organization: 'Région', email: 'contact@normandie.fr' },
      { name: 'Trésorerie Principale', organization: 'DGFIP', email: 'tresorerie@dgfip.fr' },
      { name: 'CAF de Rouen', organization: 'CAF', email: 'contact@caf76.fr' },
      { name: 'EDF Entreprises', organization: 'EDF', email: 'entreprises@edf.fr' },
      { name: 'SDIS 76', organization: 'Pompiers', email: 'contact@sdis76.fr' }
    ]);

    console.log('✅ Expéditeurs créés');

    // Créer les paramètres par défaut
    console.log('⚙️ Création des paramètres...');
    await Settings.insertMany([
      { key: 'app_name', value: 'GED Courrier', category: 'appearance', description: 'Nom de l\'application' },
      { key: 'app_version', value: 'v1.0.0', category: 'appearance', description: 'Version de l\'application' },
      { key: 'app_logo', value: '', category: 'appearance', description: 'Logo de l\'application' },
      { key: 'footer_text', value: 'Fait avec ❤️ par le Service Informatique de Pavilly', category: 'appearance', description: 'Texte du pied de page' },
      { key: 'footer_visible', value: 'true', category: 'appearance', description: 'Afficher le pied de page' },
      { key: 'primary_color', value: '#3B82F6', category: 'appearance', description: 'Couleur principale' },
      { key: 'ldap_enabled', value: false, category: 'ldap', description: 'Activer l\'authentification LDAP' },
      { key: 'kerberos_enabled', value: false, category: 'kerberos', description: 'Activer l\'authentification Kerberos' },
      { key: 'imap_enabled', value: false, category: 'imap', description: 'Activer la récupération IMAP' },
      { key: 'mail_notification', value: true, category: 'general', description: 'Envoyer des notifications par email' }
    ]);

    console.log('✅ Paramètres créés');

    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log('\n📋 Comptes de démonstration :');
    console.log('  - admin / admin123 (Administrateur)');
    console.log('  - superviseur / super123 (Superviseur)');
    console.log('  - archiviste / archi123 (Archiviste)');
    console.log('  - utilisateur / user123 (Utilisateur)');
    console.log('\n⚠️ N\'oubliez pas de changer ces mots de passe en production !');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

seed();
