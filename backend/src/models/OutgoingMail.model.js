import mongoose from 'mongoose';

export const OUTGOING_MAIL_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ARCHIVED: 'archived'
};

export const SENDING_METHOD = {
  COURRIER: 'courrier',
  EMAIL: 'email',
  FAX: 'fax',
  MAIN_PROPRE: 'main_propre',
  AUTRE: 'autre'
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

const outgoingMailSchema = new mongoose.Schema({
  reference: {
    type: String,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  destinationName: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },

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

  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  status: {
    type: String,
    enum: Object.values(OUTGOING_MAIL_STATUS),
    default: OUTGOING_MAIL_STATUS.DRAFT
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  sentDate: { type: Date },
  archivedDate: { type: Date },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  linkedIncomingMail: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mail'
  },

  sendingMethod: {
    type: String,
    enum: Object.values(SENDING_METHOD),
    default: SENDING_METHOD.COURRIER
  },
  trackingNumber: {
    type: String,
    trim: true
  },

  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],

  readLogs: [readLogSchema],

  externalStorage: {
    type: {
      type: String,
      enum: ['s3', 'nextcloud', 'onedrive', null]
    },
    path: String,
    key: String,
    localDeleted: {
      type: Boolean,
      default: false
    },
    syncedAt: Date
  }
}, {
  timestamps: true
});

outgoingMailSchema.index({ subject: 'text', ocrContent: 'text', destinationName: 'text', notes: 'text' });
outgoingMailSchema.index({ status: 1, sender: 1 });
outgoingMailSchema.index({ status: 1, service: 1 });
outgoingMailSchema.index({ sentDate: -1 });
outgoingMailSchema.index({ destination: 1 });

outgoingMailSchema.pre('save', async function(next) {
  if (!this.reference) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.reference = `CRD-${year}${month}${day}-${random}`;
  }
  next();
});

outgoingMailSchema.methods.markAsSent = function(userId) {
  this.status = OUTGOING_MAIL_STATUS.SENT;
  this.sentDate = new Date();
  return this.save();
};

outgoingMailSchema.methods.archive = function(userId) {
  this.status = OUTGOING_MAIL_STATUS.ARCHIVED;
  this.archivedDate = new Date();
  this.archivedBy = userId;
  return this.save();
};

outgoingMailSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readLogs.some(log => log.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readLogs.push({ user: userId, readAt: new Date() });
  }
  return this.save();
};

const OutgoingMail = mongoose.model('OutgoingMail', outgoingMailSchema);

export default OutgoingMail;
