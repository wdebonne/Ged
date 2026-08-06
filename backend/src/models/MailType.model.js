import mongoose from 'mongoose';

// Nature du document enregistré (Courrier, Email, Note interne…). Distinct de la
// catégorie : la catégorie porte le classement archivistique et la durée de
// conservation, le type décrit seulement le support / la forme du document.
const mailTypeSchema = new mongoose.Schema({
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
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#4F46E5'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Type présélectionné dans le formulaire d'enregistrement. Un seul à la fois :
  // les routes d'écriture retirent le drapeau des autres types.
  isDefault: {
    type: Boolean,
    default: false
  },
  // Ordre d'affichage dans les listes déroulantes (à défaut : ordre alphabétique)
  order: {
    type: Number,
    default: 0
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

mailTypeSchema.index({ name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });
mailTypeSchema.index({ isActive: 1, order: 1 });

const MailType = mongoose.model('MailType', mailTypeSchema);

export default MailType;
