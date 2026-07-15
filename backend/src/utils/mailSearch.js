import { escapeRegex } from './regex.js';

// Nombre maximum de documents ramenés par la passe $text avant application
// des autres filtres (visibilité, statut…) dans la requête principale.
const TEXT_MATCHES_LIMIT = 1000;

// Construit les clauses $or de recherche textuelle d'un modèle courrier.
// Les champs courts (objet, référence, nom d'expéditeur…) restent en $regex :
// la comparaison par sous-chaîne y est bon marché. En revanche le contenu OCR
// (plusieurs Ko par courrier) passe par l'index $text du modèle — un $regex
// dessus forçait un scan complet de la collection à chaque frappe.
// Les _id trouvés via $text sont réinjectés dans le $or, si bien que la
// visibilité et les autres filtres de la requête appelante s'appliquent
// ensuite normalement.
export async function buildSearchOr(Model, search, shortFields) {
  const safeSearch = escapeRegex(search);
  const or = shortFields.map(field => ({ [field]: { $regex: safeSearch, $options: 'i' } }));

  // Recherche de phrase exacte ("...") : insensible à la casse et aux accents,
  // et proche de l'ancienne sémantique sous-chaîne pour des mots entiers.
  const phrase = search.replace(/"/g, ' ').trim();
  if (phrase) {
    const textMatches = await Model.find({ $text: { $search: `"${phrase}"` } })
      .select('_id')
      .limit(TEXT_MATCHES_LIMIT)
      .lean();
    if (textMatches.length > 0) {
      or.push({ _id: { $in: textMatches.map(doc => doc._id) } });
    }
  }

  return or;
}
