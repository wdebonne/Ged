import { Category, Subject } from '../models/index.js';

// Catégories proposées au premier démarrage, avec la durée de conservation
// couramment retenue et sa base légale. La conservation reste DÉSACTIVÉE :
// aucune alerte ni suppression tant qu'un administrateur ne l'a pas validée.
const DEFAULT_CATEGORIES = [
  {
    name: 'Facture',
    code: 'FACT',
    color: '#F59E0B',
    description: 'Factures fournisseurs et clients',
    retentionDuration: 10,
    retentionUnit: 'years',
    legalBasis: 'Art. L123-22 Code de commerce — pièces comptables : 10 ans'
  },
  {
    name: 'Contrat',
    code: 'CONT',
    color: '#4F46E5',
    description: 'Contrats et conventions',
    retentionDuration: 5,
    retentionUnit: 'years',
    legalBasis: 'Art. 2224 Code civil — prescription de droit commun : 5 ans après échéance'
  },
  {
    name: 'Courrier administratif',
    code: 'ADM',
    color: '#0EA5E9',
    description: 'Correspondance administrative courante',
    retentionDuration: 5,
    retentionUnit: 'years',
    legalBasis: 'Durée usuelle de conservation administrative'
  },
  {
    name: 'Demande',
    code: 'DEM',
    color: '#10B981',
    description: 'Demandes des usagers',
    retentionDuration: 3,
    retentionUnit: 'years',
    legalBasis: 'CNIL — durée limitée à la finalité du traitement'
  },
  {
    name: 'Information',
    code: 'INFO',
    color: '#8B5CF6',
    description: 'Courriers informatifs sans suite',
    retentionDuration: 1,
    retentionUnit: 'years',
    legalBasis: 'CNIL — durée limitée à la finalité du traitement'
  },
  {
    name: 'Réclamation',
    code: 'RECL',
    color: '#EF4444',
    description: 'Réclamations et contentieux',
    retentionDuration: 5,
    retentionUnit: 'years',
    legalBasis: 'Art. 2224 Code civil — prescription de droit commun : 5 ans'
  },
  {
    name: 'Autre',
    code: 'AUT',
    color: '#6B7280',
    description: 'Documents hors nomenclature',
    retentionDuration: null,
    retentionUnit: 'years',
    legalBasis: ''
  }
];

/**
 * Met en place les catégories :
 *  1. crée le référentiel par défaut si la collection est vide ;
 *  2. convertit les anciennes catégories saisies en texte libre sur les objets
 *     en vraies catégories, puis rattache chaque objet via `categoryRef`.
 *
 * Idempotent : peut être rejoué à chaque démarrage sans effet de bord.
 */
export const migrateCategories = async () => {
  const existingCount = await Category.countDocuments();

  if (existingCount === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES.map(c => ({
      ...c,
      isActive: true,
      retentionEnabled: false,          // l'administrateur active explicitement
      retentionStartFrom: 'receivedDate',
      expiryAction: 'notify',
      alertBeforeDays: []
    })));
    console.log(`✅ Référentiel de catégories initialisé (${DEFAULT_CATEGORIES.length} catégories)`);
  }

  // Objets encore rattachés à une catégorie texte : on crée les catégories manquantes
  const orphanNames = await Subject.distinct('category', {
    categoryRef: null,
    category: { $nin: [null, ''] }
  });

  let created = 0;
  let linked = 0;

  for (const name of orphanNames) {
    const trimmed = String(name).trim();
    if (!trimmed) continue;

    let category = await Category.findOne({ name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!category) {
      category = await Category.create({ name: trimmed, isActive: true, retentionEnabled: false });
      created += 1;
    }

    const result = await Subject.updateMany(
      { categoryRef: null, category: name },
      { $set: { categoryRef: category._id, category: category.name } }
    );
    linked += result.modifiedCount || 0;
  }

  if (created > 0 || linked > 0) {
    console.log(`✅ Migration catégories : ${created} catégorie(s) créée(s), ${linked} objet(s) rattaché(s)`);
  }

  return { created, linked };
};

export default migrateCategories;
