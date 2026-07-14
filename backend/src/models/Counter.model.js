import mongoose from 'mongoose';

// Compteur séquentiel annuel pour la numérotation chronologique des courriers.
// _id : `${scope}-${year}` (ex: 'incoming-2026', 'outgoing-2026')
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// Incrémente et retourne le prochain numéro de séquence de façon atomique
counterSchema.statics.getNextSequence = async function(scope, year) {
  const counter = await this.findOneAndUpdate(
    { _id: `${scope}-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
};

// Formate un numéro d'ordre chronologique : 2026-0001
export const formatChronoNumber = (year, seq) => `${year}-${String(seq).padStart(4, '0')}`;

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
