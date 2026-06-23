import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'ldap', 'kerberos', 'imap', 'imap_mail', 'smtp', 'security', 'appearance', 'ocr', 'chatbot', 'excel'],
    default: 'general'
  },
  description: {
    type: String,
    trim: true
  },
  isSecret: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
settingsSchema.index({ category: 1 });

// Méthode statique pour obtenir une valeur
settingsSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Méthode statique pour définir une valeur
settingsSchema.statics.setValue = async function(key, value, category = 'general', description = '', isSecret = false) {
  return await this.findOneAndUpdate(
    { key },
    { value, category, description, isSecret },
    { upsert: true, new: true }
  );
};

// Méthode statique pour obtenir toutes les valeurs d'une catégorie
settingsSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category });
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.isSecret ? '********' : setting.value;
    return acc;
  }, {});
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
