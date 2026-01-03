import mongoose from 'mongoose';

const senderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour la recherche et l'autocomplétion
senderSchema.index({ name: 'text', organization: 'text', email: 'text' });

const Sender = mongoose.model('Sender', senderSchema);

export default Sender;
