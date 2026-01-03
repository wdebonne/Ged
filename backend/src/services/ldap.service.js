import ldap from 'ldapjs';

// Authentification LDAP
export const authenticateLDAP = async (username, password) => {
  return new Promise((resolve) => {
    if (process.env.LDAP_ENABLED !== 'true') {
      return resolve({ success: false, message: 'LDAP désactivé' });
    }

    const client = ldap.createClient({
      url: process.env.LDAP_URL,
      tlsOptions: { rejectUnauthorized: false }
    });

    client.on('error', (err) => {
      console.error('Erreur connexion LDAP:', err);
      resolve({ success: false, message: 'Erreur de connexion LDAP' });
    });

    // Bind avec le compte de service
    const bindDN = process.env.LDAP_BIND_DN;
    const bindPassword = process.env.LDAP_BIND_PASSWORD;

    client.bind(bindDN, bindPassword, (err) => {
      if (err) {
        console.error('Erreur bind LDAP:', err);
        client.unbind();
        return resolve({ success: false, message: 'Erreur de connexion LDAP' });
      }

      // Rechercher l'utilisateur
      const searchBase = process.env.LDAP_SEARCH_BASE;
      const searchFilter = process.env.LDAP_SEARCH_FILTER.replace('{{username}}', username);

      const searchOptions = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'uid', 'cn', 'sn', 'givenName', 'mail', 'memberOf']
      };

      client.search(searchBase, searchOptions, (err, res) => {
        if (err) {
          console.error('Erreur recherche LDAP:', err);
          client.unbind();
          return resolve({ success: false, message: 'Erreur de recherche utilisateur' });
        }

        let userEntry = null;

        res.on('searchEntry', (entry) => {
          userEntry = entry;
        });

        res.on('error', (err) => {
          console.error('Erreur résultat recherche LDAP:', err);
          client.unbind();
          resolve({ success: false, message: 'Erreur de recherche' });
        });

        res.on('end', (result) => {
          if (!userEntry) {
            client.unbind();
            return resolve({ success: false, message: 'Utilisateur non trouvé' });
          }

          const userDN = userEntry.objectName || userEntry.dn;
          const userInfo = {};

          // Extraire les attributs
          if (userEntry.attributes) {
            for (const attr of userEntry.attributes) {
              userInfo[attr.type] = attr.values[0];
            }
          }

          // Tenter de se connecter avec les identifiants de l'utilisateur
          client.bind(userDN, password, (err) => {
            client.unbind();

            if (err) {
              console.error('Erreur authentification utilisateur LDAP:', err);
              return resolve({ success: false, message: 'Mot de passe incorrect' });
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

// Tester la connexion LDAP
export const testLDAPConnection = async (config) => {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: config.url,
      tlsOptions: { rejectUnauthorized: false },
      connectTimeout: 5000
    });

    client.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });

    client.on('connect', () => {
      client.bind(config.bindDN, config.bindPassword, (err) => {
        if (err) {
          client.unbind();
          return resolve({ success: false, message: 'Échec de l\'authentification' });
        }

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
          userInfo.dn = entry.objectName || entry.dn;
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

export default {
  authenticateLDAP,
  testLDAPConnection,
  syncLDAPUsers
};
