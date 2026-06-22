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
- **Git** installé sur le serveur (ou accès au repository)
- (Optionnel) Accès SSH au serveur
- (Optionnel) Reverse proxy configuré (Nginx/Traefik)

> ⚠️ **Important** : Ce guide utilise `docker-compose.portainer.yml` et `Dockerfile.portainer` qui créent une **image complète** avec tout le code inclus. Pas besoin de monter des fichiers depuis l'hôte !

> 🚨 **Note sur le Build** : Le build d'image directement dans Portainer via Git peut échouer avec certaines configurations Docker (erreur BuildKit/HTTP2). La **méthode recommandée** est de builder l'image manuellement sur le serveur puis de déployer la stack (voir Méthode B).

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

### Méthode A : Déploiement via Git dans Portainer

> ⚠️ **Attention** : Cette méthode peut échouer avec l'erreur "BuildKit HTTP2 frame too large". Si c'est le cas, utilisez la **Méthode B** (recommandée).

Cette méthode permet à Portainer de cloner directement le repository et de builder l'image.

1. **Connectez-vous à Portainer**

2. **Créer une nouvelle Stack** :
   - Allez dans **Stacks** → **Add stack**
   - Nom de la stack : `ged-courrier`

3. **Configurer le Repository Git** :
   - Sélectionnez **Repository**
   - **Repository URL** : `https://votre-repo/ged-courrier.git`
   - **Repository reference** : `main` (ou `master`)
   - **Compose path** : `docker-compose.portainer.yml`
   - (Si repo privé) Ajoutez vos credentials Git

4. **Ajouter les Variables d'environnement** :
   Cliquez sur **Add environment variable** et ajoutez :

   | Nom | Valeur |
   |-----|--------|
   | `MONGO_ROOT_USER` | `admin` |
   | `MONGO_ROOT_PASSWORD` | `VotreMotDePasseSecurise123!` |
   | `JWT_SECRET` | `votre_secret_jwt_minimum_32_caracteres` |
   | `APP_URL` | `https://ged.votredomaine.com` |
   | `CORS_ORIGIN` | `https://ged.votredomaine.com` |

5. **Déployer** :
   - Cliquez sur **Deploy the stack**
   - Attendez que l'image soit buildée (peut prendre 2-5 minutes la première fois)

6. **Vérifier** :
   - Allez dans **Containers**
   - Vérifiez que `ged-backend` et `ged-mongodb` sont **running**
   - L'application est accessible sur `http://votre-serveur:5000`

---

### Méthode B : Déploiement manuel avec image pré-buildée (Recommandé) ⭐

Cette méthode évite les problèmes de build dans Portainer en créant l'image localement sur le serveur.

#### Étape 1 : Cloner le projet sur le serveur

```bash
# Se connecter au serveur en SSH
ssh user@votre-serveur

# Cloner le repository
cd /opt  # ou votre dossier de préférence
git clone https://votre-repo/ged-courrier.git ged
cd ged
```

#### Étape 2 : Créer le fichier .env

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
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=votre_secret_refresh_different_du_jwt_secret
JWT_REFRESH_EXPIRE=7d

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

#### Étape 3 : Builder l'image Docker

```bash
# Builder l'image localement (IMPORTANT - à faire avant le déploiement Portainer)
docker build -f Dockerfile.portainer -t ged-app:latest .
```

#### Étape 4 : Déployer via Portainer ou CLI

**Option A - Via Portainer :**
1. Créez une stack dans Portainer
2. Copiez le contenu de `docker-compose.portainer.yml`
3. Configurez les variables d'environnement
4. Déployez

**Option B - Via CLI :**
```bash
# Démarrer les conteneurs (l'image ged-app:latest doit être buildée)
docker-compose -f docker-compose.portainer.yml up -d
```

#### Étape 4 : Vérifier le déploiement

Dans Portainer :
1. Allez dans **Containers**
2. Vérifiez que `ged-backend` et `ged-mongodb` sont en état **running**
3. Cliquez sur `ged-backend` → **Logs** pour voir les logs

L'application devrait être accessible sur `http://votre-serveur:5000`

---

## 🔄 Mise à Jour

### Méthode 1 : Via SSH + Portainer (Recommandé) ⭐

Pour mettre à jour l'application :

1. **Connectez-vous en SSH** au serveur :
```bash
ssh user@votre-serveur
cd /opt/ged
```

2. **Récupérez les modifications et rebuildez l'image** :
```bash
git pull
docker build -f Dockerfile.portainer -t ged-app:latest .
```

3. **Redémarrez via Portainer** :
   - Allez dans **Stacks** → `ged-courrier`
   - Cliquez sur **Stop** puis **Start**
   - Ou cliquez sur **Update the stack**

Alternativement, redémarrez via CLI :
```bash
docker-compose -f docker-compose.portainer.yml up -d
```

### Méthode 2 : Via SSH (Pour déploiement manuel)

```bash
# Se connecter au serveur
ssh user@votre-serveur
cd /opt/ged

# Récupérer les dernières modifications
git pull

# Rebuilder l'image et redémarrer
docker-compose -f docker-compose.portainer.yml up -d --build
```

### Méthode 3 : Script automatique (Recommandé)

Créez un script `update-portainer.sh` sur votre serveur :

```bash
#!/bin/bash
# Script de mise à jour GED Courrier (version Portainer)

set -e
cd /opt/ged

echo "📥 Récupération des mises à jour..."
git pull

echo "🔨 Rebuild de l'image Docker..."
docker build -f Dockerfile.portainer -t ged-app:latest --no-cache .

echo "🔄 Redémarrage des conteneurs..."
docker-compose -f docker-compose.portainer.yml up -d

echo "🧹 Nettoyage des anciennes images..."
docker image prune -f

echo "✅ Mise à jour terminée !"
echo "📋 Logs du conteneur :"
docker logs --tail 20 ged-backend
```

Rendez-le exécutable :
```bash
chmod +x update-portainer.sh
```

Lancez la mise à jour :
```bash
./update-portainer.sh
```

---

## 🔧 Variables d'environnement

### Variables obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MONGO_ROOT_USER` | Utilisateur MongoDB | `admin` |
| `MONGO_ROOT_PASSWORD` | Mot de passe MongoDB | `SecurePass123!` |
| `JWT_SECRET` | Secret pour les access tokens JWT (min 32 car.) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Secret pour les refresh tokens (différent de JWT_SECRET) | `openssl rand -base64 32` |
| `APP_URL` | URL publique de l'application | `https://ged.exemple.com` |
| `CORS_ORIGIN` | Origines autorisées | `https://ged.exemple.com` |

### Variables optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `JWT_EXPIRE` | Durée de validité des access tokens | `15m` |
| `JWT_REFRESH_EXPIRE` | Durée de validité des refresh tokens | `7d` |
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
| `LDAP_REQUIRED_GROUP_DN` | DN du groupe AD requis (vide = tous autorisés). Configurable aussi depuis l'interface | - |
| `LDAP_GROUP_CHECK_INTERVAL` | Intervalle (min) de vérification du groupe requis | `5` |

> **Note** : les paramètres LDAP peuvent aussi être configurés depuis l'interface (Paramètres > LDAP). Les valeurs de l'interface sont prioritaires sur le `.env`.

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

- [ ] Cloner le repository sur le serveur (`git clone`)
- [ ] Builder l'image Docker (`docker build -f Dockerfile.portainer -t ged-app:latest .`)
- [ ] Créer la stack dans Portainer avec `docker-compose.portainer.yml`
- [ ] Configurer les variables d'environnement obligatoires
- [ ] Déployer la stack
- [ ] Vérifier que les conteneurs sont running
- [ ] Tester l'accès à l'application
- [ ] Configurer le reverse proxy (si nécessaire)
- [ ] Configurer SSL/HTTPS

### Mise à jour

- [ ] `git pull` pour récupérer les changements
- [ ] Rebuilder l'image (`docker build -f Dockerfile.portainer -t ged-app:latest .`)
- [ ] Redémarrer les conteneurs (`docker-compose -f docker-compose.portainer.yml up -d`)
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
