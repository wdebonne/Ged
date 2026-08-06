import { MailType, Mail } from '../models/index.js';

// Types proposés au premier démarrage. « Courrier » est le type par défaut :
// c'est lui qui est présélectionné à l'enregistrement d'un courrier entrant.
const DEFAULT_MAIL_TYPES = [
  { name: 'Courrier', code: 'COUR', color: '#0EA5E9', description: 'Courrier papier reçu par voie postale ou déposé', isDefault: true, order: 10 },
  { name: 'Email', code: 'MAIL', color: '#8B5CF6', description: 'Message électronique et ses pièces jointes', order: 20 },
  { name: 'Document', code: 'DOC', color: '#10B981', description: 'Pièce jointe ou document transmis hors courrier', order: 30 },
  { name: 'Note interne', code: 'NOTE', color: '#F59E0B', description: 'Note de service, circulaire interne', order: 40 },
  { name: 'Facture', code: 'FACT', color: '#EF4444', description: 'Facture, devis, pièce comptable', order: 50 },
  { name: 'Recommandé', code: 'AR', color: '#DC2626', description: 'Courrier recommandé avec ou sans accusé de réception', order: 60 },
  { name: 'Formulaire', code: 'FORM', color: '#6366F1', description: 'Formulaire ou demande normalisée', order: 70 },
  { name: 'Fax', code: 'FAX', color: '#64748B', description: 'Télécopie', order: 80 },
  { name: 'Autre', code: 'AUT', color: '#6B7280', description: 'Document hors nomenclature', order: 90 }
];

/**
 * Met en place le référentiel des types de document :
 *  1. crée les types par défaut si la collection est vide ;
 *  2. rattache au type par défaut les courriers enregistrés avant sa mise en place.
 *
 * Idempotent : peut être rejoué à chaque démarrage sans effet de bord.
 */
export const migrateMailTypes = async () => {
  const existingCount = await MailType.countDocuments();

  if (existingCount === 0) {
    await MailType.insertMany(DEFAULT_MAIL_TYPES.map(t => ({ ...t, isActive: true })));
    console.log(`✅ Référentiel des types de document initialisé (${DEFAULT_MAIL_TYPES.length} types)`);
  }

  const defaultType = await MailType.findOne({ isDefault: true, isActive: true });
  if (!defaultType) return { assigned: 0 };

  // Historique : les courriers enregistrés avant l'ajout du champ reçoivent le type
  // par défaut pour que le filtre soit exploitable dès la mise à jour.
  // On ne vise que les documents dépourvus du champ : un `mailType` à null est un
  // choix explicite de l'agent (« aucun type »), que ce démarrage ne doit pas défaire.
  const result = await Mail.updateMany(
    { mailType: { $exists: false } },
    { $set: { mailType: defaultType._id } }
  );

  const assigned = result.modifiedCount || 0;
  if (assigned > 0) {
    console.log(`✅ Migration types : ${assigned} courrier(s) rattaché(s) au type « ${defaultType.name} »`);
  }

  return { assigned };
};

export default migrateMailTypes;
