// Plugin Mongoose : exclut par défaut les documents en corbeille (deletedAt != null)
// de toutes les lectures (find, findOne, findOneAndUpdate, countDocuments, count).
// Pour lister la corbeille, passer l'option withDeleted: true (.setOptions({ withDeleted: true })).
// findByIdAndDelete / findOneAndDelete ne sont volontairement PAS interceptés : la purge
// définitive doit pouvoir supprimer un document déjà en corbeille sans contournement.
export default function softDeletePlugin(schema) {
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments', 'count'], function excludeDeleted(next) {
    if (!this.getOptions().withDeleted) {
      this.where({ deletedAt: null });
    }
    next();
  });
}
