import mongoose from 'mongoose';

// Statuts de délégation
export const DELEGATION_STATUS = {
  ACTIVE: 'active',         // Délégation en cours
  PENDING: 'pending',       // Délégation programmée (date de début future)
  EXPIRED: 'expired',       // Délégation expirée
  REVOKED: 'revoked'        // Délégation révoquée manuellement
};

const delegationSchema = new mongoose.Schema({
  // Utilisateur qui délègue (délégant)
  delegator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Utilisateur qui reçoit la délégation (délégataire)
  delegate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Date de début de la délégation
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Date de fin de la délégation (optionnel - si non défini, délégation permanente jusqu'à révocation)
  endDate: {
    type: Date,
    default: null
  },
  
  // Statut de la délégation
  status: {
    type: String,
    enum: Object.values(DELEGATION_STATUS),
    default: DELEGATION_STATUS.ACTIVE
  },
  
  // Motif/raison de la délégation
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Date de révocation (si révoquée manuellement)
  revokedAt: {
    type: Date,
    default: null
  },
  
  // Utilisateur qui a révoqué (peut être le délégant ou un admin)
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notes lors de la révocation
  revocationNote: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index pour les recherches fréquentes
delegationSchema.index({ delegator: 1, status: 1 });
delegationSchema.index({ delegate: 1, status: 1 });
delegationSchema.index({ startDate: 1, endDate: 1 });

// Index unique pour éviter les délégations en double (un délégant ne peut pas déléguer plusieurs fois au même délégataire en même temps)
delegationSchema.index(
  { delegator: 1, delegate: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'pending'] } }
  }
);

// Méthode statique pour trouver les délégations actives d'un utilisateur (en tant que délégant)
delegationSchema.statics.findActiveDelegationsAsOwner = function(userId) {
  const now = new Date();
  return this.find({
    delegator: userId,
    status: { $in: [DELEGATION_STATUS.ACTIVE, DELEGATION_STATUS.PENDING] },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  }).populate('delegate', 'firstName lastName email avatar');
};

// Méthode statique pour trouver les délégations actives reçues par un utilisateur (en tant que délégataire)
delegationSchema.statics.findActiveDelegationsAsDelegate = function(userId) {
  const now = new Date();
  return this.find({
    delegate: userId,
    status: DELEGATION_STATUS.ACTIVE,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  }).populate('delegator', 'firstName lastName email avatar services');
};

// Méthode statique pour mettre à jour les statuts des délégations (à appeler périodiquement ou à chaque requête)
delegationSchema.statics.updateDelegationStatuses = async function() {
  const now = new Date();
  
  // Activer les délégations pending dont la date de début est passée
  await this.updateMany(
    {
      status: DELEGATION_STATUS.PENDING,
      startDate: { $lte: now }
    },
    {
      $set: { status: DELEGATION_STATUS.ACTIVE }
    }
  );
  
  // Expirer les délégations actives dont la date de fin est passée
  await this.updateMany(
    {
      status: DELEGATION_STATUS.ACTIVE,
      endDate: { $ne: null, $lt: now }
    },
    {
      $set: { status: DELEGATION_STATUS.EXPIRED }
    }
  );
};

// Middleware pre-save pour définir le statut initial
delegationSchema.pre('save', function(next) {
  if (this.isNew) {
    const now = new Date();
    if (this.startDate > now) {
      this.status = DELEGATION_STATUS.PENDING;
    } else if (this.endDate && this.endDate < now) {
      this.status = DELEGATION_STATUS.EXPIRED;
    } else {
      this.status = DELEGATION_STATUS.ACTIVE;
    }
  }
  next();
});

// Méthode d'instance pour révoquer une délégation
delegationSchema.methods.revoke = async function(userId, note = '') {
  this.status = DELEGATION_STATUS.REVOKED;
  this.revokedAt = new Date();
  this.revokedBy = userId;
  this.revocationNote = note;
  return this.save();
};

// Méthode statique pour vérifier si un utilisateur a une délégation active vers un autre
delegationSchema.statics.hasActiveDelegation = async function(delegatorId, delegateId) {
  const now = new Date();
  const delegation = await this.findOne({
    delegator: delegatorId,
    delegate: delegateId,
    status: DELEGATION_STATUS.ACTIVE,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  });
  return !!delegation;
};

// Méthode statique pour obtenir tous les délégants d'un utilisateur (ceux qui lui ont délégué leurs courriers)
delegationSchema.statics.getDelegatorsForUser = async function(userId) {
  const now = new Date();
  const delegations = await this.find({
    delegate: userId,
    status: DELEGATION_STATUS.ACTIVE,
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  }).populate('delegator', '_id firstName lastName email');
  
  return delegations.map(d => d.delegator);
};

const Delegation = mongoose.model('Delegation', delegationSchema);

export default Delegation;
