import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#6366F1'
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notifySupervisor: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour la recherche
serviceSchema.index({ name: 'text', code: 'text' });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
