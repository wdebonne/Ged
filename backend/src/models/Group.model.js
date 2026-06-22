import mongoose from 'mongoose';

// Définition des permissions disponibles
export const PERMISSIONS = {
  // Courriers
  VIEW_OWN_MAILS: 'view_own_mails',
  VIEW_SERVICE_MAILS: 'view_service_mails',
  VIEW_ALL_MAILS: 'view_all_mails',
  PROCESS_MAILS: 'process_mails',
  ARCHIVE_MAILS: 'archive_mails',
  IMPORT_MAILS: 'import_mails',
  DELETE_MAILS: 'delete_mails',
  EXPORT_MAILS: 'export_mails',
  SILENT_VIEW: 'silent_view',  // Voir sans marquer comme lu
  
  // Utilisateurs
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Groupes
  VIEW_GROUPS: 'view_groups',
  CREATE_GROUPS: 'create_groups',
  EDIT_GROUPS: 'edit_groups',
  DELETE_GROUPS: 'delete_groups',
  
  // Services
  VIEW_SERVICES: 'view_services',
  CREATE_SERVICES: 'create_services',
  EDIT_SERVICES: 'edit_services',
  DELETE_SERVICES: 'delete_services',
  
  // Contacts (expéditeurs / destinataires)
  VIEW_CONTACTS: 'view_contacts',
  CREATE_CONTACTS: 'create_contacts',
  EDIT_CONTACTS: 'edit_contacts',
  DELETE_CONTACTS: 'delete_contacts',
  
  // Paramètres
  VIEW_SETTINGS: 'view_settings',
  EDIT_SETTINGS: 'edit_settings',
  MANAGE_SETTINGS: 'manage_settings',
  
  // LDAP/Kerberos
  MANAGE_LDAP: 'manage_ldap',
  MANAGE_KERBEROS: 'manage_kerberos',
  
  // Courrier départ
  VIEW_OWN_OUTGOING: 'view_own_outgoing',
  VIEW_SERVICE_OUTGOING: 'view_service_outgoing',
  VIEW_ALL_OUTGOING: 'view_all_outgoing',
  CREATE_OUTGOING: 'create_outgoing',
  EDIT_OUTGOING: 'edit_outgoing',
  SEND_OUTGOING: 'send_outgoing',
  ARCHIVE_OUTGOING: 'archive_outgoing',
  DELETE_OUTGOING: 'delete_outgoing',
  EXPORT_OUTGOING: 'export_outgoing',

  // IMAP
  MANAGE_IMAP: 'manage_imap',

  // Statistiques
  VIEW_STATS: 'view_stats',
  VIEW_ALL_STATS: 'view_all_stats'
};

// Permissions par défaut pour chaque rôle
export const DEFAULT_PERMISSIONS = {
  Administrateur: Object.values(PERMISSIONS),
  Superviseur: [
    PERMISSIONS.VIEW_OWN_MAILS,
    PERMISSIONS.VIEW_SERVICE_MAILS,
    PERMISSIONS.PROCESS_MAILS,
    PERMISSIONS.ARCHIVE_MAILS,
    PERMISSIONS.EXPORT_MAILS,
    PERMISSIONS.VIEW_OWN_OUTGOING,
    PERMISSIONS.VIEW_SERVICE_OUTGOING,
    PERMISSIONS.CREATE_OUTGOING,
    PERMISSIONS.SEND_OUTGOING,
    PERMISSIONS.EXPORT_OUTGOING,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_STATS
  ],
  Archiviste: [
    PERMISSIONS.VIEW_OWN_MAILS,
    PERMISSIONS.VIEW_ALL_MAILS,
    PERMISSIONS.PROCESS_MAILS,
    PERMISSIONS.ARCHIVE_MAILS,
    PERMISSIONS.IMPORT_MAILS,
    PERMISSIONS.EXPORT_MAILS,
    PERMISSIONS.VIEW_OWN_OUTGOING,
    PERMISSIONS.VIEW_ALL_OUTGOING,
    PERMISSIONS.CREATE_OUTGOING,
    PERMISSIONS.EDIT_OUTGOING,
    PERMISSIONS.SEND_OUTGOING,
    PERMISSIONS.ARCHIVE_OUTGOING,
    PERMISSIONS.EXPORT_OUTGOING,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.CREATE_CONTACTS,
    PERMISSIONS.EDIT_CONTACTS,
    PERMISSIONS.VIEW_STATS
  ],
  Utilisateur: [
    PERMISSIONS.VIEW_OWN_MAILS,
    PERMISSIONS.PROCESS_MAILS,
    PERMISSIONS.EXPORT_MAILS,
    PERMISSIONS.VIEW_OWN_OUTGOING,
    PERMISSIONS.CREATE_OUTGOING
  ],
  Observateur: [
    PERMISSIONS.VIEW_ALL_MAILS,
    PERMISSIONS.SILENT_VIEW,
    PERMISSIONS.EXPORT_MAILS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_GROUPS,
    PERMISSIONS.VIEW_SERVICES,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_STATS,
    PERMISSIONS.VIEW_ALL_STATS
  ]
};

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    enum: Object.values(PERMISSIONS)
  }],
  color: {
    type: String,
    default: '#3B82F6'
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
groupSchema.index({ name: 1 });

// Méthode pour vérifier une permission
groupSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

const Group = mongoose.model('Group', groupSchema);

export default Group;
