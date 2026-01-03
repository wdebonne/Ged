// app.js - Point d'entrée optimisé pour O2Switch
// Ce fichier doit être placé dans : applications/ged-courrier/backend/app.js

// Réduire le nombre de threads pour économiser la mémoire
process.env.UV_THREADPOOL_SIZE = '2';

// Désactiver le mode de débogage de certaines librairies
process.env.DEBUG = '';

// Forcer le garbage collector à être plus agressif (si disponible)
if (global.gc) {
  setInterval(() => {
    try {
      global.gc();
    } catch (e) {
      // Ignorer si gc n'est pas disponible
    }
  }, 60000); // Toutes les 60 secondes
}

// Importer et démarrer le serveur
import('./src/server.js').catch(err => {
  console.error('Erreur au démarrage du serveur:', err);
  process.exit(1);
});
