import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // L'environnement (JWT_SECRET, UPLOAD_PATH…) doit être posé avant
    // l'import de src/app.js par les fichiers de test
    setupFiles: ['./tests/helpers/env.js'],
    // Premier lancement : mongodb-memory-server télécharge un binaire MongoDB
    hookTimeout: 120000,
    testTimeout: 30000,
    // Une base mémoire par fichier, exécutés en série (machine modeste + uploads partagés)
    fileParallelism: false
  }
});
