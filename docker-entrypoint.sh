#!/bin/sh
set -e

echo "🚀 Démarrage GED Courrier..."

# Installer les dépendances backend si nécessaire
if [ -f "/app/backend/package.json" ]; then
    if [ ! -d "/app/backend/node_modules" ] || [ "/app/backend/package.json" -nt "/app/backend/node_modules" ]; then
        echo "📦 Installation des dépendances backend..."
        cd /app/backend
        npm ci --only=production
    else
        echo "✅ Dépendances backend déjà installées"
    fi
fi

# Vérifier que le frontend est buildé
if [ ! -d "/app/frontend/dist" ] || [ ! -f "/app/frontend/dist/index.html" ]; then
    echo "⚠️  Frontend non buildé. Veuillez exécuter 'npm run build' dans le dossier frontend"
    echo "   ou utiliser le Dockerfile standard qui build automatiquement."
fi

cd /app

echo "✅ Démarrage du serveur..."
exec "$@"
