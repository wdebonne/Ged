// Normalise un DN pour comparaison (insensible à la casse et aux espaces autour des virgules)
export const normalizeDN = (dn) => (dn || '').toString().toLowerCase().replace(/\s*,\s*/g, ',').trim();

// Construit l'URL LDAP à partir des paramètres serveur/port/TLS
export const buildLdapUrl = ({ server, port, useTLS }) => {
  const protocol = useTLS ? 'ldaps' : 'ldap';
  const portNumber = port || (useTLS ? 636 : 389);
  return `${protocol}://${server}:${portNumber}`;
};
