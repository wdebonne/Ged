import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = {
  NEW_MAIL_RECIPIENT: 'new_mail_recipient',
  NEW_MAIL_COPY: 'new_mail_copy',
  NEW_MAIL_SERVICE: 'new_mail_service',
  MAIL_PROCESSED: 'mail_processed',
  MAIL_ARCHIVED: 'mail_archived',
  MAIL_REMINDER: 'mail_reminder',
  MAIL_OVERDUE: 'mail_overdue'
};

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  link: {
    type: String,
    default: null
  },
  relatedMail: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mail',
    default: null
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compteur de non-lus (pollé fréquemment par la cloche)
notificationSchema.index({ recipient: 1, isRead: 1 });
// Liste triée par date pour un utilisateur donné
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
