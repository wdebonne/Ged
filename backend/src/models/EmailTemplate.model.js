import mongoose from 'mongoose';

const EMAIL_ACTIONS = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  MAIL_TO_PROCESS: 'mail_to_process',
  MAIL_ASSIGNED: 'mail_assigned',
  MAIL_REMINDER: 'mail_reminder',
  MAIL_OVERDUE: 'mail_overdue',
  // Notifications automatiques
  SUPERVISOR_NEW_MAIL: 'supervisor_new_mail',
  CORECIPIENT_PROCESSED: 'corecipient_processed',
  CORECIPIENT_ARCHIVED: 'corecipient_archived',
  CUSTOM: 'custom'
};

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    enum: Object.values(EMAIL_ACTIONS),
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  attachPdf: {
    type: Boolean,
    default: false
  },
  variables: [{
    type: String
  }],
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

// Index pour recherche rapide par action
emailTemplateSchema.index({ action: 1, isActive: 1 });

// Méthode statique pour obtenir le template actif pour une action
emailTemplateSchema.statics.getActiveByAction = async function(action) {
  return this.findOne({ action, isActive: true }).sort({ updatedAt: -1 });
};

// Variables disponibles par type d'action
emailTemplateSchema.statics.getAvailableVariables = function(action) {
  const commonVars = ['{{appName}}', '{{appUrl}}', '{{currentDate}}', '{{currentYear}}'];
  
  const actionVars = {
    [EMAIL_ACTIONS.WELCOME]: [
      '{{userName}}', '{{userEmail}}', '{{userFirstName}}', '{{userLastName}}',
      '{{temporaryPassword}}', '{{loginUrl}}'
    ],
    [EMAIL_ACTIONS.PASSWORD_RESET]: [
      '{{userName}}', '{{userEmail}}', '{{userFirstName}}', '{{userLastName}}',
      '{{resetLink}}', '{{resetToken}}', '{{expirationTime}}'
    ],
    [EMAIL_ACTIONS.MAIL_TO_PROCESS]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{senderName}}', '{{mailDate}}', '{{mailPriority}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.MAIL_ASSIGNED]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{senderName}}', '{{assignedBy}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.MAIL_REMINDER]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{daysRemaining}}', '{{dueDate}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.MAIL_OVERDUE]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{daysOverdue}}', '{{dueDate}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.SUPERVISOR_NEW_MAIL]: [
      '{{userName}}', '{{userFirstName}}', '{{serviceName}}',
      '{{mailReference}}', '{{mailSubject}}', '{{senderName}}', 
      '{{mailDate}}', '{{mailPriority}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.CORECIPIENT_PROCESSED]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{senderName}}', '{{processedBy}}', '{{processedDate}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.CORECIPIENT_ARCHIVED]: [
      '{{userName}}', '{{userFirstName}}', '{{mailReference}}', '{{mailSubject}}',
      '{{senderName}}', '{{archivedBy}}', '{{archivedDate}}', '{{mailUrl}}'
    ],
    [EMAIL_ACTIONS.CUSTOM]: []
  };
  
  return [...commonVars, ...(actionVars[action] || [])];
};

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

export { EMAIL_ACTIONS };
export default EmailTemplate;
