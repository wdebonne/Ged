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
  // Libellé de la catégorie, dénormalisé depuis `categoryRef` (recherche + compatibilité)
  category: {
    type: String,
    trim: true
  },
  // Catégorie de référence : porte la durée de conservation RGPD
  categoryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
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
subjectSchema.index({ categoryRef: 1 });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
