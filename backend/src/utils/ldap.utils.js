// Normalise un DN pour comparaison (insensible à la casse et aux espaces autour des virgules)
export const normalizeDN = (dn) => (dn || '').toString().toLowerCase().replace(/\s*,\s*/g, ',').trim();

// Construit l'URL LDAP à partir des paramètres serveur/port/TLS
export const buildLdapUrl = ({ server, port, useTLS }) => {
  const protocol = useTLS ? 'ldaps' : 'ldap';
  const portNumber = port || (useTLS ? 636 : 389);
  return `${protocol}://${server}:${portNumber}`;
};

// Coupe-circuit d'urgence : LDAP_FORCE_DISABLE=true désactive LDAP quoi qu'il arrive,
// y compris le réglage ldap_enabled stocké en base de données (qui, lui, écrase
// LDAP_ENABLED au démarrage). Permet de retrouver l'accès avec un compte local
// quand l'annuaire est injoignable ou mal configuré, sans toucher à la base.
export const isLdapForceDisabled = () =>
  ['true', '1', 'yes'].includes(String(process.env.LDAP_FORCE_DISABLE || '').toLowerCase());
