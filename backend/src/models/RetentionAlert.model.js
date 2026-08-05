import mongoose from 'mongoose';

// Statut d'une alerte de conservation
export const RETENTION_ALERT_STATUS = {
  UPCOMING: 'upcoming',   // échéance à venir (dans une fenêtre de rappel)
  EXPIRED: 'expired',     // durée légale dépassée, le document doit être supprimé
  EXEMPTED: 'exempted',   // dérogation temporaire accordée par un administrateur
  DELETED: 'deleted',     // document mis en corbeille (auto ou manuel) suite à l'alerte
  RESOLVED: 'resolved'    // le document n'est plus concerné (catégorie changée, doc supprimé ailleurs)
};

export const RETENTION_DOC_TYPES = {
  MAIL: 'mail',
  OUTGOING: 'outgoing'
};

const retentionAlertSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: Object.values(RETENTION_DOC_TYPES),
    required: true
  },
  // Id du courrier entrant ou sortant concerné (pas de ref dynamique : docType tranche)
  document: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // Snapshot lisible : survit à la purge définitive du document
  reference: { type: String, trim: true, default: '' },
  chronoNumber: { type: String, trim: true, default: '' },
  documentSubject: { type: String, trim: true, default: '' },
  correspondent: { type: String, trim: true, default: '' },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  categoryName: { type: String, trim: true, default: '' },

  // Règle appliquée au moment du calcul (pour expliquer l'alerte a posteriori)
  retentionSnapshot: {
    duration: { type: Number },
    unit: { type: String },
    startFrom: { type: String },
    legalBasis: { type: String, trim: true, default: '' }
  },

  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },

  status: {
    type: String,
    enum: Object.values(RETENTION_ALERT_STATUS),
    default: RETENTION_ALERT_STATUS.UPCOMING
  },

  // Seuils de rappel déjà notifiés (en jours avant échéance) : évite de renotifier deux fois
  notifiedThresholds: [{ type: Number }],
  // Dernière notification « échéance dépassée » (relance périodique configurable)
  lastExpiredNotifiedAt: { type: Date, default: null },
  lastNotifiedAt: { type: Date, default: null },

  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acknowledgedAt: { type: Date, default: null },

  // Dérogation : repousse l'alerte (obligation légale concurrente, contentieux en cours…)
  exemptedUntil: { type: Date, default: null },
  exemptReason: { type: String, trim: true, default: '' },
  exemptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Suppression effective (mise en corbeille)
  documentDeletedAt: { type: Date, default: null },
  deletionMode: { type: String, enum: ['auto', 'manual', null], default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

// Une seule alerte par document
retentionAlertSchema.index({ docType: 1, document: 1 }, { unique: true });
retentionAlertSchema.index({ status: 1, expiryDate: 1 });
retentionAlertSchema.index({ category: 1, status: 1 });

const RetentionAlert = mongoose.model('RetentionAlert', retentionAlertSchema);

export default RetentionAlert;
