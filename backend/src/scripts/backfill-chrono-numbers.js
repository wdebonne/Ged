import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ged';

const formatChronoNumber = (year, seq) => `${year}-${String(seq).padStart(4, '0')}`;

// Attribue les numéros d'ordre manquants d'une collection, par année,
// en continuant après le compteur existant pour ne jamais créer de doublon.
async function backfillCollection(db, collectionName, scope, dateField, fallbackField) {
  const collection = db.collection(collectionName);
  const counters = db.collection('counters');

  const docs = await collection
    .find({ chronoNumber: { $exists: false } })
    .project({ [dateField]: 1, [fallbackField]: 1 })
    .toArray();

  docs.sort((a, b) => {
    const dateA = new Date(a[dateField] || a[fallbackField] || 0);
    const dateB = new Date(b[dateField] || b[fallbackField] || 0);
    return dateA - dateB;
  });

  const byYear = new Map();
  for (const doc of docs) {
    const date = new Date(doc[dateField] || doc[fallbackField] || Date.now());
    const year = date.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(doc);
  }

  for (const [year, yearDocs] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const counterId = `${scope}-${year}`;
    const existing = await counters.findOne({ _id: counterId });
    let seq = existing ? existing.seq : 0;

    for (const doc of yearDocs) {
      seq += 1;
      await collection.updateOne(
        { _id: doc._id },
        { $set: { chronoNumber: formatChronoNumber(year, seq) } }
      );
    }

    await counters.updateOne(
      { _id: counterId },
      { $max: { seq } },
      { upsert: true }
    );

    console.log(`  ✓ ${scope} ${year}: ${yearDocs.length} numéro(s) attribué(s), compteur à ${seq}`);
  }

  return docs.length;
}

async function backfill() {
  await mongoose.connect(MONGO_URI);
  console.log('Connecté à MongoDB');

  const db = mongoose.connection.db;

  console.log('Courriers entrants (tri par date de réception)...');
  const incoming = await backfillCollection(db, 'mails', 'incoming', 'receivedDate', 'createdAt');

  console.log('Courriers sortants (tri par date de création)...');
  const outgoing = await backfillCollection(db, 'outgoingmails', 'outgoing', 'createdAt', 'sentDate');

  console.log(`Terminé : ${incoming} entrant(s) et ${outgoing} sortant(s) numérotés`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('Erreur de backfill:', err);
  process.exit(1);
});
