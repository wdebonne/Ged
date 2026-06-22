import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ged';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connecté à MongoDB');

  const db = mongoose.connection.db;
  const services = db.collection('services');

  const withSupervisor = await services.find({ supervisor: { $ne: null } }).toArray();
  console.log(`${withSupervisor.length} service(s) avec un superviseur existant`);

  for (const svc of withSupervisor) {
    await services.updateOne(
      { _id: svc._id },
      {
        $set: { supervisors: [svc.supervisor] },
        $unset: { supervisor: '' }
      }
    );
    console.log(`  ✓ ${svc.name}: supervisor migré vers supervisors[]`);
  }

  const withoutSupervisor = await services.updateMany(
    { supervisor: null, supervisors: { $exists: false } },
    { $set: { supervisors: [] }, $unset: { supervisor: '' } }
  );
  console.log(`${withoutSupervisor.modifiedCount} service(s) sans superviseur mis à jour`);

  const remaining = await services.updateMany(
    { supervisor: { $exists: true } },
    { $unset: { supervisor: '' } }
  );
  if (remaining.modifiedCount > 0) {
    console.log(`${remaining.modifiedCount} champ(s) supervisor résiduel(s) nettoyé(s)`);
  }

  console.log('Migration terminée');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Erreur de migration:', err);
  process.exit(1);
});
