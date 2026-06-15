import { User } from '../models/index.js';
import { fetchRequiredGroupMembers } from './ldap.service.js';
import { normalizeDN } from '../utils/ldap.utils.js';

let syncInterval = null;
let syncStatus = {
  running: false,
  lastCheck: null,
  lastError: null,
  deactivatedCount: 0,
  reactivatedCount: 0
};

// Vérifie l'appartenance de tous les utilisateurs LDAP au groupe requis (LDAP_REQUIRED_GROUP_DN)
// et désactive ceux qui l'ont quitté, ce qui coupe leur session active dès leur prochaine
// requête (contrôle isActive dans auth.middleware.js). Réactive automatiquement ceux qui
// l'ont réintégré, uniquement s'ils avaient été désactivés par cette synchronisation.
export const checkLdapGroupMembership = async () => {
  if (process.env.LDAP_ENABLED !== 'true' || !process.env.LDAP_REQUIRED_GROUP_DN) {
    return { skipped: true };
  }

  const result = await fetchRequiredGroupMembers();
  if (!result.success) {
    syncStatus.lastError = result.message;
    console.warn('Synchronisation groupe LDAP requis ignorée:', result.message);
    return { skipped: true, reason: result.message };
  }

  const members = result.members;
  let deactivatedCount = 0;
  let reactivatedCount = 0;

  // Désactiver les utilisateurs qui ont quitté le groupe requis
  const activeLdapUsers = await User.find({ ldapUser: true, isActive: true, ldapDN: { $nin: [null, ''] } });
  for (const user of activeLdapUsers) {
    if (!members.has(normalizeDN(user.ldapDN))) {
      user.isActive = false;
      user.deactivatedByLdapSync = true;
      await user.save();
      deactivatedCount++;
      console.log(`🔒 Compte désactivé (a quitté le groupe LDAP requis): ${user.username}`);
    }
  }

  // Réactiver ceux désactivés automatiquement qui ont réintégré le groupe
  const autoDeactivated = await User.find({ ldapUser: true, isActive: false, deactivatedByLdapSync: true, ldapDN: { $nin: [null, ''] } });
  for (const user of autoDeactivated) {
    if (members.has(normalizeDN(user.ldapDN))) {
      user.isActive = true;
      user.deactivatedByLdapSync = false;
      await user.save();
      reactivatedCount++;
      console.log(`🔓 Compte réactivé (a réintégré le groupe LDAP requis): ${user.username}`);
    }
  }

  syncStatus = { running: true, lastCheck: new Date(), lastError: null, deactivatedCount, reactivatedCount };
  return { skipped: false, deactivatedCount, reactivatedCount };
};

// Démarrer la synchronisation périodique du groupe LDAP requis
export const startLdapGroupSyncService = async () => {
  if (process.env.LDAP_ENABLED !== 'true' || !process.env.LDAP_REQUIRED_GROUP_DN) {
    console.log('Synchronisation périodique du groupe LDAP requis désactivée');
    return;
  }

  const intervalMinutes = parseInt(process.env.LDAP_GROUP_CHECK_INTERVAL) || 5;

  console.log('🔄 Démarrage de la synchronisation périodique du groupe LDAP requis...');

  // Vérification initiale
  await checkLdapGroupMembership();

  syncInterval = setInterval(() => {
    checkLdapGroupMembership();
  }, intervalMinutes * 60 * 1000);

  syncStatus.running = true;
  console.log(`✅ Synchronisation du groupe LDAP requis démarrée (vérification toutes les ${intervalMinutes} minute(s))`);
};

// Arrêter la synchronisation périodique du groupe LDAP requis
export const stopLdapGroupSyncService = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  syncStatus.running = false;
};

// Obtenir le statut de la synchronisation
export const getLdapGroupSyncStatus = () => ({ ...syncStatus });

export default {
  startLdapGroupSyncService,
  stopLdapGroupSyncService,
  checkLdapGroupMembership,
  getLdapGroupSyncStatus
};
