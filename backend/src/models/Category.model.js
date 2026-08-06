import mongoose from 'mongoose';

// Unités de durée de conservation
export const RETENTION_UNITS = {
  DAYS: 'days',
  MONTHS: 'months',
  YEARS: 'years'
};

// Date de départ du décompte de la durée de conservation
export const RETENTION_START_POINTS = {
  RECEIVED: 'receivedDate',    // date de réception du courrier (défaut)
  PROCESSED: 'processedDate',  // date de traitement
  ARCHIVED: 'archivedDate',    // date d'archivage
  CREATED: 'createdAt'         // date d'enregistrement dans la GED
};

// Action déclenchée quand la durée légale est dépassée
export const EXPIRY_ACTIONS = {
  NOTIFY: 'notify',          // alerter uniquement, la suppression reste manuelle
  AUTO_TRASH: 'auto_trash'   // mise en corbeille automatique + alerte
};

// Sort final au sens archivistique : ce que deviennent les documents à l'issue
// de la durée d'utilité administrative (DUA).
export const SORT_FINAL = {
  CONSERVATION: 'C',  // conservation définitive : jamais proposé à la suppression
  ELIMINATION: 'E',   // élimination après visa des Archives départementales
  TRI: 'T'            // tri : examen à l'échéance, une partie du fonds est conservée
};

const RETENTION_UNIT_LABELS = {
  [RETENTION_UNITS.DAYS]: 'jour(s)',
  [RETENTION_UNITS.MONTHS]: 'mois',
  [RETENTION_UNITS.YEARS]: 'an(s)'
};

// Journal des changements de durée : indispensable pour tracer « la RGPD disait 3 ans,
// elle dit maintenant 2 ans » et justifier les suppressions rétroactives.
const retentionHistorySchema = new mongoose.Schema({
  previousEnabled: { type: Boolean },
  previousDuration: { type: Number },
  previousUnit: { type: String, enum: Object.values(RETENTION_UNITS) },
  duration: { type: Number },
  unit: { type: String, enum: Object.values(RETENTION_UNITS) },
  enabled: { type: Boolean },
  reason: { type: String, trim: true, default: '' },
  // Nombre de documents devenus immédiatement expirés à cause de ce changement
  newlyExpiredCount: { type: Number, default: 0 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  changedByLabel: { type: String, trim: true, default: '' },
  changedAt: { type: Date, default: Date.now }
}, { _id: true });

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  // Domaine fonctionnel (état civil, urbanisme, finances…) : sert au regroupement
  // et au filtrage dans l'interface d'administration
  domain: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#4F46E5'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Sort final archivistique, informatif : rappelle pourquoi une catégorie est
  // sans durée (conservation définitive) ou demande un examen (tri)
  sortFinal: {
    type: String,
    enum: [...Object.values(SORT_FINAL), null],
    default: null
  },

  // ---- Conservation RGPD ----
  retentionEnabled: {
    type: Boolean,
    default: false
  },
  retentionDuration: {
    type: Number,
    min: 0,
    default: null
  },
  retentionUnit: {
    type: String,
    enum: Object.values(RETENTION_UNITS),
    default: RETENTION_UNITS.YEARS
  },
  retentionStartFrom: {
    type: String,
    enum: Object.values(RETENTION_START_POINTS),
    default: RETENTION_START_POINTS.RECEIVED
  },
  // Référence du texte légal (ex : « Art. L102 B LPF », « CNIL — durée de conservation »)
  legalBasis: {
    type: String,
    trim: true,
    default: ''
  },
  expiryAction: {
    type: String,
    enum: Object.values(EXPIRY_ACTIONS),
    default: EXPIRY_ACTIONS.NOTIFY
  },
  // Rappels avant échéance, en jours (ex : [90, 30, 7]). Vide = valeur globale des paramètres RGPD.
  alertBeforeDays: [{
    type: Number,
    min: 0
  }],

  retentionHistory: [retentionHistorySchema],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });
categorySchema.index({ isActive: 1 });
categorySchema.index({ domain: 1 });

// Libellé lisible de la durée (« 3 an(s) »)
categorySchema.methods.retentionLabel = function() {
  if (!this.retentionEnabled || !this.retentionDuration) return 'Illimitée';
  return `${this.retentionDuration} ${RETENTION_UNIT_LABELS[this.retentionUnit] || this.retentionUnit}`;
};

/**
 * Ajoute `duration` unités à une date. Les mois/années passent par setMonth/setFullYear
 * pour rester exacts (une « année » n'est pas 365 jours fixes).
 */
export const addRetention = (date, duration, unit) => {
  const result = new Date(date);
  if (unit === RETENTION_UNITS.DAYS) {
    result.setDate(result.getDate() + duration);
  } else if (unit === RETENTION_UNITS.MONTHS) {
    result.setMonth(result.getMonth() + duration);
  } else {
    result.setFullYear(result.getFullYear() + duration);
  }
  return result;
};

export const retentionUnitLabel = (unit) => RETENTION_UNIT_LABELS[unit] || unit;

const Category = mongoose.model('Category', categorySchema);

export default Category;
