import mongoose from 'mongoose';

// Événements disponibles pour les webhooks
export const WEBHOOK_EVENTS = {
  // Courriers
  MAIL_CREATED: 'mail.created',
  MAIL_UPDATED: 'mail.updated',
  MAIL_PROCESSED: 'mail.processed',
  MAIL_ARCHIVED: 'mail.archived',
  MAIL_DELETED: 'mail.deleted',
  MAIL_ASSIGNED: 'mail.assigned',
  
  // Utilisateurs
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  
  // Courriers en attente
  PENDING_MAIL_RECEIVED: 'pending_mail.received',
  PENDING_MAIL_VALIDATED: 'pending_mail.validated',
  PENDING_MAIL_REJECTED: 'pending_mail.rejected'
};

const webhookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'L\'URL est requise'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'L\'URL doit commencer par http:// ou https://'
    }
  },
  description: {
    type: String,
    trim: true
  },
  events: [{
    type: String,
    enum: Object.values(WEBHOOK_EVENTS)
  }],
  authType: {
    type: String,
    enum: ['none', 'hmac', 'basic'],
    default: 'none'
  },
  secret: {
    type: String,
    trim: true,
    description: 'Secret pour signer les requêtes (HMAC-SHA256)'
  },
  authUsername: {
    type: String,
    trim: true,
    description: 'Nom d\'utilisateur pour l\'authentification Basic'
  },
  authPassword: {
    type: String,
    trim: true,
    description: 'Mot de passe pour l\'authentification Basic'
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  retryOnFailure: {
    type: Boolean,
    default: true
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  timeoutMs: {
    type: Number,
    default: 30000,
    min: 1000,
    max: 120000
  },
  lastTriggeredAt: {
    type: Date
  },
  lastStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', null],
    default: null
  },
  lastError: {
    type: String
  },
  lastResponseCode: {
    type: Number
  },
  totalCalls: {
    type: Number,
    default: 0
  },
  successfulCalls: {
    type: Number,
    default: 0
  },
  failedCalls: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
webhookSchema.index({ isActive: 1, events: 1 });
webhookSchema.index({ name: 1 });

// Méthode statique pour obtenir les webhooks actifs pour un événement
webhookSchema.statics.getActiveByEvent = async function(event) {
  return this.find({ 
    isActive: true, 
    events: event 
  });
};

// Méthode pour incrémenter les compteurs
webhookSchema.methods.recordCall = async function(success, error = null, responseCode = null) {
  this.totalCalls += 1;
  this.lastTriggeredAt = new Date();
  this.lastResponseCode = responseCode;
  
  if (success) {
    this.successfulCalls += 1;
    this.lastStatus = 'success';
    this.lastError = null;
  } else {
    this.failedCalls += 1;
    this.lastStatus = 'failed';
    this.lastError = error;
  }
  
  await this.save();
};

const Webhook = mongoose.model('Webhook', webhookSchema);

export default Webhook;
