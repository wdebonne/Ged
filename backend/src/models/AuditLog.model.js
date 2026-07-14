import mongoose from 'mongoose';

// Catégories du journal d'audit
export const AUDIT_CATEGORIES = {
  DELETION: 'deletion',
  PERMISSION: 'permission',
  SETTINGS: 'settings',
  EXPORT: 'export'
};

const auditLogSchema = new mongoose.Schema({
  // Action précise (ex: 'mail.trashed', 'user.deleted', 'settings.updated'...)
  action: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: Object.values(AUDIT_CATEGORIES),
    required: true
  },
  // Type et identifiant de l'entité concernée
  entityType: {
    type: String,
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Snapshot lisible de l'entité au moment de l'action (survit à une suppression définitive)
  entityLabel: {
    type: String,
    trim: true
  },
  // Auteur de l'action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  performedByLabel: {
    type: String,
    trim: true
  },
  // true si déclenché par une tâche planifiée (purge automatique) plutôt qu'un utilisateur
  isSystemAction: {
    type: Boolean,
    default: false
  },
  ip: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // Détail avant/après (ex: { before: [...], after: [...] })
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  // Contexte additionnel libre
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
