# Guide de Déploiement - GED Courrier

Ce guide explique comment déployer l'application GED Courrier en production avec un nom de domaine.

> 📘 **Déploiement sur O2Switch ?** Consultez le guide dédié : [DEPLOYMENT-O2SWITCH.md](DEPLOYMENT-O2SWITCH.md)

## 📋 Prérequis

### Déploiement classique (Node.js)
- Node.js 18+
- MongoDB 6+
- Nginx ou Apache (pour le reverse proxy)
- Certificat SSL (Let's Encrypt recommandé)
- PM2 pour la gestion des processus Node.js

### Déploiement Docker
- Docker 20+
- Docker Compose 2+
- (Optionnel) MongoDB externe si vous utilisez `docker-compose.standalone.yml`

## 🏗️ Architecture de déploiement

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Nginx (Reverse Proxy)                    │
│                 https://mondomaine.com                   │
│                                                         │
│  /           → Frontend (fichiers statiques)            │
│  /api        → Backend (port 5000)                      │
│  /uploads    → Backend (port 5000)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Node.js (PM2)                       │
│              Port 5000 (localhost)                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     MongoDB                              │
│                localhost:27017                           │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### 1. Backend (.env)

Créez le fichier `backend/.env` à partir de `backend/.env.example` :

```env
# ═══════════════════════════════════════════════════════════════
# CONFIGURATION DU SERVEUR
# ═══════════════════════════════════════════════════════════════
PORT=5000
NODE_ENV=production

# ═══════════════════════════════════════════════════════════════
# BASE DE DONNÉES MONGODB
# ═══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017/ged_courrier
# Avec authentification:
# MONGODB_URI=mongodb://user:password@localhost:27017/ged_courrier?authSource=admin

# ═══════════════════════════════════════════════════════════════
# AUTHENTIFICATION JWT
# ═══════════════════════════════════════════════════════════════
# IMPORTANT: Changez ces valeurs en production !
# Générez avec: openssl rand -base64 32
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_minimum_32_caracteres
JWT_EXPIRE=15m                 # Durée de vie des access tokens (court : 15m recommandé)
JWT_REFRESH_SECRET=votre_secret_refresh_different_du_jwt_secret  # Clé séparée pour les refresh tokens
JWT_REFRESH_EXPIRE=7d          # Durée de vie des refresh tokens (long : 7d recommandé)

# ═══════════════════════════════════════════════════════════════
# CORS - Domaines autorisés (séparés par des virgules)
# ═══════════════════════════════════════════════════════════════
CORS_ORIGIN=https://mondomaine.com,https://www.mondomaine.com

# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
APP_URL=https://mondomaine.com
APP_NAME=GED Courrier

# ═══════════════════════════════════════════════════════════════
# UPLOAD DE FICHIERS
# ═══════════════════════════════════════════════════════════════
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000  # 50MB en octets

# ═══════════════════════════════════════════════════════════════
# SMTP - Envoi d'emails (optionnel mais recommandé)
# ═══════════════════════════════════════════════════════════════
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false  # true pour port 465, false pour 587 avec STARTTLS
SMTP_USER=no-reply@mondomaine.com
SMTP_PASSWORD=votre_mot_de_passe
SMTP_FROM=GED Courrier <no-reply@mondomaine.com>

# ═══════════════════════════════════════════════════════════════
# LDAP - Authentification annuaire (optionnel)
# ═══════════════════════════════════════════════════════════════
LDAP_ENABLED=false
LDAP_URL=ldap://votre-serveur-ldap:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=votre_mot_de_passe
LDAP_SEARCH_BASE=dc=example,dc=com
LDAP_SEARCH_FILTER=(uid={{username}})

# ═══════════════════════════════════════════════════════════════
# KERBEROS - Authentification SSO (optionnel)
# ═══════════════════════════════════════════════════════════════
KERBEROS_ENABLED=false
KERBEROS_REALM=EXAMPLE.COM
KERBEROS_KDC=kdc.example.com
KERBEROS_SERVICE_PRINCIPAL=HTTP/ged.example.com@EXAMPLE.COM

# ═══════════════════════════════════════════════════════════════
# IMAP - Import automatique d'emails (optionnel)
# ═══════════════════════════════════════════════════════════════
IMAP_ENABLED=false
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_USER=courrier@example.com
IMAP_PASSWORD=votre_mot_de_passe
IMAP_TLS=true
IMAP_MAILBOX=INBOX
IMAP_PROCESSED_FOLDER=Traités
IMAP_CHECK_INTERVAL=5  # minutes
```

### 2. Frontend (.env)

Créez le fichier `frontend/.env` à partir de `frontend/.env.example` :

```env
# En production avec Nginx, les chemins relatifs fonctionnent
VITE_API_URL=/api
VITE_UPLOADS_URL=/uploads
```

## 📦 Build du Frontend

```bash
cd frontend
npm install
npm run build
```

Les fichiers statiques seront générés dans `frontend/dist/`.

## 🚀 Démarrage du Backend avec PM2

```bash
# Installation de PM2
npm install -g pm2

# Démarrer le backend
cd backend
npm install --production
pm2 start src/server.js --name "ged-backend"

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

## 🌐 Configuration Nginx Proxy Manager (Recommandé)

Nginx Proxy Manager (NPM) simplifie la configuration du reverse proxy avec une interface graphique.

### Prérequis NPM

- Nginx Proxy Manager installé et accessible (généralement `http://ip-serveur:81`)
- Backend GED démarré sur le port 5000

### Méthode 1 : Frontend servi par le Backend (Recommandé)

Cette méthode est la plus simple : le backend Node.js sert directement le frontend buildé.

#### Configuration du Proxy Host

1. **Connectez-vous** à NPM : `http://ip-serveur:81`

2. **Proxy Hosts** → **Add Proxy Host**

3. **Onglet Details** :
   | Champ | Valeur |
   |-------|--------|
   | Domain Names | `mondomaine.com` (+ `www.mondomaine.com`) |
   | Scheme | `http` |
   | Forward Hostname / IP | `127.0.0.1` |
   | Forward Port | `5000` |
   | Cache Assets | ✅ |
   | Block Common Exploits | ✅ |
   | Websockets Support | ❌ |

4. **Onglet SSL** :
   | Option | Valeur |
   |--------|--------|
   | SSL Certificate | Request a new SSL Certificate |
   | Force SSL | ✅ |
   | HTTP/2 Support | ✅ |
   | HSTS Enabled | ✅ |
   | Email | `votre@email.com` |

5. **Onglet Advanced** (copier-coller) :
   ```nginx
   # Taille max des uploads (50MB)
   client_max_body_size 50M;
   
   # Timeout pour les uploads longs
   proxy_read_timeout 300s;
   proxy_connect_timeout 75s;
   ```

6. **Save** et testez `https://mondomaine.com`

### Méthode 2 : Frontend séparé (avancé)

Si vous préférez servir le frontend depuis un serveur statique séparé.

#### Onglet Advanced (configuration complète) :

```nginx
# Taille max des uploads (50MB)
client_max_body_size 50M;

# Timeout pour les uploads longs
proxy_read_timeout 300s;
proxy_connect_timeout 75s;

# Frontend - Fichiers statiques
location / {
    root /var/www/ged-courrier/frontend/dist;
    try_files $uri $uri/ /index.html;
    
    # Cache pour les assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# API Backend
location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Fichiers uploadés (PDF, avatars, etc.)
location /uploads {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Cache pour les fichiers
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
}
```

---

## 🌐 Configuration Nginx manuelle (Alternative)

### Configuration complète avec SSL

```nginx
# /etc/nginx/sites-available/ged-courrier
server {
    listen 80;
    server_name mondomaine.com www.mondomaine.com;
    
    # Redirection HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mondomaine.com www.mondomaine.com;

    # Certificats SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/mondomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mondomaine.com/privkey.pem;
    
    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Logs
    access_log /var/log/nginx/ged-access.log;
    error_log /var/log/nginx/ged-error.log;

    # Taille maximale des uploads (50MB)
    client_max_body_size 50M;

    # Proxy vers le backend pour /api
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy vers le backend pour /uploads (fichiers)
    location /uploads {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache pour les fichiers statiques
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # Frontend (fichiers statiques)
    location / {
        root /var/www/ged-courrier/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
```

### Activation de la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/ged-courrier /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Installation du certificat SSL avec Let's Encrypt

```bash
# Installation de Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d mondomaine.com -d www.mondomaine.com

# Renouvellement automatique (déjà configuré par défaut)
sudo certbot renew --dry-run
```

## 🐳 Docker : Options de déploiement

Plusieurs configurations Docker sont disponibles selon votre infrastructure.

### ✨ Avantages des volumes montés

Les fichiers Docker utilisent des **volumes montés** pour les fichiers sources :

| Avantage | Description |
|----------|-------------|
| 🚀 **Mise à jour rapide** | Pas besoin de reconstruire l'image Docker |
| 📂 **Accès direct aux fichiers** | Modifiez les fichiers directement sur l'hôte |
| 🔄 **Redémarrage simple** | `docker-compose restart` suffit après un `git pull` |
| 💾 **Uploads persistants** | Les fichiers uploadés sont stockés sur l'hôte |

### Prérequis Docker

Avant de lancer Docker, **buildez le frontend** :

```bash
cd frontend
npm install
npm run build
cd ..
```

---

### Option 1 : Docker sans MongoDB (Recommandé si MongoDB existe déjà)

Utilisez `docker-compose.standalone.yml` si vous avez déjà MongoDB installé.

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Nginx Proxy Manager (existant)               │
│                    (Port 80/443)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  GED Backend (Docker)                    │
│                     (Port 5000)                          │
│         Sert le frontend + API + Uploads                 │
│                                                         │
│         📂 Volumes montés:                               │
│         - backend/src → /app/backend/src                │
│         - frontend/dist → /app/frontend/dist            │
│         - backend/uploads → /app/uploads                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              MongoDB (existant sur l'hôte)               │
│                   (Port 27017)                           │
└─────────────────────────────────────────────────────────┘
```

#### Fichier docker-compose.standalone.yml

```yaml
version: '3.8'

services:
  ged-backend:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: ged-backend
    restart: unless-stopped
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=${MONGODB_URI:-mongodb://host.docker.internal:27017/ged_courrier}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRE=${JWT_EXPIRE:-15m}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_REFRESH_EXPIRE=${JWT_REFRESH_EXPIRE:-7d}
      - APP_URL=${APP_URL}
      - APP_NAME=${APP_NAME:-GED Courrier}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - UPLOAD_PATH=/app/uploads
      - MAX_FILE_SIZE=${MAX_FILE_SIZE:-50000000}
      # ... autres variables (SMTP, LDAP, IMAP...)
    volumes:
      # ═══════════════════════════════════════════════════════════
      # POINTS DE MONTAGE - Fichiers sources
      # ═══════════════════════════════════════════════════════════
      # Backend (code source - lecture seule)
      - ./backend/src:/app/backend/src:ro
      - ./backend/package.json:/app/backend/package.json:ro
      - ./backend/package-lock.json:/app/backend/package-lock.json:ro
      # Frontend (buildé - lecture seule)
      - ./frontend/dist:/app/frontend/dist:ro
      # Uploads (lecture/écriture)
      - ./backend/uploads:/app/uploads
      # Node modules (volume persistant)
      - backend_node_modules:/app/backend/node_modules
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  backend_node_modules:
```

#### Fichier .env pour MongoDB externe

```env
# MongoDB externe
# Sur l'hôte local:
MONGODB_URI=mongodb://host.docker.internal:27017/ged_courrier
# Avec authentification:
# MONGODB_URI=mongodb://user:password@host.docker.internal:27017/ged_courrier?authSource=admin
# Sur un autre serveur:
# MONGODB_URI=mongodb://user:password@192.168.1.100:27017/ged_courrier?authSource=admin

# Application
JWT_SECRET=VotreSecretJWT_TresLong_Minimum32Caracteres
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=VotreSecretRefresh_Different_Du_JWT_Secret
JWT_REFRESH_EXPIRE=7d
APP_URL=https://ged.mondomaine.com
APP_NAME=GED Courrier
CORS_ORIGIN=https://ged.mondomaine.com
MAX_FILE_SIZE=50000000

# SMTP (optionnel)
SMTP_HOST=smtp.exemple.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@mondomaine.com
SMTP_PASSWORD=VotreMotDePasseSMTP
SMTP_FROM=GED Courrier <no-reply@mondomaine.com>

# LDAP/Kerberos/IMAP - voir .env.standalone.example pour toutes les options
```

#### Déploiement

```bash
# 1. Configurer l'environnement
cp .env.standalone.example .env
nano .env

# 2. Construire et démarrer
docker-compose -f docker-compose.standalone.yml up -d --build

# 3. Vérifier
docker-compose -f docker-compose.standalone.yml logs -f
```

---

### Option 2 : Docker avec MongoDB inclus

Utilisez `docker-compose.yml` pour une stack complète avec MongoDB conteneurisé.

#### Fichier docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: ged-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-changeme}
    volumes:
      - mongodb_data:/data/db
    networks:
      - ged-network

  ged-backend:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: ged-backend
    restart: unless-stopped
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-changeme}@mongodb:27017/ged_courrier?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
      # ... autres variables (voir .env.example)
    volumes:
      # Points de montage
      - ./backend/src:/app/backend/src:ro
      - ./backend/package.json:/app/backend/package.json:ro
      - ./backend/package-lock.json:/app/backend/package-lock.json:ro
      - ./frontend/dist:/app/frontend/dist:ro
      - ./backend/uploads:/app/uploads
      - backend_node_modules:/app/backend/node_modules
    depends_on:
      - mongodb
    networks:
      - ged-network

volumes:
  mongodb_data:
  backend_node_modules:

networks:
  ged-network:
    driver: bridge
```

#### Déploiement

```bash
# 1. Configurer l'environnement
cp .env.example .env
nano .env

# 2. Builder le frontend
cd frontend && npm install && npm run build && cd ..

# 3. Démarrer (le premier lancement peut prendre quelques minutes)
docker-compose up -d --build

# 4. Exécuter le seed (première installation)
docker-compose exec ged-backend node backend/src/scripts/seed.js
```

---

### Dockerfile.prod (avec volumes montés)

```dockerfile
# Dockerfile de Production avec Volumes Montés
# Les fichiers sources sont montés via des volumes.
# Avantage: Mise à jour sans reconstruction de l'image.

FROM node:18-alpine

WORKDIR /app

# Installer les dépendances système
RUN apk add --no-cache python3 make g++

# Créer les dossiers nécessaires
RUN mkdir -p /app/backend /app/frontend/dist /app/uploads \
    && mkdir -p uploads/courriers uploads/responses uploads/avatars \
    && mkdir -p uploads/pending uploads/archives uploads/branding uploads/temp \
    && chown -R node:node /app

# Script d'entrée
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5000

USER node

ENV NODE_ENV=production
ENV PORT=5000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "backend/src/server.js"]
```

### Dockerfile (classique - sans volumes)

Si vous préférez une image Docker autonome (sans volumes montés), utilisez ce Dockerfile :

```dockerfile
# STAGE 1: Build du Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# STAGE 2: Backend de production
FROM node:18-alpine
WORKDIR /app

# Dépendances système
RUN apk add --no-cache python3 make g++

# Dépendances Node.js
COPY backend/package*.json ./
RUN npm ci --only=production

# Code source
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Dossiers uploads
RUN mkdir -p uploads/courriers uploads/responses uploads/avatars uploads/pending uploads/archives uploads/branding uploads/temp \
    && chown -R node:node /app

USER node
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
```

---

### Configuration NPM externe

Dans votre Nginx Proxy Manager existant :

| Champ | Valeur |
|-------|--------|
| Domain Names | `ged.mondomaine.com` |
| Scheme | `http` |
| Forward Hostname / IP | `127.0.0.1` (ou IP du serveur Docker) |
| Forward Port | `5000` |
| Cache Assets | ✅ |
| Block Common Exploits | ✅ |

**SSL** : Request a new SSL Certificate, Force SSL ✅

**Advanced** :
```nginx
client_max_body_size 50M;
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

---

### 🔄 Scripts de mise à jour (simplifiés grâce aux volumes)

Avec les volumes montés, **plus besoin de reconstruire l'image Docker** !

#### Linux/Mac (update.sh)

```bash
#!/bin/bash
set -e
echo "🔄 Mise à jour GED Courrier..."

# Récupérer le code
git pull origin main

# Builder le frontend
cd frontend && npm install && npm run build && cd ..

# Redémarrer le conteneur (les fichiers sont déjà à jour via les volumes)
docker-compose -f docker-compose.standalone.yml restart ged-backend

echo "✅ Mise à jour terminée !"
docker-compose -f docker-compose.standalone.yml ps
```

#### Windows (update.bat)

```batch
@echo off
echo 🔄 Mise à jour GED Courrier...

git pull origin main

cd frontend
call npm install
call npm run build
cd ..

docker-compose -f docker-compose.standalone.yml restart ged-backend

echo ✅ Mise à jour terminée !
docker-compose -f docker-compose.standalone.yml ps
pause
```

#### Mise à jour en une commande

```bash
# Linux/Mac
./update.sh

# Windows
update.bat

# Ou manuellement (3 étapes)
git pull
cd frontend && npm run build && cd ..
docker-compose -f docker-compose.standalone.yml restart ged-backend
```

> **Note** : Si vous ajoutez de nouvelles dépendances backend (package.json modifié), 
> supprimez le volume node_modules et redémarrez :
> ```bash
> docker-compose -f docker-compose.standalone.yml down
> docker volume rm ged_backend_node_modules
> docker-compose -f docker-compose.standalone.yml up -d
> ```

---

### Commandes Docker utiles

```bash
# Voir les logs
docker-compose -f docker-compose.standalone.yml logs -f ged-backend

# Redémarrer
docker-compose -f docker-compose.standalone.yml restart ged-backend

# Arrêter
docker-compose -f docker-compose.standalone.yml down

# Shell dans le conteneur
docker-compose -f docker-compose.standalone.yml exec ged-backend sh

# Exécuter le seed (première installation)
docker-compose -f docker-compose.standalone.yml exec ged-backend node backend/src/scripts/seed.js

# Backup des uploads (les fichiers sont sur l'hôte dans backend/uploads)
cp -r backend/uploads ./backup_uploads
```

---

## 🛠️ Docker pour le Développement

Utilisez `docker-compose.dev.yml` pour un environnement de développement avec hot-reload.

### Fonctionnalités

- ✅ **Hot-reload** : Les modifications du code sont appliquées instantanément
- ✅ **MongoDB inclus** : Base de données de développement isolée
- ✅ **Mongo Express** : Interface web pour visualiser MongoDB (optionnel)
- ✅ **Volumes persistants** : Les données et node_modules sont conservés

### Architecture Dev

```
┌─────────────────────────────────────────────────────────┐
│              Frontend Vite (Hot-reload)                  │
│              http://localhost:5173                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Nodemon (Hot-reload)                │
│              http://localhost:5000                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  MongoDB (Dev)                           │
│              localhost:27017                             │
└─────────────────────────────────────────────────────────┘
```

### Démarrage rapide

```bash
# Démarrer l'environnement de développement
docker-compose -f docker-compose.dev.yml up

# Avec Mongo Express (interface web MongoDB)
docker-compose -f docker-compose.dev.yml --profile tools up

# En arrière-plan
docker-compose -f docker-compose.dev.yml up -d

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Accès

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Mongo Express | http://localhost:8081 (admin/admin) |
| MongoDB | localhost:27017 |

### Commandes utiles

```bash
# Redémarrer un service
docker-compose -f docker-compose.dev.yml restart backend

# Reconstruire après modification de package.json
docker-compose -f docker-compose.dev.yml up --build

# Exécuter le seed
docker-compose -f docker-compose.dev.yml exec backend node src/scripts/seed.js

# Arrêter et nettoyer
docker-compose -f docker-compose.dev.yml down

# Supprimer les volumes (reset complet)
docker-compose -f docker-compose.dev.yml down -v
```

### Fichier docker-compose.dev.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: ged-mongodb-dev
    ports:
      - '27017:27017'
    volumes:
      - mongodb_dev_data:/data/db
    networks:
      - ged-dev-network

  backend:
    image: node:18-alpine
    container_name: ged-backend-dev
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=development
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/ged_courrier
      - JWT_SECRET=dev_secret_key_not_for_production
      - JWT_EXPIRE=7d
      - APP_URL=http://localhost:5173
      - APP_NAME=GED Courrier (DEV)
      - CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
    volumes:
      - ./backend/src:/app/src:ro
      - ./backend/package.json:/app/package.json:ro
      - ./backend/uploads:/app/uploads
      - backend_node_modules:/app/node_modules
    depends_on:
      - mongodb
    networks:
      - ged-dev-network

  frontend:
    image: node:18-alpine
    container_name: ged-frontend-dev
    working_dir: /app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://localhost:5000/api
      - VITE_UPLOADS_URL=http://localhost:5000/uploads
    volumes:
      - ./frontend/src:/app/src:ro
      - ./frontend/public:/app/public:ro
      - ./frontend/index.html:/app/index.html:ro
      - ./frontend/package.json:/app/package.json:ro
      - ./frontend/vite.config.js:/app/vite.config.js:ro
      - ./frontend/tailwind.config.js:/app/tailwind.config.js:ro
      - ./frontend/postcss.config.js:/app/postcss.config.js:ro
      - frontend_node_modules:/app/node_modules
    depends_on:
      - backend
    networks:
      - ged-dev-network

  mongo-express:
    image: mongo-express:latest
    container_name: ged-mongo-express
    ports:
      - '8081:8081'
    environment:
      - ME_CONFIG_MONGODB_SERVER=mongodb
      - ME_CONFIG_BASICAUTH_USERNAME=admin
      - ME_CONFIG_BASICAUTH_PASSWORD=admin
    depends_on:
      - mongodb
    networks:
      - ged-dev-network
    profiles:
      - tools

volumes:
  mongodb_dev_data:
  backend_node_modules:
  frontend_node_modules:

networks:
  ged-dev-network:
```

---

## 🛠️ Docker pour le Développement (Sans MongoDB)

Utilisez `docker-compose.dev.standalone.yml` si vous avez déjà MongoDB installé sur votre machine.

### Fonctionnalités

- ✅ **Hot-reload** : Les modifications du code sont appliquées instantanément
- ✅ **MongoDB externe** : Utilise MongoDB installé sur l'hôte
- ✅ **Configuration flexible** : Variables d'environnement personnalisables
- ✅ **Volumes persistants** : Les node_modules sont conservés

### Architecture Dev Standalone

```
┌─────────────────────────────────────────────────────────┐
│              Frontend Vite (Hot-reload)                  │
│              http://localhost:5173                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Nodemon (Hot-reload)                │
│              http://localhost:5000                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│            MongoDB (existant sur l'hôte)                 │
│              localhost:27017                             │
└─────────────────────────────────────────────────────────┘
```

### Démarrage rapide

```bash
# 1. (Optionnel) Configurer les variables d'environnement
cp .env.dev.example .env
nano .env

# 2. Démarrer l'environnement de développement
docker-compose -f docker-compose.dev.standalone.yml up

# En arrière-plan
docker-compose -f docker-compose.dev.standalone.yml up -d

# Voir les logs
docker-compose -f docker-compose.dev.standalone.yml logs -f
```

### Accès

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| MongoDB | localhost:27017 (sur l'hôte) |

### Commandes utiles

```bash
# Redémarrer un service
docker-compose -f docker-compose.dev.standalone.yml restart backend

# Reconstruire après modification de package.json
docker-compose -f docker-compose.dev.standalone.yml up --build

# Exécuter le seed
docker-compose -f docker-compose.dev.standalone.yml exec backend node src/scripts/seed.js

# Arrêter
docker-compose -f docker-compose.dev.standalone.yml down

# Supprimer les volumes node_modules
docker-compose -f docker-compose.dev.standalone.yml down -v
```

### Fichier docker-compose.dev.standalone.yml

```yaml
version: '3.8'

services:
  backend:
    image: node:18-alpine
    container_name: ged-backend-dev
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=development
      - PORT=5000
      - MONGODB_URI=${MONGODB_URI:-mongodb://host.docker.internal:27017/ged_courrier}
      - JWT_SECRET=${JWT_SECRET:-dev_secret_key_not_for_production}
      - JWT_EXPIRE=${JWT_EXPIRE:-7d}
      - APP_URL=${APP_URL:-http://localhost:5173}
      - APP_NAME=${APP_NAME:-GED Courrier (DEV)}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:5173,http://127.0.0.1:5173}
    volumes:
      - ./backend/src:/app/src:ro
      - ./backend/package.json:/app/package.json:ro
      - ./backend/uploads:/app/uploads
      - backend_node_modules:/app/node_modules
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - ged-dev-network

  frontend:
    image: node:18-alpine
    container_name: ged-frontend-dev
    working_dir: /app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://localhost:5000/api
      - VITE_UPLOADS_URL=http://localhost:5000/uploads
    volumes:
      - ./frontend/src:/app/src:ro
      - ./frontend/public:/app/public:ro
      - ./frontend/index.html:/app/index.html:ro
      - ./frontend/package.json:/app/package.json:ro
      - ./frontend/vite.config.js:/app/vite.config.js:ro
      - ./frontend/tailwind.config.js:/app/tailwind.config.js:ro
      - ./frontend/postcss.config.js:/app/postcss.config.js:ro
      - frontend_node_modules:/app/node_modules
    depends_on:
      - backend
    networks:
      - ged-dev-network

volumes:
  backend_node_modules:
  frontend_node_modules:

networks:
  ged-dev-network:
```

### Configuration .env pour le développement

```env
# MongoDB externe (par défaut: mongodb://host.docker.internal:27017/ged_courrier)
# MONGODB_URI=mongodb://host.docker.internal:27017/ged_courrier

# Application (les valeurs par défaut conviennent pour le dev)
# JWT_SECRET=dev_secret_key_not_for_production
# APP_URL=http://localhost:5173
# CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

# SMTP pour tester les emails (ex: Mailtrap)
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=587
# SMTP_USER=votre_user
# SMTP_PASSWORD=votre_password
```

---

## 📋 Récapitulatif des fichiers Docker

| Fichier | Usage | MongoDB |
|---------|-------|---------|
| `docker-compose.yml` | Production complète | Inclus (conteneur) |
| `docker-compose.standalone.yml` | Production (MongoDB externe) | Externe (hôte) |
| `docker-compose.dev.yml` | Développement complet | Inclus (conteneur) |
| `docker-compose.dev.standalone.yml` | Développement (MongoDB externe) | Externe (hôte) |

### Fichiers de configuration associés

| Fichier | Description |
|---------|-------------|
| `.env.example` | Config pour docker-compose.yml |
| `.env.standalone.example` | Config pour docker-compose.standalone.yml |
| `.env.dev.example` | Config pour docker-compose.dev.standalone.yml |
| `Dockerfile` | Image de production |
| `.dockerignore` | Fichiers exclus du build |

---

## ✅ Vérification post-déploiement

1. **Test de l'API** :
   ```bash
   curl https://mondomaine.com/api/health
   ```

2. **Test de connexion** :
   - Ouvrir https://mondomaine.com dans un navigateur
   - Se connecter avec les identifiants admin

3. **Test des uploads** :
   - Importer un courrier PDF
   - Vérifier l'aperçu PDF
   - Vérifier les avatars utilisateurs

4. **Test des notifications** :
   - Vérifier l'envoi d'emails (si SMTP configuré)

## 🔒 Sécurité

### Checklist de sécurité

- [ ] Changer le `JWT_SECRET` par défaut
- [ ] Définir un `JWT_REFRESH_SECRET` différent de `JWT_SECRET`
- [ ] Configurer HTTPS avec un certificat valide
- [ ] Configurer les origines CORS autorisées
- [ ] Sécuriser MongoDB (authentification, firewall)
- [ ] Configurer les backups automatiques
- [ ] Mettre à jour régulièrement les dépendances

### Firewall (UFW)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 🔄 Mise à jour

```bash
# Arrêter le backend
pm2 stop ged-backend

# Mettre à jour le code
git pull origin main

# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
npm run build

# Redémarrer
pm2 start ged-backend
```

## 📊 Monitoring

```bash
# Voir les logs en temps réel
pm2 logs ged-backend

# Monitorer les processus
pm2 monit

# Status
pm2 status
```

## 🆘 Dépannage

### Problème : Erreur CORS
**Solution** : Vérifier que `CORS_ORIGIN` dans le `.env` contient bien votre domaine.

### Problème : PDF ne s'affiche pas
**Solution** : Vérifier que le fichier `pdf.worker.min.js` est bien présent dans `frontend/dist/`.

### Problème : Uploads échouent
**Solution** : Vérifier les permissions du dossier `uploads/` et `client_max_body_size` dans Nginx.

### Problème : 502 Bad Gateway
**Solution** : Vérifier que le backend est bien démarré (`pm2 status`) et écoute sur le bon port.
