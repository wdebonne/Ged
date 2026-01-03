# Déploiement sur O2Switch - GED Courrier

Ce guide explique comment déployer l'application GED Courrier sur un hébergement **O2Switch** avec cPanel.

## 📋 Prérequis

- Compte O2Switch actif
- Accès au cPanel
- Nom de domaine ou sous-domaine configuré
- Base de données MongoDB externe (MongoDB Atlas recommandé)

> ⚠️ **Important** : O2Switch ne propose pas MongoDB en natif. Vous devrez utiliser un service externe comme [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuit jusqu'à 512MB).

## 🗄️ Configuration MongoDB Atlas

### 1. Créer un cluster gratuit

1. Rendez-vous sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créez un compte ou connectez-vous
3. Créez un nouveau cluster **FREE** (M0 Sandbox)
4. Choisissez la région la plus proche (Europe - Paris)

### 2. Configurer l'accès

1. **Database Access** → Add New Database User
   - Username : `ged_user`
   - Password : générez un mot de passe sécurisé
   - Role : `Read and write to any database`

2. **Network Access** → Add IP Address
   - Cliquez sur **Allow Access from Anywhere** (0.0.0.0/0)
   - Ou ajoutez l'IP de votre serveur O2Switch

3. **Databases** → Connect → Drivers
   - Copiez l'URI de connexion :
   ```
   mongodb+srv://ged_user:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/ged_courrier?retryWrites=true&w=majority
   ```

## 📁 Structure des fichiers sur O2Switch

```
/home/votre_compte/
├── applications/
│   └── ged-courrier/           # Application Node.js
│       ├── backend/
│       │   ├── src/
│       │   ├── uploads/
│       │   ├── package.json
│       │   └── .env
│       └── public/             # Frontend buildé
│           └── (fichiers dist)
└── public_html/
    └── ged.mondomaine.com/     # Sous-domaine (optionnel)
```

## 🔧 Étape 1 : Préparer l'application localement

### 1.1 Build du Frontend

```bash
cd frontend
npm install
npm run build
```

Les fichiers statiques seront générés dans `frontend/dist/`.

### 1.2 Backend (pas de build nécessaire)

> ℹ️ **Note** : Le backend Node.js s'exécute directement sans compilation. Il suffit d'uploader les fichiers sources.

Créez le fichier `backend/.env.production` :

```env
# ═══════════════════════════════════════════════════════════════
# CONFIGURATION DU SERVEUR
# ═══════════════════════════════════════════════════════════════
PORT=3000
NODE_ENV=production

# ═══════════════════════════════════════════════════════════════
# BASE DE DONNÉES MONGODB ATLAS
# ═══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb+srv://ged_user:VOTRE_PASSWORD@cluster0.xxxxx.mongodb.net/ged_courrier?retryWrites=true&w=majority

# ═══════════════════════════════════════════════════════════════
# AUTHENTIFICATION JWT
# ═══════════════════════════════════════════════════════════════
# Générez avec: openssl rand -base64 32
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_minimum_32_caracteres
JWT_EXPIRE=7d

# ═══════════════════════════════════════════════════════════════
# CORS - Domaine O2Switch
# ═══════════════════════════════════════════════════════════════
CORS_ORIGIN=https://ged.mondomaine.com

# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
APP_URL=https://ged.mondomaine.com
APP_NAME=GED Courrier

# ═══════════════════════════════════════════════════════════════
# UPLOAD DE FICHIERS
# ═══════════════════════════════════════════════════════════════
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000

# ═══════════════════════════════════════════════════════════════
# SMTP - Utiliser le SMTP O2Switch
# ═══════════════════════════════════════════════════════════════
SMTP_HOST=mail.mondomaine.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@mondomaine.com
SMTP_PASSWORD=votre_mot_de_passe_email
SMTP_FROM=GED Courrier <no-reply@mondomaine.com>

# ═══════════════════════════════════════════════════════════════
# LDAP / KERBEROS (désactivés par défaut)
# ═══════════════════════════════════════════════════════════════
LDAP_ENABLED=false
KERBEROS_ENABLED=false
```

### 1.3 Créer le fichier de démarrage

Créez `backend/app.js` (fichier de démarrage optimisé pour O2Switch) :

```javascript
// app.js - Point d'entrée optimisé pour O2Switch
// Réduire le nombre de threads pour économiser la mémoire
process.env.UV_THREADPOOL_SIZE = '2';

// Forcer le garbage collector à être plus agressif
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000);
}

import('./src/server.js');
```

> **Note** : Ce fichier optimise l'utilisation mémoire pour les hébergements mutualisés.

## 📤 Étape 2 : Transférer les fichiers

### 2.1 Via le Gestionnaire de fichiers cPanel

1. Connectez-vous à cPanel
2. **Gestionnaire de fichiers** → Créez le dossier `applications/ged-courrier`
3. Uploadez les fichiers suivants :

**Dans `applications/ged-courrier/backend/`** :
- Tout le dossier `src/`
- `package.json`
- `package-lock.json`
- `.env.production` (renommez-le en `.env`)
- `app.js`
- Créez le dossier `uploads/` avec les sous-dossiers :
  - `avatars/`
  - `branding/`
  - `courriers/`
  - `pending/`
  - `responses/`
  - `temp/`
  - `archives/`

**Dans `applications/ged-courrier/public/`** :
- Tout le contenu de `frontend/dist/`

### 2.2 Via FTP/SFTP (recommandé pour les gros fichiers)

Utilisez FileZilla ou WinSCP :
- Hôte : `ftp.mondomaine.com` ou votre serveur O2Switch
- Identifiants : ceux de votre compte cPanel

## 🚀 Étape 3 : Créer l'application Node.js

### 3.1 Accéder au gestionnaire Node.js

1. cPanel → **Setup Node.js App** (ou cherchez "Node.js")

### 3.2 Créer l'application

Cliquez sur **CREATE APPLICATION** et remplissez :

| Champ | Valeur |
|-------|--------|
| **Node.js version** | `20.x` ou supérieur (requis) |
| **Application mode** | `Production` |
| **Application root** | `applications/ged-courrier/backend` |
| **Application URL** | `ged.mondomaine.com` (ou votre domaine) |
| **Application startup file** | `app.js` |

### 3.3 Variables d'environnement

Cliquez sur **ADD VARIABLE** pour chaque variable de votre `.env` :

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGODB_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `votre_secret...` |
| `JWT_EXPIRE` | `7d` |
| `CORS_ORIGIN` | `https://ged.mondomaine.com` |
| `APP_URL` | `https://ged.mondomaine.com` |
| `APP_NAME` | `GED Courrier` |
| `UPLOAD_PATH` | `./uploads` |
| `MAX_FILE_SIZE` | `50000000` |
| `SMTP_HOST` | `mail.mondomaine.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `no-reply@mondomaine.com` |
| `SMTP_PASSWORD` | `votre_password` |
| `SMTP_FROM` | `GED Courrier <no-reply@mondomaine.com>` |
| `LDAP_ENABLED` | `false` |
| `KERBEROS_ENABLED` | `false` |

### 3.4 Installer les dépendances

1. Dans le gestionnaire Node.js, cliquez sur **Run NPM Install**
2. Ou via le Terminal cPanel :
   ```bash
   cd ~/applications/ged-courrier/backend
   source /home/votre_compte/nodevenv/applications/ged-courrier/backend/20/bin/activate
   npm install --omit=dev
   ```

### 3.5 Configurer la mémoire Node.js (Important !)

> ⚠️ **O2Switch limite la mémoire disponible**. Il faut configurer Node.js pour éviter les erreurs "JavaScript heap out of memory".

Ajoutez cette variable d'environnement dans le gestionnaire Node.js :

| Name | Value |
|------|-------|
| `NODE_OPTIONS` | `--max-old-space-size=384` |

Cela limite Node.js à 384MB de mémoire heap.

### 3.6 Démarrer l'application

Cliquez sur **RESTART** dans le gestionnaire Node.js.

## 🌐 Étape 4 : Configurer le domaine/sous-domaine

### 4.1 Créer un sous-domaine (recommandé)

1. cPanel → **Sous-domaines**
2. Créez `ged.mondomaine.com`
3. Racine du document : `/home/votre_compte/applications/ged-courrier/public`

### 4.2 Configurer le .htaccess

Créez le fichier `applications/ged-courrier/public/.htaccess` :

```apache
# Activer le moteur de réécriture
RewriteEngine On

# Redirection HTTP vers HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy vers l'API Node.js
RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# Proxy vers les uploads
RewriteCond %{REQUEST_URI} ^/uploads [NC]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# SPA - Rediriger toutes les routes vers index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Sécurité
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Cache pour les assets statiques
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 week"
</IfModule>

# Compression GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/json
    AddOutputFilterByType DEFLATE application/javascript text/xml application/xml
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

## 🔒 Étape 5 : SSL/HTTPS

### 5.1 Activer SSL gratuit

1. cPanel → **SSL/TLS Status** ou **Let's Encrypt**
2. Sélectionnez votre domaine `ged.mondomaine.com`
3. Cliquez sur **Issue** ou **Installer**

Le certificat sera renouvelé automatiquement.

## ✅ Étape 6 : Vérification

### 6.1 Tester l'application

1. Accédez à `https://ged.mondomaine.com`
2. Vous devriez voir la page de connexion

### 6.2 Créer le compte administrateur

Lors du premier accès, connectez-vous avec :
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

> ⚠️ **Changez immédiatement le mot de passe admin !**

### 6.3 Vérifier les logs

En cas de problème :
1. cPanel → **Setup Node.js App**
2. Cliquez sur le crayon (éditer) de votre application
3. Consultez les logs via **stderr.log**

Ou via Terminal :
```bash
cd ~/applications/ged-courrier/backend
cat stderr.log
cat stdout.log
```

## 🔧 Dépannage

### Erreur "JavaScript heap out of memory"

Cette erreur survient car O2Switch limite la mémoire des processus Node.js.

**Solutions :**

1. **Ajouter la variable d'environnement** dans cPanel → Setup Node.js App :
   ```
   NODE_OPTIONS = --max-old-space-size=384
   ```

2. **Désactiver l'OCR** si non utilisé (très gourmand en mémoire) :
   - Dans les paramètres de l'application, désactivez l'OCR
   - Ou supprimez les packages OCR du `package.json` :
     ```bash
     npm uninstall tesseract.js canvas
     ```

3. **Utiliser un fichier de démarrage optimisé** - Modifiez `app.js` :
   ```javascript
   // app.js - Point d'entrée optimisé pour O2Switch
   process.env.UV_THREADPOOL_SIZE = 2; // Réduire les threads
   import('./src/server.js');
   ```

### Erreur "Application Error"

1. Vérifiez que MongoDB Atlas est accessible
2. Vérifiez les variables d'environnement
3. Consultez les logs d'erreur

### Erreur 503 ou 502

1. Vérifiez que l'application Node.js est démarrée
2. Redémarrez l'application dans cPanel
3. Vérifiez le port dans les variables d'environnement

### Les uploads ne fonctionnent pas

1. Vérifiez les permissions des dossiers `uploads/`
   ```bash
   chmod -R 755 ~/applications/ged-courrier/backend/uploads
   ```
2. Vérifiez que la variable `UPLOAD_PATH` est correcte

### API retourne 404

Vérifiez le `.htaccess` et que `mod_proxy` est activé sur O2Switch.

Alternative : configurez le frontend pour utiliser l'URL complète :
```env
# frontend/.env
VITE_API_URL=https://ged.mondomaine.com:3000/api
```

## 📊 Limitations O2Switch

| Ressource | Limite |
|-----------|--------|
| Mémoire Node.js | ~384-512MB max (mutualisé) |
| Espace d'adressage | 4GB max |
| CPU | Partagé |
| Stockage | Illimité (fair use) |
| Bande passante | Illimitée (fair use) |
| MongoDB | Non disponible (utilisez Atlas) |

> ⚠️ **Important** : Les fonctionnalités gourmandes en mémoire comme l'OCR (Tesseract.js) peuvent ne pas fonctionner correctement sur O2Switch. Envisagez de les désactiver ou d'utiliser un VPS si nécessaire.

## � Sécurité et Filtrage IP

### Méthode 1 : Via cPanel (Bloqueur d'IP)

Pour bloquer des IPs malveillantes :

1. cPanel → **Bloqueur d'IP** (IP Blocker)
2. Entrez l'IP ou la plage à bloquer :
   - IP unique : `192.168.1.100`
   - Plage CIDR : `192.168.1.0/24`
   - Plage avec wildcard : `192.168.1.*`
3. Cliquez sur **Ajouter**

### Méthode 2 : Via .htaccess (Recommandé pour l'application)

#### Autoriser uniquement certaines IPs (Liste blanche)

Ajoutez dans `applications/ged-courrier/public/.htaccess` :

```apache
# ═══════════════════════════════════════════════════════════════
# FILTRAGE IP - LISTE BLANCHE (autoriser uniquement ces IPs)
# ═══════════════════════════════════════════════════════════════
<IfModule mod_authz_core.c>
    # Apache 2.4+
    Require ip 123.45.67.89
    Require ip 98.76.54.32
    Require ip 192.168.1.0/24
</IfModule>

<IfModule !mod_authz_core.c>
    # Apache 2.2 (fallback)
    Order Deny,Allow
    Deny from all
    Allow from 123.45.67.89
    Allow from 98.76.54.32
    Allow from 192.168.1.0/24
</IfModule>
```

#### Bloquer certaines IPs (Liste noire)

```apache
# ═══════════════════════════════════════════════════════════════
# FILTRAGE IP - LISTE NOIRE (bloquer ces IPs)
# ═══════════════════════════════════════════════════════════════
<IfModule mod_authz_core.c>
    # Apache 2.4+
    <RequireAll>
        Require all granted
        Require not ip 123.45.67.89
        Require not ip 98.76.54.0/24
    </RequireAll>
</IfModule>

<IfModule !mod_authz_core.c>
    # Apache 2.2 (fallback)
    Order Allow,Deny
    Allow from all
    Deny from 123.45.67.89
    Deny from 98.76.54.0/24
</IfModule>
```

#### Protéger uniquement l'API

Pour restreindre l'accès à l'API tout en laissant le frontend accessible :

```apache
# ═══════════════════════════════════════════════════════════════
# PROTECTION DE L'API UNIQUEMENT
# ═══════════════════════════════════════════════════════════════
<If "%{REQUEST_URI} =~ m#^/api#">
    <IfModule mod_authz_core.c>
        Require ip 123.45.67.89
        Require ip 192.168.0.0/16
    </IfModule>
</If>
```

#### Protection par pays (GeoIP)

O2Switch supporte le module GeoIP. Pour autoriser uniquement la France :

```apache
# ═══════════════════════════════════════════════════════════════
# FILTRAGE PAR PAYS (GeoIP)
# ═══════════════════════════════════════════════════════════════
<IfModule mod_geoip.c>
    GeoIPEnable On
    
    # Bloquer tous sauf la France
    SetEnvIf GEOIP_COUNTRY_CODE FR AllowCountry
    
    <IfModule mod_authz_core.c>
        Require env AllowCountry
    </IfModule>
</IfModule>
```

Pour autoriser plusieurs pays (France, Belgique, Suisse, Canada) :

```apache
<IfModule mod_geoip.c>
    GeoIPEnable On
    
    SetEnvIf GEOIP_COUNTRY_CODE FR AllowCountry
    SetEnvIf GEOIP_COUNTRY_CODE BE AllowCountry
    SetEnvIf GEOIP_COUNTRY_CODE CH AllowCountry
    SetEnvIf GEOIP_COUNTRY_CODE CA AllowCountry
    
    <IfModule mod_authz_core.c>
        Require env AllowCountry
    </IfModule>
</IfModule>
```

### Méthode 3 : Protection de MongoDB Atlas

Dans MongoDB Atlas, restreignez les IPs qui peuvent se connecter :

1. **Network Access** → **Add IP Address**
2. Supprimez `0.0.0.0/0` si présent
3. Ajoutez uniquement l'IP de votre serveur O2Switch :
   - Pour trouver l'IP : cPanel → **Server Information** ou exécutez `curl ifconfig.me` dans le terminal

### Méthode 4 : Protection par mot de passe HTTP (Basic Auth)

Pour ajouter une couche de protection supplémentaire :

1. **Créer le fichier de mots de passe** via Terminal cPanel :
   ```bash
   htpasswd -c ~/.htpasswd utilisateur
   ```

2. **Ajouter dans .htaccess** :
   ```apache
   # ═══════════════════════════════════════════════════════════════
   # PROTECTION PAR MOT DE PASSE
   # ═══════════════════════════════════════════════════════════════
   AuthType Basic
   AuthName "Accès restreint - GED Courrier"
   AuthUserFile /home/votre_compte/.htpasswd
   Require valid-user
   
   # Exclure l'API de l'auth HTTP (elle a sa propre auth JWT)
   <If "%{REQUEST_URI} =~ m#^/api#">
       Require all granted
   </If>
   ```

### Exemple complet .htaccess avec sécurité

```apache
# ═══════════════════════════════════════════════════════════════
# SÉCURITÉ GÉNÉRALE
# ═══════════════════════════════════════════════════════════════

# Activer le moteur de réécriture
RewriteEngine On

# Redirection HTTP vers HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# ═══════════════════════════════════════════════════════════════
# FILTRAGE IP (décommentez selon vos besoins)
# ═══════════════════════════════════════════════════════════════

# Option A: Liste blanche (décommentez pour activer)
# <IfModule mod_authz_core.c>
#     Require ip 123.45.67.89
#     Require ip 192.168.0.0/16
# </IfModule>

# Option B: Liste noire (décommentez pour activer)
# <IfModule mod_authz_core.c>
#     <RequireAll>
#         Require all granted
#         Require not ip 10.20.30.40
#     </RequireAll>
# </IfModule>

# Option C: Filtrage GeoIP - France uniquement (décommentez pour activer)
# <IfModule mod_geoip.c>
#     GeoIPEnable On
#     SetEnvIf GEOIP_COUNTRY_CODE FR AllowCountry
#     <IfModule mod_authz_core.c>
#         Require env AllowCountry
#     </IfModule>
# </IfModule>

# ═══════════════════════════════════════════════════════════════
# PROXY VERS L'API NODE.JS
# ═══════════════════════════════════════════════════════════════

RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

RewriteCond %{REQUEST_URI} ^/uploads [NC]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# ═══════════════════════════════════════════════════════════════
# SPA - ROUTES FRONTEND
# ═══════════════════════════════════════════════════════════════

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# ═══════════════════════════════════════════════════════════════
# HEADERS DE SÉCURITÉ
# ═══════════════════════════════════════════════════════════════

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

# ═══════════════════════════════════════════════════════════════
# BLOCAGE DES FICHIERS SENSIBLES
# ═══════════════════════════════════════════════════════════════

<FilesMatch "\.(env|log|ini|conf|bak|sql)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
</FilesMatch>

# Bloquer l'accès aux fichiers cachés (.git, .env, etc.)
<IfModule mod_rewrite.c>
    RewriteRule (^|/)\.(?!well-known) - [F]
</IfModule>

# ═══════════════════════════════════════════════════════════════
# CACHE ET COMPRESSION
# ═══════════════════════════════════════════════════════════════

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 week"
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/json
    AddOutputFilterByType DEFLATE application/javascript text/xml application/xml
</IfModule>
```

## �🔄 Mise à jour de l'application

### Frontend
```bash
cd frontend
npm run build
```
Puis uploadez le contenu de `frontend/dist/` vers `applications/ged-courrier/public/`

### Backend
Uploadez directement les fichiers modifiés dans `backend/src/` (pas de build nécessaire).

### Finalisation
1. Dans cPanel → **Setup Node.js App** → **Run NPM Install** (si nouvelles dépendances)
2. Cliquez sur **RESTART**

## 📧 Configuration SMTP O2Switch

Pour utiliser le SMTP d'O2Switch :

1. cPanel → **Comptes de messagerie**
2. Créez `no-reply@mondomaine.com`
3. Utilisez ces paramètres :
   ```env
   SMTP_HOST=mail.mondomaine.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=no-reply@mondomaine.com
   SMTP_PASSWORD=le_mot_de_passe_du_compte_email
   ```

## 🎉 Conclusion

Votre application GED Courrier est maintenant déployée sur O2Switch ! 

Pour toute question spécifique à O2Switch, consultez leur [documentation](https://faq.o2switch.fr/) ou contactez leur support.
