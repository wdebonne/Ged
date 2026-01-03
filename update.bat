@echo off
REM ═══════════════════════════════════════════════════════════════
REM GED Courrier - Script de mise à jour (Windows avec volumes montés)
REM ═══════════════════════════════════════════════════════════════
REM Pas besoin de rebuild l'image - les fichiers sont montés !

echo ═══════════════════════════════════════════════════════════════
echo          GED Courrier - Mise à jour de l'application
echo ═══════════════════════════════════════════════════════════════
echo.

REM Vérifier qu'on est dans le bon dossier
if not exist "docker-compose.yml" (
    echo ❌ Erreur: docker-compose.yml non trouvé
    echo Lancez ce script depuis le dossier racine du projet GED
    pause
    exit /b 1
)

REM Étape 1: Récupérer les dernières modifications
echo 📥 Étape 1/3: Récupération des mises à jour...
git fetch origin
git pull origin main
echo ✅ Code mis à jour
echo.

REM Étape 2: Rebuild le frontend
echo 🔨 Étape 2/3: Construction du frontend...
cd frontend
call npm install
call npm run build
cd ..
echo ✅ Frontend buildé
echo.

REM Détecter le fichier docker-compose
if exist "docker-compose.standalone.yml" (
    set COMPOSE_FILE=docker-compose.standalone.yml
) else (
    set COMPOSE_FILE=docker-compose.yml
)
echo 📄 Utilisation de: %COMPOSE_FILE%
echo.

REM Étape 3: Redémarrer le conteneur (les volumes montés reflètent déjà les changements)
echo 🔄 Étape 3/3: Redémarrage du conteneur...
docker-compose -f %COMPOSE_FILE% restart ged-backend
echo.

REM Vérification
echo ═══════════════════════════════════════════════════════════════
echo ✅ Mise à jour terminée !
echo ═══════════════════════════════════════════════════════════════
echo.
echo Vérification du statut:
docker-compose -f %COMPOSE_FILE% ps
echo.
echo Appuyez sur une touche pour voir les logs (Ctrl+C pour quitter)...
pause >nul
docker-compose -f %COMPOSE_FILE% logs -f --tail=20 ged-backend
