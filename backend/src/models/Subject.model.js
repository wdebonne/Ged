import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#4F46E5'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour la recherche et l'autocomplétion
subjectSchema.index({ name: 'text', category: 'text' });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
