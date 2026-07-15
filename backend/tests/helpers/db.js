import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Mail, OutgoingMail } from '../../src/models/index.js';

let mongod;

// Démarre une instance MongoDB en mémoire et s'y connecte.
// Attend la création des index (la recherche s'appuie sur les index $text).
export async function connectTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Mail.init(), OutgoingMail.init()]);
}

export async function disconnectTestDb() {
  // Laisse retomber les écritures fire-and-forget (notifications, audit)
  await new Promise(resolve => setTimeout(resolve, 100));
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}
