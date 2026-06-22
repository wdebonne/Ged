import ldap from 'ldapjs';
import { normalizeDN, buildLdapUrl } from '../utils/ldap.utils.js';

// Vérifie que l'utilisateur appartient au groupe requis (via l'attribut memberOf)
const isMemberOfRequiredGroup = (memberOf, requiredGroupDN) => {
  if (!requiredGroupDN) return true;
  const groups = Array.isArray(memberOf) ? memberOf : (memberOf ? [memberOf] : []);
  const required = normalizeDN(requiredGroupDN);
  return groups.some((dn) => normalizeDN(dn) === required);
};

// Erreurs de connexion (serveur inaccessible) vs erreurs d'authentification/autorisation.
// Seules les premières déclenchent une bascule vers le serveur de secours.
const CONNECTION_ERROR_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'];
const isConnectionError = (err) => {
  if (!err) return false;
  if (CONNECTION_ERROR_CODES.includes(err.code) || CONNECTION_ERROR_CODES.includes(err.errno)) return true;
  return err.name === 'ConnectionError' || err.name === 'TimeoutError';
};

// Construit la configuration LDAP depuis les variables d'environnement.
// suffix = '_BACKUP' pour le serveur de secours : searchBase/searchFilter/requiredGroupDN
// reprennent la valeur de la configuration principale si la variante de secours est vide.
const buildLDAPConfigFromEnv = (suffix = '') => ({
  url: process.env[`LDAP_URL${suffix}`],
  bindDN: process.env[`LDAP_BIND_DN${suffix}`],
  bindPassword: process.env[`LDAP_BIND_PASSWORD${suffix}`],
  searchBase: process.env[`LDAP_SEARCH_BASE${suffix}`] || process.env.LDAP_SEARCH_BASE,
  searchFilter: process.env[`LDAP_SEARCH_FILTER${suffix}`] || process.env.LDAP_SEARCH_FILTER,
  requiredGroupDN: process.env[`LDAP_REQUIRED_GROUP_DN${suffix}`] || process.env.LDAP_REQUIRED_GROUP_DN
});

// Le serveur de secours est considéré comme configuré dès que son URL et son compte de service sont renseignés
const isBackupLDAPConfigured = () => !!(process.env.LDAP_URL_BACKUP && process.env.LDAP_BIND_DN_BACKUP);

// Tente une authentification LDAP sur le serveur décrit par `config`
const attemptLDAPAuth = async (config, username, password) => {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: config.url,
      tlsOptions: { rejectUnauthorized: false }
    });

    client.on('error', (err) => {
      console.error('Erreur connexion LDAP:', err);
      resolve({ success: false, connectionError: true, message: 'Erreur de connexion LDAP' });
    });

    // Bind avec le compte de service
    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        console.error('Erreur bind LDAP:', err);
        client.unbind();
        return resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de connexion LDAP' });
      }

      // Rechercher l'utilisateur
      const searchFilter = config.searchFilter.replace('{{username}}', username);

      const searchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'uid', 'cn', 'sn', 'givenName', 'mail', 'memberOf']
      };

      client.search(config.searchBase, searchOptions, (err, res) => {
        if (err) {
          console.error('Erreur recherche LDAP:', err);
          client.unbind();
          return resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de recherche utilisateur' });
        }

        let userEntry = null;

        res.on('searchEntry', (entry) => {
          userEntry = entry;
        });

        res.on('error', (err) => {
          console.error('Erreur résultat recherche LDAP:', err);
          client.unbind();
          resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de recherche' });
        });

        res.on('end', (result) => {
          if (!userEntry) {
            client.unbind();
            return resolve({ success: false, message: 'Utilisateur non trouvé' });
          }

          const rawDN = userEntry.objectName || userEntry.dn;
          const userDN = typeof rawDN === 'string' ? rawDN : String(rawDN);
          const userInfo = {};

          // Extraire les attributs
          if (userEntry.attributes) {
            for (const attr of userEntry.attributes) {
              if (attr.type === 'memberOf') {
                userInfo.memberOf = (attr.values || []).map(v => typeof v === 'string' ? v : String(v));
              } else {
                const val = attr.values[0];
                userInfo[attr.type] = typeof val === 'string' ? val : String(val);
              }
            }
          }

          // Tenter de se connecter avec les identifiants de l'utilisateur
          client.bind(userDN, password, (err) => {
            client.unbind();

            if (err) {
              console.error('Erreur authentification utilisateur LDAP:', err);
              if (isConnectionError(err)) {
                return resolve({ success: false, connectionError: true, message: 'Erreur de connexion LDAP' });
              }
              return resolve({ success: false, message: 'Mot de passe incorrect' });
            }

            // Restreindre l'accès aux membres du groupe AD configuré (si défini)
            if (!isMemberOfRequiredGroup(userInfo.memberOf, config.requiredGroupDN)) {
              return resolve({
                success: false,
                message: 'Accès refusé : vous n\'êtes pas membre du groupe autorisé à utiliser cette application.'
              });
            }

            resolve({
              success: true,
              userDN,
              userInfo
            });
          });
        });
      });
    });
  });
};

// Authentification LDAP. Le serveur principal est toujours tenté en premier ;
// en cas d'erreur de connexion (serveur inaccessible), bascule automatiquement
// sur le serveur de secours s'il est configuré (LDAP_URL_BACKUP / LDAP_BIND_DN_BACKUP).
export const authenticateLDAP = async (username, password) => {
  if (process.env.LDAP_ENABLED !== 'true') {
    return { success: false, message: 'LDAP désactivé' };
  }

  const primaryResult = await attemptLDAPAuth(buildLDAPConfigFromEnv(), username, password);

  if (primaryResult.connectionError && isBackupLDAPConfigured()) {
    console.warn('Serveur LDAP principal indisponible, tentative sur le serveur de secours...');
    const backupResult = await attemptLDAPAuth(buildLDAPConfigFromEnv('_BACKUP'), username, password);
    if (!backupResult.connectionError) {
      return backupResult;
    }
    return { success: false, message: 'Erreur de connexion : serveurs LDAP principal et de secours indisponibles' };
  }

  return primaryResult;
};

// Récupère les membres directs (attributs `member`/`uniqueMember`) du groupe décrit par
// `config.requiredGroupDN`. Utilisé pour la synchronisation périodique du groupe requis
// (révocation d'accès si un utilisateur quitte ce groupe).
const fetchGroupMembers = async (config) => {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: config.url,
      tlsOptions: { rejectUnauthorized: false }
    });

    client.on('error', (err) => {
      resolve({ success: false, connectionError: true, message: 'Erreur de connexion LDAP' });
    });

    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        client.unbind();
        return resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de connexion LDAP' });
      }

      const searchOptions = {
        scope: 'base',
        attributes: ['member', 'uniqueMember']
      };

      let entryFound = false;
      const members = new Set();

      client.search(config.requiredGroupDN, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de recherche du groupe requis' });
        }

        res.on('searchEntry', (entry) => {
          entryFound = true;
          if (entry.attributes) {
            for (const attr of entry.attributes) {
              if (attr.type === 'member' || attr.type === 'uniqueMember') {
                (attr.values || []).forEach((dn) => members.add(normalizeDN(dn)));
              }
            }
          }
        });

        res.on('error', (err) => {
          client.unbind();
          resolve({ success: false, connectionError: isConnectionError(err), message: 'Erreur de recherche du groupe requis' });
        });

        res.on('end', () => {
          client.unbind();
          if (!entryFound) {
            // Le groupe requis n'existe pas sur ce serveur (mauvaise config) : ne jamais
            // remonter un ensemble vide, ce qui désactiverait tous les utilisateurs LDAP.
            return resolve({ success: false, connectionError: false, message: `Groupe LDAP introuvable: ${config.requiredGroupDN}` });
          }
          resolve({ success: true, members });
        });
      });
    });
  });
};

// Récupère les membres du groupe requis (LDAP_REQUIRED_GROUP_DN), avec bascule automatique
// sur le serveur de secours en cas d'erreur de connexion (même logique que authenticateLDAP).
export const fetchRequiredGroupMembers = async () => {
  if (process.env.LDAP_ENABLED !== 'true' || !process.env.LDAP_REQUIRED_GROUP_DN) {
    return { success: false, message: 'LDAP désactivé ou LDAP_REQUIRED_GROUP_DN non configuré' };
  }

  const primaryResult = await fetchGroupMembers(buildLDAPConfigFromEnv());

  if (primaryResult.connectionError && isBackupLDAPConfigured()) {
    const backupResult = await fetchGroupMembers(buildLDAPConfigFromEnv('_BACKUP'));
    if (!backupResult.connectionError) {
      return backupResult;
    }
    return { success: false, connectionError: true, message: 'Erreur de connexion : serveurs LDAP principal et de secours indisponibles' };
  }

  return primaryResult;
};

// Tester la connexion LDAP
export const testLDAPConnection = async (config) => {
  return new Promise((resolve) => {
    console.log('[LDAP TEST] URL:', config.url);
    console.log('[LDAP TEST] Bind DN:', config.bindDN);
    console.log('[LDAP TEST] Password length:', config.bindPassword ? config.bindPassword.length : 0);

    const client = ldap.createClient({
      url: config.url,
      tlsOptions: { rejectUnauthorized: false },
      connectTimeout: 5000
    });

    client.on('error', (err) => {
      console.error('[LDAP TEST] Client error:', err.message, '| code:', err.code);
      resolve({ success: false, message: `Erreur connexion: ${err.message}` });
    });

    client.on('connect', () => {
      console.log('[LDAP TEST] TCP/TLS connecté, tentative de bind...');
      client.bind(config.bindDN, config.bindPassword, (err) => {
        if (err) {
          console.error('[LDAP TEST] Bind échoué:', err.message, '| code:', err.code, '| name:', err.name, '| lde_message:', err.lde_message);
          client.unbind();
          return resolve({ success: false, message: `Échec de l'authentification: ${err.lde_message || err.message}` });
        }

        console.log('[LDAP TEST] Bind réussi !');
        client.unbind();
        resolve({ success: true, message: 'Connexion réussie' });
      });
    });

    // Timeout
    setTimeout(() => {
      try {
        client.unbind();
      } catch (e) {}
      resolve({ success: false, message: 'Timeout de connexion' });
    }, 10000);
  });
};

// Synchroniser les utilisateurs depuis LDAP
export const syncLDAPUsers = async () => {
  return new Promise((resolve) => {
    if (process.env.LDAP_ENABLED !== 'true') {
      return resolve({ success: false, message: 'LDAP désactivé', users: [] });
    }

    const client = ldap.createClient({
      url: process.env.LDAP_URL,
      tlsOptions: { rejectUnauthorized: false }
    });

    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        client.unbind();
        return resolve({ success: false, message: 'Erreur de connexion', users: [] });
      }

      const searchOptions = {
        filter: '(objectClass=person)',
        scope: 'sub',
        attributes: ['dn', 'uid', 'cn', 'sn', 'givenName', 'mail']
      };

      const users = [];

      client.search(process.env.LDAP_SEARCH_BASE, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, message: 'Erreur de recherche', users: [] });
        }

        res.on('searchEntry', (entry) => {
          const userInfo = {};
          if (entry.attributes) {
            for (const attr of entry.attributes) {
              userInfo[attr.type] = attr.values[0];
            }
          }
          const rawDn = entry.objectName || entry.dn;
          userInfo.dn = typeof rawDn === 'string' ? rawDn : String(rawDn);
          users.push(userInfo);
        });

        res.on('end', () => {
          client.unbind();
          resolve({ success: true, users });
        });

        res.on('error', (err) => {
          client.unbind();
          resolve({ success: false, message: err.message, users: [] });
        });
      });
    });
  });
};

// Lister les groupes disponibles dans l'annuaire LDAP/AD
export const fetchLDAPGroups = async ({ server, port, useTLS, bindDN, bindPassword, baseDN }) => {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: buildLdapUrl({ server, port, useTLS }),
      tlsOptions: { rejectUnauthorized: false },
      connectTimeout: 5000
    });

    client.on('error', (err) => {
      resolve({ success: false, message: err.message, groups: [] });
    });

    client.bind(bindDN, bindPassword, (err) => {
      if (err) {
        client.unbind();
        return resolve({ success: false, message: 'Échec de l\'authentification', groups: [] });
      }

      const searchOptions = {
        filter: '(|(objectClass=groupOfNames)(objectClass=group)(objectClass=groupOfUniqueNames)(objectClass=posixGroup))',
        scope: 'sub',
        attributes: ['dn', 'cn', 'description']
      };

      const groups = [];

      client.search(baseDN, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, message: 'Erreur de recherche', groups: [] });
        }

        res.on('searchEntry', (entry) => {
          const info = {};
          if (entry.attributes) {
            for (const attr of entry.attributes) {
              info[attr.type] = attr.values[0];
            }
          }
          const dn = entry.objectName || entry.dn;
          groups.push({
            dn: typeof dn === 'string' ? dn : String(dn),
            name: String(info.cn || ''),
            description: String(info.description || '')
          });
        });

        res.on('end', () => {
          client.unbind();
          groups.sort((a, b) => a.name.localeCompare(b.name));
          resolve({ success: true, groups });
        });

        res.on('error', (err) => {
          client.unbind();
          resolve({ success: false, message: err.message, groups: [] });
        });
      });
    });

    // Timeout
    setTimeout(() => {
      try {
        client.unbind();
      } catch (e) {}
      resolve({ success: false, message: 'Timeout de connexion', groups: [] });
    }, 10000);
  });
};

export { buildLdapUrl };

export default {
  authenticateLDAP,
  testLDAPConnection,
  syncLDAPUsers,
  fetchLDAPGroups,
  fetchRequiredGroupMembers,
  buildLdapUrl
};
