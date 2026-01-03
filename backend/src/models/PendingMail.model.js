import mongoose from 'mongoose';

const pendingMailSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  source: {
    type: String,
    enum: ['manual', 'imap'],
    default: 'manual'
  },
  imapMessageId: {
    type: String
  },
  imapSubject: {
    type: String
  },
  imapFrom: {
    type: String
  },
  imapDate: {
    type: Date
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  ocrContent: {
    type: String,
    default: ''
  },
  ocrProcessed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
pendingMailSchema.index({ createdAt: -1 });
pendingMailSchema.index({ source: 1 });

const PendingMail = mongoose.model('PendingMail', pendingMailSchema);

export default PendingMail;
