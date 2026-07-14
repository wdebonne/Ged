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

### Déploiement Docker (Portainer)
- Docker 20+
- Portainer (voir [DEPLOYMENT-PORTAINER.md](DEPLOYMENT-PORTAINER.md))

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

## 🐳 Déploiement Docker (Portainer)

Le déploiement Docker officiel passe par **Portainer** avec une image pré-buildée :

| Fichier | Rôle |
|---------|------|
| `docker-compose.portainer.yml` | Stack Portainer (MongoDB + backend avec frontend intégré) |
| `Dockerfile.portainer` | Image complète, buildée par GitHub Actions |
| `.github/workflows/docker-build.yml` | Build et push automatique de `ghcr.io/wdebonne/ged:latest` à chaque push sur `main` |
| `.env.example` | Référence des variables d'environnement à configurer dans Portainer |

Mise à jour : pousser sur `main`, attendre la fin du build GitHub Actions, puis **Pull and redeploy** de la stack dans Portainer.

📘 Guide complet : [DEPLOYMENT-PORTAINER.md](DEPLOYMENT-PORTAINER.md)

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
