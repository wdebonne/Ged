import express from 'express';
import { body, validationResult } from 'express-validator';
import { Group, User, PERMISSIONS, DEFAULT_PERMISSIONS } from '../models/index.js';
import { authenticate, authorize, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/groups - Liste des groupes
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_GROUPS), async (req, res) => {
  try {
    const groups = await Group.find().sort({ name: 1 }).lean();

    // Compter les utilisateurs par groupe
    const userCounts = await User.aggregate([
      { $match: { group: { $ne: null } } },
      { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);

    // Créer un map pour un accès rapide
    const countMap = {};
    userCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    // Ajouter le count à chaque groupe
    const groupsWithCount = groups.map(group => ({
      ...group,
      usersCount: countMap[group._id.toString()] || 0
    }));

    res.json({
      success: true,
      data: groupsWithCount
    });
  } catch (error) {
    console.error('Erreur liste groupes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/groups/permissions - Liste de toutes les permissions disponibles
router.get('/permissions', authenticate, authorize(PERMISSIONS.VIEW_GROUPS), async (req, res) => {
  try {
    const permissionsList = Object.entries(PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      label: formatPermissionLabel(key)
    }));

    // Grouper par catégorie
    const categories = {
      courriers: permissionsList.filter(p => p.value.includes('mail') && !p.value.includes('outgoing')),
      courriersDepart: permissionsList.filter(p => p.value.includes('outgoing')),
      utilisateurs: permissionsList.filter(p => p.value.includes('user')),
      groupes: permissionsList.filter(p => p.value.includes('group')),
      services: permissionsList.filter(p => p.value.includes('service')),
      contacts: permissionsList.filter(p => p.value.includes('contact')),
      parametres: permissionsList.filter(p => p.value.includes('setting') || p.value.includes('ldap') || p.value.includes('kerberos') || p.value.includes('imap')),
      statistiques: permissionsList.filter(p => p.value.includes('stat'))
    };

    res.json({
      success: true,
      data: {
        all: permissionsList,
        byCategory: categories
      }
    });
  } catch (error) {
    console.error('Erreur liste permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/groups/:id - Détails d'un groupe
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_GROUPS), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Erreur détails groupe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/groups/:id - Modifier les permissions d'un groupe
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_GROUPS), [
  body('permissions').isArray().withMessage('Les permissions doivent être un tableau')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, permissions, description, color } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }

    // Vérifier si le nouveau nom est déjà utilisé par un autre groupe
    if (name && name !== group.name) {
      // Empêcher le renommage des groupes système
      const systemGroups = ['Administrateur', 'Superviseur', 'Archiviste', 'Utilisateur'];
      if (systemGroups.includes(group.name)) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de renommer un groupe système'
        });
      }
      
      const existingGroup = await Group.findOne({ name, _id: { $ne: id } });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'Un groupe avec ce nom existe déjà'
        });
      }
    }

    // Valider les permissions
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Permissions invalides: ${invalidPermissions.join(', ')}`
      });
    }

    if (name) group.name = name;
    group.permissions = permissions;
    if (description !== undefined) group.description = description;
    if (color) group.color = color;
    
    await group.save();

    res.json({
      success: true,
      message: 'Groupe modifié avec succès',
      data: group
    });
  } catch (error) {
    console.error('Erreur modification groupe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/groups/:id/reset-permissions - Réinitialiser les permissions par défaut
router.post('/:id/reset-permissions', authenticate, authorize(PERMISSIONS.EDIT_GROUPS), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Groupe non trouvé'
      });
    }

    const defaultPerms = DEFAULT_PERMISSIONS[group.name];
    if (!defaultPerms) {
      return res.status(400).json({
        success: false,
        message: 'Aucune permission par défaut définie pour ce groupe'
      });
    }

    group.permissions = defaultPerms;
    await group.save();

    res.json({
      success: true,
      message: 'Permissions réinitialisées',
      data: group
    });
  } catch (error) {
    console.error('Erreur réinitialisation permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Fonction utilitaire pour formater les labels de permission
function formatPermissionLabel(key) {
  const labels = {
    VIEW_OWN_MAILS: 'Voir ses courriers',
    VIEW_SERVICE_MAILS: 'Voir les courriers du service',
    VIEW_ALL_MAILS: 'Voir tous les courriers',
    PROCESS_MAILS: 'Traiter les courriers',
    ARCHIVE_MAILS: 'Archiver les courriers',
    IMPORT_MAILS: 'Importer des courriers',
    DELETE_MAILS: 'Supprimer des courriers',
    EXPORT_MAILS: 'Exporter des courriers',
    VIEW_USERS: 'Voir les utilisateurs',
    CREATE_USERS: 'Créer des utilisateurs',
    EDIT_USERS: 'Modifier des utilisateurs',
    DELETE_USERS: 'Supprimer des utilisateurs',
    VIEW_GROUPS: 'Voir les groupes',
    CREATE_GROUPS: 'Créer des groupes',
    EDIT_GROUPS: 'Modifier des groupes',
    DELETE_GROUPS: 'Supprimer des groupes',
    VIEW_SERVICES: 'Voir les services',
    CREATE_SERVICES: 'Créer des services',
    EDIT_SERVICES: 'Modifier des services',
    DELETE_SERVICES: 'Supprimer des services',
    VIEW_CONTACTS: 'Voir les contacts',
    CREATE_CONTACTS: 'Créer des contacts',
    EDIT_CONTACTS: 'Modifier des contacts',
    DELETE_CONTACTS: 'Supprimer des contacts',
    VIEW_SETTINGS: 'Voir les paramètres',
    EDIT_SETTINGS: 'Modifier les paramètres',
    MANAGE_LDAP: 'Gérer LDAP',
    MANAGE_KERBEROS: 'Gérer Kerberos',
    MANAGE_IMAP: 'Gérer IMAP',
    VIEW_STATS: 'Voir les statistiques',
    VIEW_ALL_STATS: 'Voir toutes les statistiques'
  };
  return labels[key] || key;
}

export default router;
