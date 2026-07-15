import mongoose from 'mongoose';
import Counter, { formatChronoNumber } from './Counter.model.js';
import softDeletePlugin from './plugins/softDelete.plugin.js';

// Statuts possibles du courrier
export const MAIL_STATUS = {
  PENDING: 'pending',           // En attente de traitement
  PROCESSED: 'processed',       // Traité (réponse effectuée)
  ARCHIVED: 'archived'          // Archivé
};

// Types de réponse
export const RESPONSE_TYPE = {
  MAIL: 'courrier',
  EMAIL: 'email',
  PHONE: 'telephone'
};

const readLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Commentaire interne (fil de discussion entre agents, jamais visible de l'expéditeur)
const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true, timestamps: true });

const responseSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(RESPONSE_TYPE),
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    trim: true
  },
  filePath: {
    type: String
  },
  fileName: {
    type: String
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Stockage externe pour la réponse
  externalStorage: {
    type: {
      type: String,
      enum: ['s3', 'nextcloud', 'onedrive', null]
    },
    path: String,           // Chemin sur le stockage externe
    key: String,            // Clé S3 ou ID OneDrive
    localDeleted: {         // Fichier local supprimé
      type: Boolean,
      default: false
    },
    syncedAt: Date          // Date de synchronisation
  }
}, { _id: true, timestamps: true });

const mailSchema = new mongoose.Schema({
  // Informations de base
  reference: {
    type: String,
    unique: true
  },
  // Numéro d'ordre chronologique annuel (ex: 2026-0001), immuable après attribution
  chronoNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  senderName: {
    type: String,
    trim: true
  },
  
  // Document
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  ocrContent: {
    type: String,
    default: ''
  },
  
  // Destinataires
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientsCopy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Dates
  receivedDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  importedDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  archivedDate: {
    type: Date
  },
  
  // Statut
  status: {
    type: String,
    enum: Object.values(MAIL_STATUS),
    default: MAIL_STATUS.PENDING
  },
  
  // Priorité
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Lecture
  isRead: {
    type: Boolean,
    default: false
  },
  readLogs: [readLogSchema],

  // Rappels d'échéance (envoyés une seule fois par le job quotidien)
  reminderSentAt: {
    type: Date
  },
  overdueSentAt: {
    type: Date
  },
  
  // Réponse
  hasResponse: {
    type: Boolean,
    default: false
  },
  responses: [responseSchema],
  
  // Métadonnées
  importedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Source (manuel ou IMAP)
  source: {
    type: String,
    enum: ['manual', 'imap'],
    default: 'manual'
  },
  imapMessageId: {
    type: String
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Commentaires internes
  comments: [commentSchema],
  
  // Tags
  tags: [{
    type: String,
    trim: true
  }],
  
  // Stockage externe
  externalStorage: {
    type: {
      type: String,
      enum: ['s3', 'nextcloud', 'onedrive', null]
    },
    path: String,           // Chemin sur le stockage externe
    key: String,            // Clé S3 ou ID OneDrive
    localDeleted: {         // Fichier local supprimé après sync
      type: Boolean,
      default: false
    },
    syncedAt: Date          // Date de synchronisation
  },

  // Corbeille (soft delete)
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deleteReason: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index pour la recherche
mailSchema.index({ subject: 'text', ocrContent: 'text', senderName: 'text', notes: 'text' });
mailSchema.index({ status: 1, recipient: 1 });
mailSchema.index({ status: 1, service: 1 });
mailSchema.index({ receivedDate: -1 });
mailSchema.index({ sender: 1 });
mailSchema.index({ status: 1, dueDate: 1 });
mailSchema.index({ tags: 1 });
mailSchema.index({ deletedAt: 1 });

// Générer une référence unique avant sauvegarde
mailSchema.pre('save', async function(next) {
  if (!this.reference) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.reference = `CRR-${year}${month}${day}-${random}`;
  }
  if (!this.chronoNumber) {
    try {
      const year = new Date().getFullYear();
      const seq = await Counter.getNextSequence('incoming', year);
      this.chronoNumber = formatChronoNumber(year, seq);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Méthode pour marquer comme lu
mailSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readLogs.some(log => log.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readLogs.push({ user: userId, readAt: new Date() });
  }
  if (!this.isRead) {
    this.isRead = true;
  }
  return this.save();
};

// Méthode pour ajouter une réponse
mailSchema.methods.addResponse = function(response) {
  this.responses.push(response);
  this.hasResponse = true;
  this.status = MAIL_STATUS.PROCESSED;
  this.processedDate = new Date();
  this.processedBy = response.respondedBy;
  return this.save();
};

// Méthode pour archiver
mailSchema.methods.archive = function(userId) {
  this.status = MAIL_STATUS.ARCHIVED;
  this.archivedDate = new Date();
  this.archivedBy = userId;
  return this.save();
};

// Méthode pour mettre à la corbeille (soft delete)
mailSchema.methods.softDelete = function(userId, reason = '') {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.deleteReason = reason;
  return this.save();
};

// Méthode pour restaurer depuis la corbeille
mailSchema.methods.restore = function() {
  this.deletedAt = null;
  this.deletedBy = null;
  this.deleteReason = '';
  return this.save();
};

mailSchema.plugin(softDeletePlugin);

const Mail = mongoose.model('Mail', mailSchema);

export default Mail;
