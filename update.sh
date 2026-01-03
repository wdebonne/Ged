#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# GED Courrier - Script de mise à jour (avec volumes montés)
# ═══════════════════════════════════════════════════════════════
# Pas besoin de rebuild l'image - les fichiers sont montés !

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "         GED Courrier - Mise à jour de l'application"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier qu'on est dans le bon dossier
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erreur: docker-compose.yml non trouvé${NC}"
    echo "Lancez ce script depuis le dossier racine du projet GED"
    exit 1
fi

# Étape 1: Récupérer les dernières modifications
echo -e "${YELLOW}📥 Étape 1/3: Récupération des mises à jour...${NC}"
git fetch origin
git pull origin main
echo -e "${GREEN}✅ Code mis à jour${NC}"
echo ""

# Étape 2: Rebuild le frontend
echo -e "${YELLOW}🔨 Étape 2/3: Construction du frontend...${NC}"
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✅ Frontend buildé${NC}"
echo ""

# Détecter le fichier docker-compose
if [ -f "docker-compose.standalone.yml" ]; then
    COMPOSE_FILE="docker-compose.standalone.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi
echo -e "${GREEN}📄 Utilisation de: $COMPOSE_FILE${NC}"
echo ""

# Étape 3: Redémarrer le conteneur (les volumes montés reflètent déjà les changements)
echo -e "${YELLOW}🔄 Étape 3/3: Redémarrage du conteneur...${NC}"
docker-compose -f $COMPOSE_FILE restart ged-backend
echo -e "${GREEN}✅ Conteneur redémarré${NC}"
echo ""

# Vérification
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Mise à jour terminée !${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Vérification du statut:"
docker-compose -f $COMPOSE_FILE ps
echo ""
echo "Logs (Ctrl+C pour quitter):"
docker-compose -f $COMPOSE_FILE logs -f --tail=20 ged-backend
