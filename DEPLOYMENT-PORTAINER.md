# 🐳 Guide de Déploiement Portainer - GED Courrier

Ce guide explique comment déployer et mettre à jour l'application GED Courrier en production via **Portainer**.

## 📋 Table des matières

- [Prérequis](#-prérequis)
- [Architecture](#-architecture)
- [Premier Déploiement](#-premier-déploiement)
- [Mise à Jour](#-mise-à-jour)
- [Variables d'environnement](#-variables-denvironnement)
- [Gestion des Volumes](#-gestion-des-volumes)
- [Dépannage](#-dépannage)

---

## 📋 Prérequis

- **Serveur** avec Docker installé
- **Portainer** installé et accessible (Community ou Business Edition)
- **Git** installé sur le serveur
- Accès SSH au serveur (pour les mises à jour)
- (Optionnel) Reverse proxy configuré (Nginx/Traefik)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Portainer                               │
│              (Gestion des conteneurs)                        │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│    ged-backend      │       │    ged-mongodb      │
│    (Node.js)        │──────▶│    (MongoDB 6)      │
│    Port: 5000       │       │    Port: 27017      │
└─────────────────────┘       └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Volumes Docker                            │
├─────────────────────────────────────────────────────────────┤
│  • mongodb_data (données MongoDB)                            │
│  • backend_node_modules (dépendances Node.js)               │
│  • ./backend/uploads (fichiers uploadés)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Premier Déploiement

### Étape 1 : Cloner le projet sur le serveur

```bash
# Se connecter au serveur en SSH
ssh user@votre-serveur

# Cloner le repository
cd /opt  # ou votre dossier de préférence
git clone https://votre-repo/ged-courrier.git ged
cd ged
```

### Étape 2 : Builder le frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### Étape 3 : Créer le fichier .env

Créez un fichier `.env` à la racine du projet :

```bash
nano .env
```

Contenu minimal :

```env
# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=VotreMotDePasseSecurise123!

# JWT - Générer avec: openssl rand -base64 32
JWT_SECRET=votre_secret_jwt_tres_long_minimum_32_caracteres
JWT_EXPIRE=7d

# Application
APP_URL=https://ged.votredomaine.com
APP_NAME=GED Courrier
CORS_ORIGIN=https://ged.votredomaine.com

# SMTP (optionnel mais recommandé)
SMTP_HOST=smtp.votredomaine.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@votredomaine.com
SMTP_PASSWORD=votre_mot_de_passe
SMTP_FROM=GED Courrier <no-reply@votredomaine.com>
```

### Étape 4 : Déployer via Portainer

#### Option A : Via l'interface Portainer (Recommandé)

1. Connectez-vous à Portainer
2. Sélectionnez votre environnement (endpoint)
3. Allez dans **Stacks** → **Add stack**
4. Donnez un nom à la stack : `ged-courrier`
5. Choisissez **Repository** ou **Upload** selon votre préférence :

   **Option Repository (Git):**
   - Repository URL: `https://votre-repo/ged-courrier.git`
   - Compose path: `docker-compose.yml`
   - Cochez "Automatic updates" si souhaité

   **Option Upload:**
   - Copiez le contenu de `docker-compose.yml`

6. Dans la section **Environment variables**, ajoutez vos variables ou chargez le fichier `.env`
7. Cliquez sur **Deploy the stack**

#### Option B : Via la ligne de commande

```bash
# Depuis le dossier du projet
docker-compose up -d
```

### Étape 5 : Vérifier le déploiement

Dans Portainer :
1. Allez dans **Containers**
2. Vérifiez que `ged-backend` et `ged-mongodb` sont en état **running**
3. Cliquez sur `ged-backend` → **Logs** pour voir les logs

L'application devrait être accessible sur `http://votre-serveur:5000`

---

## 🔄 Mise à Jour

### Méthode 1 : Via SSH (Recommandé)

```bash
# Se connecter au serveur
ssh user@votre-serveur
cd /opt/ged

# Récupérer les dernières modifications
git pull

# Rebuilder le frontend si nécessaire
cd frontend
npm install
npm run build
cd ..

# Redémarrer le conteneur backend
docker restart ged-backend
```

### Méthode 2 : Via Portainer

1. **Mettre à jour le code** (via SSH comme ci-dessus, ou si vous utilisez Git dans Portainer)

2. **Redémarrer le conteneur** :
   - Portainer → Containers → `ged-backend`
   - Cliquez sur **Restart**

3. **Si vous avez modifié docker-compose.yml ou Dockerfile** :
   - Portainer → Stacks → `ged-courrier`
   - Cliquez sur **Pull and redeploy**
   - Cochez **Re-pull image and redeploy** si nécessaire

### Méthode 3 : Script automatique

Créez un script `update.sh` sur votre serveur :

```bash
#!/bin/bash
# Script de mise à jour GED Courrier

set -e
cd /opt/ged

echo "📥 Récupération des mises à jour..."
git pull

echo "🔨 Build du frontend..."
cd frontend
npm install --production=false
npm run build
cd ..

echo "🔄 Redémarrage du conteneur..."
docker restart ged-backend

echo "✅ Mise à jour terminée !"
echo "📋 Logs du conteneur :"
docker logs --tail 20 ged-backend
```

Rendez-le exécutable :
```bash
chmod +x update.sh
```

Lancez la mise à jour :
```bash
./update.sh
```

---

## 🔧 Variables d'environnement

### Variables obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MONGO_ROOT_USER` | Utilisateur MongoDB | `admin` |
| `MONGO_ROOT_PASSWORD` | Mot de passe MongoDB | `SecurePass123!` |
| `JWT_SECRET` | Secret pour les tokens JWT (min 32 car.) | `openssl rand -base64 32` |
| `APP_URL` | URL publique de l'application | `https://ged.exemple.com` |
| `CORS_ORIGIN` | Origines autorisées | `https://ged.exemple.com` |

### Variables optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `JWT_EXPIRE` | Durée de validité des tokens | `7d` |
| `APP_NAME` | Nom affiché de l'application | `GED Courrier` |
| `MAX_FILE_SIZE` | Taille max des fichiers (octets) | `50000000` |

### Variables SMTP (envoi d'emails)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SMTP_HOST` | Serveur SMTP | - |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_SECURE` | SSL/TLS direct | `false` |
| `SMTP_USER` | Utilisateur SMTP | - |
| `SMTP_PASSWORD` | Mot de passe SMTP | - |
| `SMTP_FROM` | Adresse d'expédition | - |

### Variables LDAP (authentification annuaire)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `LDAP_ENABLED` | Activer LDAP | `false` |
| `LDAP_URL` | URL du serveur LDAP | - |
| `LDAP_BIND_DN` | DN de connexion | - |
| `LDAP_BIND_PASSWORD` | Mot de passe LDAP | - |
| `LDAP_SEARCH_BASE` | Base de recherche | - |
| `LDAP_SEARCH_FILTER` | Filtre de recherche | - |

### Variables IMAP (import automatique d'emails)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `IMAP_ENABLED` | Activer l'import IMAP | `false` |
| `IMAP_HOST` | Serveur IMAP | - |
| `IMAP_PORT` | Port IMAP | `993` |
| `IMAP_USER` | Utilisateur IMAP | - |
| `IMAP_PASSWORD` | Mot de passe IMAP | - |
| `IMAP_TLS` | Utiliser TLS | `true` |
| `IMAP_MAILBOX` | Boîte à surveiller | `INBOX` |
| `IMAP_CHECK_INTERVAL` | Intervalle de vérification (min) | `5` |

---

## 💾 Gestion des Volumes

### Volumes créés automatiquement

| Volume | Description | Persistance |
|--------|-------------|-------------|
| `mongodb_data` | Données MongoDB | ✅ Critique |
| `backend_node_modules` | Dépendances Node.js | ⚠️ Recréable |

### Dossiers montés (bind mounts)

| Chemin hôte | Chemin conteneur | Mode |
|-------------|------------------|------|
| `./backend/src` | `/app/backend/src` | Lecture seule |
| `./frontend/dist` | `/app/frontend/dist` | Lecture seule |
| `./backend/uploads` | `/app/uploads` | Lecture/Écriture |

### Sauvegarder les données

```bash
# Sauvegarder MongoDB
docker exec ged-mongodb mongodump \
  --username admin \
  --password VotreMotDePasse \
  --authenticationDatabase admin \
  --out /data/backup

docker cp ged-mongodb:/data/backup ./backup-mongodb-$(date +%Y%m%d)

# Sauvegarder les uploads
tar -czvf backup-uploads-$(date +%Y%m%d).tar.gz ./backend/uploads
```

### Restaurer les données

```bash
# Restaurer MongoDB
docker cp ./backup-mongodb-20240115 ged-mongodb:/data/backup
docker exec ged-mongodb mongorestore \
  --username admin \
  --password VotreMotDePasse \
  --authenticationDatabase admin \
  /data/backup

# Restaurer les uploads
tar -xzvf backup-uploads-20240115.tar.gz
```

---

## 🔒 Configuration Reverse Proxy (Nginx)

Si vous utilisez Nginx comme reverse proxy :

```nginx
server {
    listen 80;
    server_name ged.votredomaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ged.votredomaine.com;

    ssl_certificate /etc/letsencrypt/live/ged.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ged.votredomaine.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Dépannage

### Voir les logs d'un conteneur

**Via Portainer :**
- Containers → `ged-backend` → Logs

**Via CLI :**
```bash
# Logs en temps réel
docker logs -f ged-backend

# 100 dernières lignes
docker logs --tail 100 ged-backend

# Logs avec timestamp
docker logs -t ged-backend
```

### Le conteneur ne démarre pas

```bash
# Vérifier l'état des conteneurs
docker ps -a

# Voir les logs d'erreur
docker logs ged-backend

# Problèmes courants :
# - Frontend non buildé → cd frontend && npm run build
# - Permissions uploads → chmod -R 755 ./backend/uploads
# - MongoDB non accessible → vérifier que ged-mongodb est démarré
```

### Erreur de connexion MongoDB

```bash
# Vérifier que MongoDB est accessible
docker exec ged-backend ping mongodb

# Tester la connexion MongoDB
docker exec -it ged-mongodb mongosh \
  -u admin \
  -p VotreMotDePasse \
  --authenticationDatabase admin
```

### Réinstaller les dépendances Node.js

```bash
# Supprimer le volume des node_modules
docker volume rm ged_backend_node_modules

# Redémarrer le conteneur (les dépendances seront réinstallées)
docker restart ged-backend
```

### Reset complet de la stack

```bash
# Arrêter et supprimer les conteneurs
docker-compose down

# Supprimer aussi les volumes (⚠️ PERTE DE DONNÉES)
docker-compose down -v

# Recréer
docker-compose up -d
```

### Accéder au shell d'un conteneur

```bash
# Backend
docker exec -it ged-backend sh

# MongoDB
docker exec -it ged-mongodb mongosh
```

---

## 📊 Monitoring dans Portainer

### Métriques à surveiller

1. **CPU/Mémoire** : Containers → Stats
2. **Logs** : Containers → Logs
3. **État de santé** : Containers → État (running/stopped)

### Alertes recommandées

Configurez des alertes dans Portainer (Business Edition) ou utilisez des outils externes :

- Conteneur arrêté
- Utilisation CPU > 80%
- Utilisation mémoire > 80%
- Espace disque faible sur les volumes

---

## 📝 Checklist de déploiement

### Premier déploiement

- [ ] Cloner le repository
- [ ] Créer le fichier `.env` avec les variables obligatoires
- [ ] Builder le frontend (`npm run build`)
- [ ] Créer la stack dans Portainer
- [ ] Vérifier que les conteneurs sont running
- [ ] Tester l'accès à l'application
- [ ] Configurer le reverse proxy (si nécessaire)
- [ ] Configurer SSL/HTTPS

### Mise à jour

- [ ] `git pull` pour récupérer les changements
- [ ] `npm run build` dans frontend (si modifié)
- [ ] Redémarrer le conteneur backend
- [ ] Vérifier les logs
- [ ] Tester l'application

---

## 📚 Ressources utiles

- [Documentation Portainer](https://docs.portainer.io/)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Guide DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement général
- [Guide DEPLOYMENT-O2SWITCH.md](./DEPLOYMENT-O2SWITCH.md) - Déploiement O2Switch

---

*Dernière mise à jour : Janvier 2026*
