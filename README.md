# GED Courrier - Gestion Électronique de Courrier

Application web complète de gestion de courrier avec authentification LDAP/Kerberos, gestion des utilisateurs et groupes, import IMAP, modèles d'emails personnalisables, ChatBot n8n intégré, et workflow de traitement des courriers.

## 🚀 Technologies

### Backend
- **Node.js 18+** avec Express.js
- **MongoDB 6+** avec Mongoose
- **JWT** pour l'authentification
- **LDAP/Kerberos** support optionnel
- **Multer** pour l'upload de fichiers
- **PDFKit** pour la génération PDF
- **pdf-lib** pour la fusion de documents PDF
- **Tesseract.js** pour l'OCR (reconnaissance de texte)
- **pdf-to-img** pour la conversion PDF vers images (scannés)
- **Nodemailer** pour l'envoi d'emails SMTP
- **IMAP** pour la récupération automatique d'emails
- **archiver** pour la création d'archives ZIP
- **@aws-sdk/client-s3** pour le stockage Amazon S3 et compatibles
- **webdav** pour l'intégration NextCloud/ownCloud
- **@microsoft/microsoft-graph-client** pour OneDrive
- **n8n** intégration pour ChatBot IA (webhook)

### Frontend
- **React 18** avec Vite
- **TailwindCSS** pour le styling
- **Zustand** pour la gestion d'état
- **TanStack React Query** pour le data fetching
- **Framer Motion** pour les animations fluides et transitions
- **Heroicons** pour les icônes
- **React Hot Toast** pour les notifications
- **react-pdf** pour l'affichage de documents PDF
- **Chart.js / react-chartjs-2** pour les graphiques statistiques
- **jsPDF** pour l'export PDF des rapports statistiques

## 📋 Fonctionnalités

### Authentification
- ✅ Login/Logout avec JWT
- ✅ **Login unifié** : un seul formulaire de connexion, le backend essaie automatiquement LDAP → Kerberos → local (plus de sélecteur à choisir)
- ✅ Récupération de mot de passe par email
- ✅ Support LDAP optionnel
- ✅ Support Kerberos optionnel
- ✅ Gestion du profil utilisateur

### Gestion des courriers
- ✅ **Séparation Mes Courriers / Courriers Délégués / Courriers Service(s)**
  - **Mes Courriers** : courriers où l'utilisateur est destinataire direct
  - **Courriers Délégués** : section séparée pour les courriers reçus par délégation (visible uniquement si délégations actives)
  - **Courriers Service(s)** : courriers du service (hors destinataire direct)
- ✅ Courriers entrants (file d'attente)
- ✅ Courriers à traiter
- ✅ Courriers traités
- ✅ Courriers archivés
- ✅ Visualisation PDF intégrée avec zoom, navigation, **rotation** et **recadrage**
  - Rotation gauche/droite (−90°/+90°) appliquée définitivement au fichier PDF à l'import
  - Recadrage manuel par sélection rectangle sur l'aperçu, appliqué définitivement à l'import
  - Recadrage automatique par détection des bords du contenu (analyse pixels canvas)
- ✅ Ajout de réponses avec pièces jointes
- ✅ Aperçu des pièces jointes de réponse (inline et plein écran)
- ✅ Export PDF avancé :
  - Export du courrier uniquement
  - Export de l'historique avec timeline (inclut les PDFs de réponse fusionnés)
  - Export complet (ZIP avec tous les fichiers)
  - **Options d'export PDF personnalisables** (admin) : choisissez les éléments à inclure dans l'historique (création, service, destinataire, lectures, traitement, réponses, archivage)
  - Les options s'appliquent à tous les utilisateurs lors de l'export
- ✅ Recherche et filtres avancés
- ✅ Assignation aux utilisateurs/services
- ✅ **Notifications email automatiques** :
  - Notification aux co-destinataires lors du traitement
  - Notification aux co-destinataires lors de l'archivage
  - Notification au superviseur du service lors de l'arrivée d'un nouveau courrier
- ✅ **Délégation de courriers** :
  - Transfert temporaire de ses courriers à un collègue
  - Gestion des dates de début/fin de délégation
  - Révocation possible à tout moment
  - **Section "Courriers Délégués" dédiée** dans la sidebar et le dashboard
  - Compteurs séparés pour les courriers délégués (badges violets)
  - Statistiques distinctes pour mes courriers vs courriers délégués
  - Accès complet aux courriers du délégant (consultation, traitement, archivage)
- ✅ **Accès superviseur** :
  - Le responsable d'un service voit automatiquement les courriers du service
  - Menu "Courriers Service(s)" visible pour les superviseurs

### Historique des courriers
- ✅ Timeline visuelle avec icônes par type d'événement
- ✅ **Attribution au service** : affichage du service attribué (icône ambre)
- ✅ **Destinataire principal** : affichage avec nom et email (icône violet)
- ✅ **Destinataires en copie** : liste complète avec nombres et emails (icône cyan)
- ✅ **Suivi des lectures** : marquage automatique lors de l'aperçu, historique par utilisateur
- ✅ Suivi des actions : création, lecture, traitement, réponses, archivage
- ✅ Affichage des réponses avec type (Courrier, Email, Téléphone)
- ✅ Export PDF de l'historique complet

### Archivage intelligent
- ✅ Renommage automatique selon le format de référence configurable
- ✅ Variables disponibles : `{YEAR}`, `{MONTH}`, `{DAY}`, `{SERVICE}`, `{NUMBER}`
- ✅ Arborescence automatique : `archives/[Service]/[Année]/[Mois]/fichier.pdf`
- ✅ Format des mois : `01 - Janvier`, `02 - Février`, etc.
- ✅ Déplacement automatique des fichiers de réponse
- ✅ Gestion des doublons

### Administration

#### Utilisateurs
- ✅ CRUD complet des utilisateurs
- ✅ Assignation aux groupes
- ✅ Assignation aux services
- ✅ Activation/Désactivation des comptes

#### Gestion des courriers (Admin)
- ✅ **Suppression de courriers** : possibilité de supprimer définitivement un courrier (à traiter, traité ou archivé)
- ✅ **Réouverture de courriers** : remettre un courrier traité ou archivé en statut "à traiter"
- ✅ **Suppression de réponses** : supprimer des réponses individuelles
- ✅ **Consultation silencieuse** : permission pour consulter sans marquer comme lu (`silent_view`)

#### Groupes et Permissions
- ✅ Gestion des groupes avec permissions granulaires
- ✅ Interface visuelle de sélection des permissions
- ✅ 27 permissions disponibles réparties en catégories
- ✅ Permission `view_service_mails` pour voir les courriers du service
- ✅ Les superviseurs de service ont accès automatique sans cette permission

#### Services
- ✅ CRUD des services/départements
- ✅ Hiérarchie des services
- ✅ **Superviseur par service** : assignation d'un responsable
- ✅ **Accès automatique superviseur** : le responsable voit les courriers du service sans permission explicite
- ✅ **Notifications superviseur** : alertes email automatiques lors de l'arrivée de nouveaux courriers

#### Expéditeurs
- ✅ Gestion des expéditeurs fréquents
- ✅ Auto-complétion lors de la saisie

#### Objets prédéfinis
- ✅ Gestion des objets de courrier prédéfinis
- ✅ Auto-complétion lors de la saisie

### Paramètres système

#### Général
- ✅ Timeout de session
- ✅ Taille maximale des fichiers
- ✅ Extensions autorisées

#### Apparence (Branding)
- ✅ Nom de l'application personnalisable
- ✅ Version affichée
- ✅ Logo personnalisé (upload)
- ✅ Texte du footer personnalisable
- ✅ Affichage/masquage du footer

#### Modèles d'emails
- ✅ Éditeur HTML intégré avec prévisualisation
- ✅ Variables dynamiques ({{userName}}, {{appName}}, etc.)
- ✅ Templates par type d'action :
  - Bienvenue (nouveau compte)
  - Réinitialisation de mot de passe
  - Courrier à traiter
  - Courrier assigné
  - Rappel de courrier
  - Courrier en retard
  - Templates personnalisés
- ✅ **Notifications automatiques intégrées** :
  - **Notification superviseur** : email au superviseur du service lors de l'arrivée d'un nouveau courrier
  - **Notification co-destinataires (traitement)** : email aux destinataires en copie lorsqu'un courrier est traité
  - **Notification co-destinataires (archivage)** : email aux destinataires en copie lorsqu'un courrier est archivé

#### Webhooks
- ✅ CRUD complet des webhooks
- ✅ Activation/Désactivation individuelle
- ✅ Sélection des événements déclencheurs
- ✅ Test d'envoi avec aperçu de la réponse
- ✅ Authentification configurable :
  - Aucune authentification
  - Signature HMAC-SHA256
  - Basic Auth (utilisateur/mot de passe)
- ✅ Statistiques (appels, succès, échecs)
- ✅ Gestion des retries et timeout

#### OCR (Reconnaissance de texte)
- ✅ **Page de configuration dédiée** dans l'administration
- ✅ Activation/désactivation de l'OCR
- ✅ **15 langues supportées** : Français, Anglais, Allemand, Espagnol, Italien, Portugais, Néerlandais, Polonais, Russe, Arabe, Chinois, Japonais, Coréen, et combinaisons multilingues
- ✅ **Seuil de confiance** configurable (0-100%)
- ✅ Limitation du nombre de pages à traiter
- ✅ **Support PDF scannés** :
  - Extraction texte natif pour PDF avec texte sélectionnable
  - Conversion automatique PDF → images avec `pdf-to-img`
  - OCR page par page avec Tesseract.js
  - Solution 100% JavaScript (pas de dépendances externes comme Poppler ou ImageMagick)
- ✅ Options avancées :
  - Traitement automatique à l'import
  - Redressement des documents (deskew)
  - Nettoyage du texte extrait
  - Préservation de la mise en page
- ✅ **Test OCR intégré** : testez l'extraction sur un fichier PDF ou image
- ✅ Affichage des résultats : texte extrait, nombre de mots, temps de traitement, confiance

#### ChatBot n8n
- ✅ **Widget ChatBot intégré** basé sur n8n
- ✅ **Activation/désactivation** globale du widget
- ✅ **Accessible à tous les utilisateurs** (pas seulement les admins)
- ✅ **Configuration Webhook n8n** :
  - URL du webhook
  - Route personnalisable
  - Authentification (Aucune ou Basic Auth)
- ✅ **Comportement du widget** :
  - Mode agrandi (fullscreen)
  - Fermeture au clic extérieur
  - Bouton fermer dans l'en-tête
- ✅ **Branding complet** avec toggles de visibilité :
  - Logo personnalisé
  - Avatar du bot
  - Nom du bot
  - Texte de bienvenue
  - Message de réponse
  - Message d'accueil et prompt
  - Placeholder et bouton d'envoi
  - Texte d'information
  - Footer "Powered by"
- ✅ **Variables dynamiques dans les messages** :
  - `{{firstName}}` - Prénom de l'utilisateur
  - `{{lastName}}` - Nom de l'utilisateur
  - `{{fullName}}` - Nom complet
  - `{{email}}` - Email de l'utilisateur
  - `{{username}}` - Nom d'utilisateur
- ✅ **Palette de couleurs** (9 couleurs personnalisables) :
  - Couleurs primaire et secondaire
  - Fond du widget
  - Texte global
  - Bulles utilisateur (fond + texte)
  - Bulles bot (fond + texte)
  - Bouton flottant
- ✅ **Style du bouton** :
  - Position fixe en bas à droite (flottant)
  - Forme : cercle, arrondi, carré
  - Icône personnalisée (PNG/SVG)
- ✅ **Aperçu en temps réel** des modifications

#### SMTP
- ✅ Configuration du serveur SMTP
- ✅ Support TLS/SSL
- ✅ Test d'envoi avec sélection de template
- ✅ Aperçu des emails avant envoi

#### LDAP
- ✅ Configuration du serveur LDAP **entièrement depuis l'interface** (Paramètres > LDAP) — plus besoin de redémarrer le conteneur après modification
- ✅ Base DN, filtres utilisateurs/groupes
- ✅ Test de connexion (réel, depuis Paramètres > LDAP)
- ✅ **Liste des groupes AD/LDAP** disponibles dans l'annuaire, avec copie du DN en un clic
- ✅ **Restriction par groupe AD/LDAP** configurable depuis l'interface (champ "Groupe AD requis") : seuls les membres du groupe configuré peuvent se connecter. Vérifié à **chaque connexion** (un retrait du groupe AD bloque l'accès dès le prochain login), **et en continu** via une synchronisation périodique qui coupe aussi les sessions déjà ouvertes
- ✅ **Compatibilité Synology AD** (Samba 4) : conversion automatique des objets DN ldapjs en strings
- ✅ **Synchronisation des attributs** : prénom (`givenName`), nom (`sn`) et email (`mail`) sont remontés depuis l'annuaire à la création du compte **et mis à jour à chaque connexion**
- ✅ **Correspondances Groupe AD → Rôle/Services GED** (Administration > Correspondances LDAP) : applique automatiquement un rôle GED et/ou des services accessibles/supervisés en fonction des groupes AD de l'utilisateur, à chaque connexion
- ✅ **Serveur AD de secours (failover automatique)** : bascule automatiquement sur un second annuaire si le serveur principal est inaccessible, sans configuration ni intervention manuelle au moment de la panne

##### Restreindre l'accès à un groupe AD (ex: groupe "GED")

1. Depuis **Paramètres > LDAP**, cliquez sur **"Lister les groupes AD"** : la liste des groupes de l'annuaire (avec leur DN) s'affiche. Cliquez sur **"Copier le DN"** à côté du groupe souhaité (ex: "GED").
2. Collez le DN dans le champ **"Groupe AD requis (DN)"** de la même page et cliquez sur **Enregistrer**.
3. Assurez-vous que l'attribut `memberOf` est bien renvoyé sur les comptes utilisateurs (l'overlay `memberof` est activé par défaut sur le LDAP Server Synology). Sans cet attribut, aucun utilisateur ne sera reconnu comme membre et l'accès sera refusé.
4. Laissez le champ vide pour autoriser tous les utilisateurs LDAP authentifiés.

> **Alternative** : vous pouvez aussi renseigner `LDAP_REQUIRED_GROUP_DN` directement dans `backend/.env` ; la valeur configurée dans l'interface est prioritaire.

> **Important : `LDAP_REQUIRED_GROUP_DN` est une porte d'entrée, indépendante des correspondances ci-dessous, et vérifiée en premier.**
> - Si l'utilisateur **n'est pas membre** du groupe configuré (ex: "GED"), l'authentification échoue immédiatement (`Accès refusé`) — peu importe qu'il soit par ailleurs membre de "Compta", "Responsable Compta", etc. Son compte n'est ni créé ni mis à jour, et les **Correspondances LDAP** décrites ci-dessous ne sont jamais évaluées.
> - Si l'utilisateur **est membre** du groupe configuré, il peut se connecter ; ses autres groupes AD (Compta, etc.) sont alors traités par les **Correspondances LDAP** ci-dessous pour déterminer son **rôle** (groupe de permissions GED) et ses **services/superviseurs**. Ceux-ci peuvent aussi être attribués manuellement dans Administration > Utilisateurs/Services.
> - Cette appartenance est vérifiée **en continu**, pas seulement au login : voir [Révocation automatique de l'accès (groupe requis)](#révocation-automatique-de-laccès-groupe-requis) ci-dessous.

##### Correspondances Groupe AD → Rôle/Services GED (Administration > Correspondances LDAP)

Cette page permet de définir, pour chaque groupe AD/LDAP, quel **rôle GED** (groupe de permissions) attribuer et/ou quels **services** rendre accessibles ou superviser. Ces correspondances sont appliquées automatiquement à **chaque connexion LDAP** réussie, en plus de la restriction d'accès et de la synchronisation des attributs décrites ci-dessus.

Pour chaque correspondance :
- **DN du groupe LDAP** (requis) : récupérez-le via Paramètres > LDAP > "Lister les groupes AD"
- **Rôle GED à attribuer** (optionnel) : un des groupes de permissions définis dans Administration > Groupes (ex: "Superviseur")
- **Services accessibles** (optionnel) : services ajoutés à la liste des services de l'utilisateur. **Synchronisés à chaque connexion** : si l'utilisateur quitte le groupe AD (ou que la correspondance est désactivée/modifiée), les services qui n'avaient été accordés que via cette correspondance sont automatiquement retirés. Les services attribués manuellement dans Administration > Utilisateurs ne sont jamais affectés par cette synchronisation.
- **Devient superviseur de** (optionnel) : services dont l'utilisateur devient le superviseur (champ `supervisor` du service). **Synchronisé à chaque connexion** : si l'utilisateur quitte le groupe AD correspondant, il est automatiquement retiré de la supervision de ces services — sauf si un autre superviseur a été réaffecté manuellement depuis, auquel cas rien n'est modifié.
- **Priorité** : en cas de correspondances multiples définissant chacune un rôle GED différent (un utilisateur peut appartenir à plusieurs groupes AD), c'est la correspondance avec la priorité la plus élevée qui détermine le rôle attribué

**Exemple : Compta / Responsable Compta**

1. Sur le Synology, créez (ou identifiez) deux groupes AD : `Compta` et `Responsable Compta`.
2. Depuis Paramètres > LDAP, cliquez sur "Lister les groupes AD" et copiez le DN de chacun (ex: `cn=Compta,ou=group,dc=votredomaine,dc=local` et `cn=Responsable Compta,ou=group,dc=votredomaine,dc=local`).
3. Dans Administration > Correspondances LDAP, créez deux correspondances :
   - **Compta** → Services accessibles : `Comptabilité`
   - **Responsable Compta** → Rôle GED : `Superviseur`, Services accessibles : `Comptabilité`, Devient superviseur de : `Comptabilité`, Priorité : `10` (plus élevée que la correspondance "Compta" pour qu'elle prenne le dessus si l'utilisateur appartient aux deux groupes)
4. Au prochain login LDAP, un membre du groupe AD "Compta" voit le service Comptabilité ajouté à ses services accessibles. Un membre de "Responsable Compta" devient en plus superviseur du service Comptabilité et reçoit le rôle GED "Superviseur".
5. Si cet utilisateur est ensuite retiré du groupe AD "Responsable Compta" (mais reste dans "Compta"), au prochain login il perd automatiquement la supervision du service Comptabilité ; il conserve l'accès au service Comptabilité via la correspondance "Compta" toujours active.

**Limites** :
- Le **rôle GED** attribué via une correspondance n'est pas automatiquement rétrogradé si l'utilisateur quitte le groupe AD correspondant : il reste celui attribué au dernier login où une correspondance définissait un rôle (à ajuster manuellement dans Administration > Utilisateurs si nécessaire).
- La synchronisation des services et de la supervision repose sur l'attribut `memberOf` renvoyé par l'annuaire à chaque connexion (y compris sous forme de liste vide). Si cet attribut n'est pas renvoyé du tout (overlay `memberof` non actif), ni l'attribution ni le retrait automatiques ne sont effectués.

##### Serveur LDAP de secours (failover automatique)

Si votre annuaire AD principal est hébergé sur un NAS (Synology par exemple) et que vous disposez d'un second NAS avec un annuaire de secours (réplica), GED peut basculer automatiquement sur ce serveur en cas de panne du principal.

**Principe** :
- À **chaque connexion**, le serveur principal (`LDAP_URL`) est **toujours tenté en premier**.
- Si le principal répond mais que l'authentification échoue pour une raison normale (mot de passe incorrect, utilisateur introuvable, accès refusé car non membre du groupe requis), **aucune bascule** n'a lieu : l'erreur est renvoyée telle quelle.
- Si le principal est **inaccessible** (NAS éteint, panne réseau, timeout), et qu'un serveur de secours est configuré, GED retente immédiatement l'authentification sur le serveur de secours.
- **Aucun état n'est mémorisé** : dès que le serveur principal redevient disponible, les connexions suivantes l'utilisent à nouveau automatiquement, sans aucune action manuelle.

**Configuration** (`backend/.env`) :
```
LDAP_URL_BACKUP=ldap://votre-nas-secours:389
LDAP_BIND_DN_BACKUP=cn=admin,dc=votredomaine,dc=local
LDAP_BIND_PASSWORD_BACKUP=votre_mot_de_passe

# Optionnels : si laissés vides, reprennent la valeur de la configuration principale
LDAP_SEARCH_BASE_BACKUP=
LDAP_SEARCH_FILTER_BACKUP=
LDAP_REQUIRED_GROUP_DN_BACKUP=
```

- Laisser `LDAP_URL_BACKUP` vide désactive le failover (comportement actuel, inchangé).
- `LDAP_REQUIRED_GROUP_DN_BACKUP` doit correspondre au DN du groupe **sur l'annuaire de secours** : si la structure des DN diffère entre les deux NAS (ex: `dc=votredomaine,dc=local` vs un autre suffixe), renseignez-le explicitement plutôt que de laisser le repli sur la valeur principale.

**Tester le serveur de secours** : depuis **Paramètres > LDAP**, la section "Configuration LDAP de secours (failover)" permet de renseigner les mêmes informations (serveur, port, Base DN, Bind DN, mot de passe) pour **tester la connexion** et **lister les groupes AD** du serveur de secours, sans accès SSH. Cette section sert uniquement à vérifier la configuration à saisir dans `.env` ; elle ne remplace pas les variables `.env` ci-dessus, qui restent la source de configuration utilisée au login.

**Limite** : la synchronisation en masse des utilisateurs (`syncLDAPUsers`, hors flux de login) n'utilise pas le serveur de secours.

##### Révocation automatique de l'accès (groupe requis)

Le contrôle de `LDAP_REQUIRED_GROUP_DN` décrit plus haut ne s'applique normalement qu'au moment du login : un utilisateur retiré du groupe "GED" ne peut plus se reconnecter, mais une session déjà ouverte (token JWT valide) restait active jusqu'à son expiration (`JWT_EXPIRE`, 7 jours par défaut). GED ajoute une **synchronisation périodique** qui coupe aussi ces sessions déjà ouvertes.

**Principe** :
- Toutes les `LDAP_GROUP_CHECK_INTERVAL` minutes (5 par défaut), GED effectue **une seule requête LDAP** pour récupérer la liste des membres directs (`member`/`uniqueMember`) du groupe `LDAP_REQUIRED_GROUP_DN` — un coût constant, quel que soit le nombre d'utilisateurs.
- Chaque utilisateur LDAP actif dont le DN n'apparaît plus dans cette liste est **désactivé** (`isActive=false`). Le contrôle déjà effectué à chaque requête API (`Compte désactivé`) coupe alors sa session dès son prochain appel — sans attendre l'expiration du token ni une nouvelle tentative de connexion.
- Si cet utilisateur **réintègre** le groupe par la suite, son compte est **automatiquement réactivé**, soit au cycle de synchronisation suivant, soit immédiatement à sa prochaine connexion réussie. Cette réactivation automatique ne s'applique **que** si la désactivation provient de cette synchronisation : un compte désactivé manuellement dans Administration > Utilisateurs n'est jamais réactivé par ce mécanisme.
- **Bascule failover** : comme pour le login, la requête est tentée sur le serveur principal puis, en cas d'erreur de connexion, sur le serveur de secours s'il est configuré.
- **Garde-fou** : si les serveurs LDAP (principal et secours) sont inaccessibles, ou si `LDAP_REQUIRED_GROUP_DN` ne correspond à aucun groupe existant sur le serveur interrogé, le cycle est **entièrement ignoré** (aucune désactivation) — pour éviter qu'une panne réseau ou une erreur de configuration ne déconnecte tous les utilisateurs.

**Configuration** (`backend/.env`) :
```
LDAP_GROUP_CHECK_INTERVAL=5
```
Sans effet si `LDAP_REQUIRED_GROUP_DN` n'est pas défini (aucune restriction de groupe = rien à synchroniser).

**Limites** :
- Seuls les membres **directs** du groupe requis sont pris en compte (groupes AD imbriqués non résolus), cohérent avec la vérification `memberOf` effectuée au login.
- Pour un groupe de plus de 1500 membres directs, la limite native d'Active Directory sur la taille des attributs multivalués (`MaxValRange`) n'est pas paginée.

#### Kerberos
- ✅ Configuration realm et KDC
- ✅ Test de connexion

#### IMAP
- ✅ Configuration du serveur IMAP
- ✅ Import automatique de tous les emails OU filtrage avancé
- ✅ Filtrage par domaine d'expéditeur (@exemple.fr)
- ✅ Filtrage par adresse email exacte
- ✅ Filtrage par mots-clés dans le sujet
- ✅ Filtrage par mots-clés dans le corps du message
- ✅ Combinaison des filtres avec opérateur OU
- ✅ Support TLS/SSL
- ✅ Test de connexion avec récupération des dossiers
- ✅ Sélection du dossier à surveiller (liste déroulante)
- ✅ Sélection du dossier de destination après traitement
- ✅ Option de création de nouveaux dossiers
- ✅ Marquer comme lu après traitement (configurable)
- ✅ Suppression après traitement (option)
- ✅ Traiter tous les emails (y compris déjà lus)
- ✅ Détection des doublons (évite les imports multiples)
- ✅ Déplacement automatique vers le dossier traité
- ✅ Bouton "Vérifier Courrier" sur la page des courriers entrants (affiche le statut OCR en temps réel et rafraîchit la liste automatiquement)

#### Stockage externe (OneDrive)
- ✅ Intégration Microsoft OneDrive via Azure AD
- ✅ Configuration OAuth 2.0 (Client ID, Tenant ID, Client Secret)
- ✅ Authentification sécurisée avec popup OAuth
- ✅ Test de connexion
- ✅ Déconnexion/reconnexion du compte
- ✅ Synchronisation automatique des courriers archivés
- ✅ Synchronisation des fichiers de réponse
- ✅ Structure de dossiers personnalisable :
  - Par service
  - Par année
  - Par mois
- ✅ Sélection du dossier de destination
- ✅ Navigateur de dossiers OneDrive intégré
- ✅ Création de nouveaux dossiers depuis l'interface
- ✅ Prévisualisation de la structure de dossiers

#### Stockage externe (Amazon S3 / Compatible)
- ✅ Support Amazon S3, MinIO, Wasabi, DigitalOcean Spaces
- ✅ Configuration Access Key / Secret Key
- ✅ Endpoint personnalisable pour les services compatibles S3
- ✅ Sélection de la région
- ✅ Configuration du bucket
- ✅ Test de connexion
- ✅ Synchronisation automatique des courriers archivés
- ✅ Structure de dossiers personnalisable :
  - Par service
  - Par année
  - Par mois
- ✅ Prévisualisation de la structure de dossiers

#### Stockage externe (NextCloud / ownCloud)
- ✅ Connexion via protocole WebDAV
- ✅ Configuration URL serveur, utilisateur, mot de passe
- ✅ Test de connexion
- ✅ Synchronisation automatique des courriers archivés
- ✅ Structure de dossiers personnalisable :
  - Par service
  - Par année
  - Par mois
- ✅ Création automatique de dossiers
- ✅ Prévisualisation de la structure de dossiers

#### Options de stockage avancées (S3, NextCloud, OneDrive)
- ✅ **Mode stockage externe uniquement** : Supprimer automatiquement les fichiers locaux après synchronisation
- ✅ Économie d'espace disque sur le serveur local
- ✅ Les courriers restent consultables dans l'interface comme s'ils étaient locaux
- ✅ Téléchargement transparent depuis le stockage externe
- ✅ Support des fichiers principaux ET des réponses
- ✅ Récupération automatique en cas de fichier local manquant

#### Base de données
- ✅ Informations de connexion MongoDB

### Import automatique
- ✅ Import IMAP des emails avec pièces jointes PDF
- ✅ Filtrage intelligent des emails à importer
- ✅ OCR des documents scannés
- ✅ File d'attente des courriers en attente de validation

### Dashboard
- ✅ Statistiques globales
- ✅ **Section Mes courriers** (courriers où l'utilisateur est destinataire)
- ✅ **Section Courriers Service(s)** (courriers des services de l'utilisateur)
- ✅ **Sections repliables/dépliables** avec animation fluide :
  - Import, Mes courriers, Courriers Délégués, Service, Statistiques globales
  - Derniers courriers à traiter, Courriers urgents, Fichiers en attente, Statistiques du mois
  - Header cliquable avec indicateur visuel (chevron)
  - Pas d'espace blanc quand une section est fermée
- ✅ **Cartes animées** : les cartes statistiques s'animent quand elles contiennent des éléments à traiter (rebond, pulsation, halo coloré)
- ✅ Courriers par statut
- ✅ Courriers récents
- ✅ Activité des utilisateurs

### Statistiques avancées
- ✅ **Page dédiée** accessible depuis le menu principal
- ✅ **Design moderne** :
  - Header avec dégradé coloré (indigo → violet → rose)
  - Cartes animées avec effets de survol
  - Animations fluides avec Framer Motion
  - Interface responsive et intuitive
- ✅ **Filtres dynamiques collapsibles** :
  - Périmètre : Mes courriers / Mon service / Tous (selon permissions)
  - Période : date de début et de fin
  - Service (pour administrateurs)
  - Utilisateur (pour administrateurs)
  - Résumé des filtres actifs visible même fermé
- ✅ **Indicateurs clés animés** :
  - Total des courriers avec icônes colorées
  - Courriers à traiter / traités / archivés
  - Cartes avec effet d'élévation au survol
  - Barre de progression colorée animée
- ✅ **Temps de traitement** :
  - Temps moyen avec design bleu
  - Temps minimum avec design vert
  - Temps maximum avec design rouge
- ✅ **Graphiques interactifs** (Chart.js) :
  - Répartition par statut (Doughnut avec découpe centrale)
  - Répartition par priorité (Pie coloré par niveau)
  - Évolution mensuelle (Bar chart groupé)
  - **Courriers importés** (Bar chart Manuel vs IMAP)
  - Performance par utilisateur (Bar chart avec avatars)
  - Répartition par service (Bar chart horizontal)
  - Top 10 expéditeurs (Bar chart)
- ✅ **Section Mes performances** :
  - Design gradient vert/teal moderne
  - 3 métriques clés en cartes translucides
  - Graphique en courbe avec remplissage
  - Effets visuels blur décoratifs
- ✅ **Tableaux enrichis** :
  - Avatars générés avec initiales
  - Badges colorés pour les statistiques
  - Hover effects sur les lignes
- ✅ **Export PDF personnalisable** :
  - Bouton paramètres pour choisir les sections à inclure
  - Génération native PDF avec jsPDF (haute qualité)
  - Header professionnel avec dégradé coloré
  - Cartes résumé avec bordures colorées
  - Graphiques capturés depuis Chart.js en haute résolution (x3)
  - Tableaux formatés avec alternance de couleurs
  - Polices agrandies pour une lisibilité optimale à l'impression A4
  - Gestion automatique multi-pages
  - Footer avec numérotation des pages

### Délégation de courriers
- ✅ **Gestion des absences** : déléguez temporairement vos courriers à un collègue
- ✅ **Dates de début/fin** : planifiez vos délégations à l'avance
- ✅ **Révocation instantanée** : reprenez le contrôle à tout moment
- ✅ **Évitement des doublons** : si le délégataire est déjà destinataire, pas de duplication
- ✅ **Historique complet** : consultez l'historique de vos délégations
- ✅ **Interface dédiée** : onglet "Délégations" dans Mon Profil

### Interface utilisateur
- ✅ **Sidebar avec sections distinctes** :
  - Import (pour utilisateurs autorisés)
  - Mes courriers (avec badges bleus)
  - Courriers Délégués (avec badges violets) - visible uniquement si délégations actives
  - Courriers Service(s) (avec badges orange)
  - Administration
- ✅ **Dashboard avec sections séparées** :
  - Mes courriers : uniquement les courriers où je suis destinataire direct
  - Courriers Délégués : courriers reçus par délégation (section visible si délégations actives)
  - Courriers Service(s) : courriers du service
- ✅ **Badges temps réel** pour le nombre de courriers à traiter/traités
- ✅ **Navigation intelligente** : distinction visuelle selon le scope sélectionné (mine, delegated, service)
- ✅ Sections collapsibles dans la sidebar
- ✅ Design responsive

## 🛠️ Installation

### Prérequis
- Node.js 18+
- MongoDB 6+
- npm ou yarn

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd GED

# Installer les dépendances globales
npm install

# Configuration du backend
cd backend
cp .env.example .env
# Éditer le fichier .env avec vos paramètres

# Lancer le seed (données initiales)
# Optionnel : si la base est vide, le serveur l'initialise automatiquement
# au démarrage (voir "Comptes par défaut" ci-dessous).
npm run seed

# Retour à la racine
cd ..
```

### Comptes par défaut

Si la base de données ne contient **aucun utilisateur**, le serveur crée automatiquement
au démarrage les groupes, services et comptes de démonstration suivants (via
`backend/src/scripts/seed.js`) :

| Utilisateur | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | Administrateur |
| `superviseur` | `super123` | Superviseur |
| `archiviste` | `archi123` | Archiviste |
| `utilisateur` | `user123` | Utilisateur |

⚠️ **Pensez à changer ces mots de passe avant de passer en production.**

Cette initialisation automatique ne se déclenche qu'une seule fois, lorsque la collection
`users` est vide (premier démarrage). Vous pouvez aussi la lancer manuellement avec
`npm run seed` (utilisez `npm run seed -- --force` pour réinitialiser une base existante).

### Variables d'environnement (.env)

Créez le fichier `backend/.env` à partir de `backend/.env.example` :

```env
# ═══════════════════════════════════════════════════════════════
# CONFIGURATION DU SERVEUR
# ═══════════════════════════════════════════════════════════════
PORT=5000
NODE_ENV=development  # development | production

# ═══════════════════════════════════════════════════════════════
# BASE DE DONNÉES
# ═══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017/ged_courrier

# ═══════════════════════════════════════════════════════════════
# AUTHENTIFICATION JWT
# ═══════════════════════════════════════════════════════════════
# IMPORTANT: Changez cette valeur en production !
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_minimum_32_caracteres
JWT_EXPIRE=7d  # Durée de validité du token (7d, 24h, etc.)

# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
APP_URL=http://localhost:5173  # URL du frontend
APP_NAME=GED Courrier

# ═══════════════════════════════════════════════════════════════
# CORS - Origines autorisées (séparées par des virgules)
# ═══════════════════════════════════════════════════════════════
# Développement:
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
# Production:
# CORS_ORIGIN=https://mondomaine.com,https://www.mondomaine.com

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
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=votre_mot_de_passe
SMTP_FROM=GED Courrier <no-reply@example.com>

# ═══════════════════════════════════════════════════════════════
# LDAP - Authentification annuaire (optionnel)
# ═══════════════════════════════════════════════════════════════
LDAP_ENABLED=false
LDAP_URL=ldap://votre-serveur-ldap:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=votre_mot_de_passe
LDAP_SEARCH_BASE=dc=example,dc=com
LDAP_SEARCH_FILTER=(uid={{username}})  # {{username}} sera remplacé
# DN du groupe LDAP/AD dont les membres sont seuls autorisés à utiliser l'application (optionnel)
LDAP_REQUIRED_GROUP_DN=cn=GED,ou=group,dc=example,dc=com

# Serveur LDAP/AD de secours (optionnel) : bascule automatique si le principal est inaccessible
# Laisser LDAP_URL_BACKUP vide pour désactiver le failover
LDAP_URL_BACKUP=
LDAP_BIND_DN_BACKUP=
LDAP_BIND_PASSWORD_BACKUP=
# Optionnels : si vides, reprennent la valeur de la configuration principale ci-dessus
LDAP_SEARCH_BASE_BACKUP=
LDAP_SEARCH_FILTER_BACKUP=
LDAP_REQUIRED_GROUP_DN_BACKUP=

# Intervalle (en minutes) de vérification périodique de l'appartenance à LDAP_REQUIRED_GROUP_DN
# Un utilisateur ayant quitté ce groupe est désactivé au cycle suivant, coupant sa session active
LDAP_GROUP_CHECK_INTERVAL=5

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
IMAP_MAILBOX=INBOX  # Dossier à surveiller
IMAP_PROCESSED_FOLDER=Traités  # Dossier de destination après traitement
IMAP_CHECK_INTERVAL=5  # Intervalle de vérification en minutes
```

### Variables d'environnement Frontend (.env)

Créez le fichier `frontend/.env` (optionnel) :

```env
# URL de l'API Backend
# En développement (avec proxy Vite): /api
# En production (domaine séparé): https://api.mondomaine.com/api
VITE_API_URL=/api

# URL des fichiers uploadés
# En développement: /uploads
# En production: /uploads ou URL absolue
VITE_UPLOADS_URL=/uploads
```

### Développement

```bash
# Lancer backend et frontend simultanément
npm run dev
```

Ou séparément :

```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev
```

### 🐳 Développement avec Docker

Plusieurs configurations Docker sont disponibles :

#### Avec MongoDB inclus (recommandé pour commencer)

```bash
# Démarrer l'environnement complet
docker-compose -f docker-compose.dev.yml up

# Avec l'interface Mongo Express (optionnel)
docker-compose -f docker-compose.dev.yml --profile tools up
```

#### Sans MongoDB (si MongoDB est déjà installé)

```bash
# Démarrer l'environnement (MongoDB doit tourner sur l'hôte)
docker-compose -f docker-compose.dev.standalone.yml up
```

#### Accès en développement

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Mongo Express | http://localhost:8081 (profil tools) |

### Production

```bash
# Build du frontend
cd frontend
npm run build

# Lancer le backend en production
cd ../backend
NODE_ENV=production npm start
```

### 🐳 Production avec Docker

#### Option 1 : Stack complète (avec MongoDB)

```bash
cp .env.example .env
# Éditer .env avec vos paramètres
docker-compose up -d --build
```

#### Option 2 : Sans MongoDB (MongoDB externe)

```bash
cp .env.standalone.example .env
# Éditer .env avec vos paramètres
docker-compose -f docker-compose.standalone.yml up -d --build
```

#### Mise à jour Docker

```bash
# Linux/Mac
./update.sh

# Windows
update.bat
```

📖 **Documentation complète** : Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour toutes les options de déploiement.

## 📁 Structure du projet

```
GED/
├── backend/
│   ├── src/
│   │   ├── middleware/     # Auth, upload middleware
│   │   ├── models/         # Schémas Mongoose
│   │   │   ├── EmailTemplate.model.js
│   │   │   ├── Group.model.js
│   │   │   ├── Mail.model.js
│   │   │   ├── PendingMail.model.js
│   │   │   ├── Sender.model.js
│   │   │   ├── Service.model.js
│   │   │   ├── Settings.model.js
│   │   │   ├── Subject.model.js
│   │   │   └── User.model.js
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services (IMAP, LDAP, OCR, etc.)
│   │   ├── scripts/        # Scripts (seed, migration)
│   │   └── server.js       # Point d'entrée
│   ├── uploads/            # Fichiers uploadés
│   │   └── branding/       # Logo personnalisé
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── layouts/        # Layouts (Auth, Main)
│   │   ├── pages/          # Pages de l'application
│   │   │   ├── admin/      # Pages administration
│   │   │   ├── auth/       # Login, Reset password
│   │   │   ├── dashboard/  # Tableau de bord
│   │   │   ├── mails/      # Gestion courriers
│   │   │   ├── profile/    # Profil utilisateur
│   │   │   └── stats/      # Statistiques avancées
│   │   ├── services/       # API service
│   │   ├── stores/         # Zustand stores
│   │   │   ├── authStore.js
│   │   │   └── brandingStore.js
│   │   └── App.jsx         # Routes principales
│   └── package.json
└── package.json            # Scripts globaux
```

## 👥 Groupes utilisateurs

| Groupe | Description |
|--------|-------------|
| **Administrateur** | Accès complet à toutes les fonctionnalités |
| **Superviseur** | Gestion des courriers du service, vue globale |
| **Archiviste** | Import et archivage des courriers |
| **Utilisateur** | Consultation et traitement des courriers assignés |

## 🔐 Permissions

Les permissions sont gérées au niveau des groupes et organisées par catégorie :

### Courriers
| Permission | Description |
|------------|-------------|
| `view_own_mails` | Voir ses propres courriers |
| `view_service_mails` | Voir les courriers du service |
| `view_all_mails` | Voir tous les courriers |
| `process_mails` | Traiter des courriers |
| `archive_mails` | Archiver des courriers |
| `import_mails` | Importer des courriers |
| `delete_mails` | Supprimer des courriers |
| `export_mails` | Exporter des courriers |

### Utilisateurs
| Permission | Description |
|------------|-------------|
| `view_users` | Voir les utilisateurs |
| `create_users` | Créer des utilisateurs |
| `edit_users` | Modifier des utilisateurs |
| `delete_users` | Supprimer des utilisateurs |

### Groupes
| Permission | Description |
|------------|-------------|
| `view_groups` | Voir les groupes |
| `create_groups` | Créer des groupes |
| `edit_groups` | Modifier des groupes |
| `delete_groups` | Supprimer des groupes |

### Services
| Permission | Description |
|------------|-------------|
| `view_services` | Voir les services |
| `create_services` | Créer des services |
| `edit_services` | Modifier des services |
| `delete_services` | Supprimer des services |

### Expéditeurs
| Permission | Description |
|------------|-------------|
| `view_senders` | Voir les expéditeurs |
| `create_senders` | Créer des expéditeurs |
| `edit_senders` | Modifier des expéditeurs |
| `delete_senders` | Supprimer des expéditeurs |

### Paramètres
| Permission | Description |
|------------|-------------|
| `view_settings` | Voir les paramètres |
| `edit_settings` | Modifier les paramètres |
| `manage_settings` | Gérer tous les paramètres |
| `manage_ldap` | Gérer la configuration LDAP |
| `manage_kerberos` | Gérer la configuration Kerberos |
| `manage_imap` | Gérer la configuration IMAP |

### Statistiques
| Permission | Description |
|------------|-------------|
| `view_stats` | Voir ses statistiques |
| `view_all_stats` | Voir toutes les statistiques |

## 📧 Configuration Email

### SMTP
Pour activer l'envoi d'emails (notifications, réinitialisation mot de passe) :

1. Aller dans **Paramètres > SMTP**
2. Configurer le serveur SMTP :
   - Serveur (ex: `smtp.gmail.com`)
   - Port (587 pour TLS, 465 pour SSL)
   - Utilisateur et mot de passe
   - Email expéditeur
3. Tester avec le bouton "Envoyer un test"

> **Note Gmail** : Utilisez un [mot de passe d'application](https://myaccount.google.com/apppasswords) si la 2FA est activée.

### IMAP
Pour activer l'import automatique des emails :

1. Aller dans **Paramètres > IMAP**
2. Configurer le serveur IMAP :
   - Serveur (ex: `imap.gmail.com`)
   - Port (993 avec TLS)
   - Identifiants
3. Les emails avec pièces jointes PDF seront importés automatiquement
4. Les courriers apparaîtront dans **Courriers entrants**

### Modèles d'emails
Personnalisez les emails envoyés par l'application :

1. Aller dans **Paramètres > Modèles de mail**
2. Créer ou modifier un template
3. Utiliser les variables disponibles selon le type d'action

#### Types d'actions disponibles

| Action | Code | Description |
|--------|------|-------------|
| Bienvenue | `welcome` | Email envoyé lors de la création d'un compte |
| Réinitialisation | `password_reset` | Email de réinitialisation de mot de passe |
| Courrier à traiter | `mail_to_process` | Notification d'un nouveau courrier |
| Courrier assigné | `mail_assigned` | Notification d'assignation de courrier |
| Rappel | `mail_reminder` | Rappel d'échéance proche |
| Courrier en retard | `mail_overdue` | Alerte de dépassement d'échéance |
| **Superviseur (nouveau courrier)** | `supervisor_new_mail` | Notification au superviseur lors de l'arrivée d'un courrier |
| **Co-destinataire (traitement)** | `corecipient_processed` | Notification aux co-destinataires lors du traitement |
| **Co-destinataire (archivage)** | `corecipient_archived` | Notification aux co-destinataires lors de l'archivage |
| Personnalisé | `custom` | Template libre |

#### Variables communes (tous les templates)

| Variable | Description |
|----------|-------------|
| `{{appName}}` | Nom de l'application |
| `{{appUrl}}` | URL de l'application |
| `{{currentDate}}` | Date actuelle |
| `{{currentYear}}` | Année actuelle |

#### Variables par type d'action

**Bienvenue (`welcome`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet de l'utilisateur |
| `{{userEmail}}` | Email de l'utilisateur |
| `{{userFirstName}}` | Prénom de l'utilisateur |
| `{{userLastName}}` | Nom de l'utilisateur |
| `{{temporaryPassword}}` | Mot de passe temporaire généré |
| `{{loginUrl}}` | URL de la page de connexion |

**Réinitialisation de mot de passe (`password_reset`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet de l'utilisateur |
| `{{userEmail}}` | Email de l'utilisateur |
| `{{userFirstName}}` | Prénom de l'utilisateur |
| `{{userLastName}}` | Nom de l'utilisateur |
| `{{resetLink}}` | Lien de réinitialisation |
| `{{resetToken}}` | Token de réinitialisation |
| `{{expirationTime}}` | Durée de validité du lien |

**Courrier à traiter (`mail_to_process`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du destinataire |
| `{{userFirstName}}` | Prénom du destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{senderName}}` | Nom de l'expéditeur |
| `{{mailDate}}` | Date de réception |
| `{{mailPriority}}` | Priorité du courrier |
| `{{mailUrl}}` | Lien vers le courrier |

**Courrier assigné (`mail_assigned`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du destinataire |
| `{{userFirstName}}` | Prénom du destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{senderName}}` | Nom de l'expéditeur |
| `{{assignedBy}}` | Nom de la personne qui a assigné |
| `{{mailUrl}}` | Lien vers le courrier |

**Rappel de courrier (`mail_reminder`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du destinataire |
| `{{userFirstName}}` | Prénom du destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{daysRemaining}}` | Nombre de jours restants |
| `{{dueDate}}` | Date d'échéance |
| `{{mailUrl}}` | Lien vers le courrier |

**Courrier en retard (`mail_overdue`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du destinataire |
| `{{userFirstName}}` | Prénom du destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{daysOverdue}}` | Nombre de jours de retard |
| `{{dueDate}}` | Date d'échéance dépassée |
| `{{mailUrl}}` | Lien vers le courrier |

**Notification superviseur (`supervisor_new_mail`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du superviseur |
| `{{userFirstName}}` | Prénom du superviseur |
| `{{serviceName}}` | Nom du service |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{senderName}}` | Nom de l'expéditeur |
| `{{mailDate}}` | Date de réception |
| `{{mailPriority}}` | Priorité du courrier |
| `{{mailUrl}}` | Lien vers le courrier |

**Notification co-destinataire traitement (`corecipient_processed`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du co-destinataire |
| `{{userFirstName}}` | Prénom du co-destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{senderName}}` | Nom de l'expéditeur |
| `{{processedBy}}` | Nom de la personne qui a traité |
| `{{processedDate}}` | Date de traitement |
| `{{mailUrl}}` | Lien vers le courrier |

**Notification co-destinataire archivage (`corecipient_archived`)** :
| Variable | Description |
|----------|-------------|
| `{{userName}}` | Nom complet du co-destinataire |
| `{{userFirstName}}` | Prénom du co-destinataire |
| `{{mailReference}}` | Référence du courrier |
| `{{mailSubject}}` | Objet du courrier |
| `{{senderName}}` | Nom de l'expéditeur |
| `{{archivedBy}}` | Nom de la personne qui a archivé |
| `{{archivedDate}}` | Date d'archivage |
| `{{mailUrl}}` | Lien vers le courrier |

### Notifications automatiques

Le système utilise les templates ci-dessus pour envoyer automatiquement les notifications suivantes :

#### Notification superviseur de service
Envoyée au superviseur d'un service lorsqu'un nouveau courrier arrive pour ce service.
- **Template** : `supervisor_new_mail` (personnalisable)
- **Déclencheur** : Import/création d'un courrier
- **Condition** : Le service a un superviseur configuré avec notifications activées
- **Destinataire** : Superviseur du service

#### Notification de traitement (co-destinataires)
Envoyée aux destinataires en copie lorsqu'un courrier est marqué comme traité.
- **Template** : `corecipient_processed` (personnalisable)
- **Déclencheur** : Marquage d'un courrier comme "Traité"
- **Condition** : Le courrier a des destinataires en copie avec email
- **Destinataires** : Tous les co-destinataires

#### Notification d'archivage (co-destinataires)
Envoyée aux destinataires en copie lorsqu'un courrier est archivé.
- **Template** : `corecipient_archived` (personnalisable)
- **Déclencheur** : Archivage d'un courrier
- **Condition** : Le courrier a des destinataires en copie avec email
- **Destinataires** : Tous les co-destinataires

> **💡 Astuce** : Tous les templates disposent de versions par défaut intégrées. Créez vos propres templates pour personnaliser l'apparence et le contenu des emails selon vos besoins.

## 🎨 Personnalisation (Branding)

Personnalisez l'apparence de l'application :

1. Aller dans **Paramètres > Apparence**
2. Options disponibles :
   - **Logo** : Upload d'une image (PNG, JPG, SVG, WebP - max 2MB)
   - **Nom de l'application** : Affiché dans la sidebar et le titre
   - **Version** : Affichée dans la sidebar
   - **Texte du footer** : Personnalisable
   - **Afficher/Masquer le footer**

## 🔒 Sécurité

- Authentification JWT avec expiration configurable
- Hashage bcrypt des mots de passe
- Protection CORS
- Helmet pour les headers de sécurité
- Validation des entrées avec express-validator et Mongoose
- Upload sécurisé avec vérification MIME
- Permissions granulaires par groupe
- Masquage des mots de passe dans l'interface

## 📝 API

L'API REST est accessible sur `http://localhost:5000/api`. Toutes les routes protégées nécessitent un header `Authorization: Bearer <token>`.

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/forgot-password` | Demande de réinitialisation |
| POST | `/api/auth/reset-password` | Réinitialisation du mot de passe |
| PUT | `/api/auth/profile` | Mise à jour du profil |
| GET | `/api/auth/me` | Obtenir l'utilisateur courant |

#### Connexion
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "...",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

#### Inscription
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Demande de réinitialisation de mot de passe
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

#### Réinitialisation du mot de passe
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "newpassword123"
  }'
```

#### Obtenir l'utilisateur courant
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

#### Mise à jour du profil
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }'
```

---

### Courriers

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/mails` | Liste des courriers |
| GET | `/api/mails/:id` | Détail d'un courrier |
| POST | `/api/mails` | Créer un courrier |
| PUT | `/api/mails/:id` | Modifier un courrier |
| PUT | `/api/mails/:id/process` | Marquer comme traité |
| PUT | `/api/mails/:id/archive` | Archiver |
| POST | `/api/mails/:id/response` | Ajouter une réponse |
| DELETE | `/api/mails/:id` | Supprimer un courrier |

#### Liste des courriers
```bash
# Liste simple
curl -X GET http://localhost:5000/api/mails \
  -H "Authorization: Bearer <token>"

# Avec filtres
curl -X GET "http://localhost:5000/api/mails?status=pending&service=123&page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# Recherche
curl -X GET "http://localhost:5000/api/mails?search=facture&startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer <token>"
```

**Paramètres de requête :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | `pending`, `processed`, `archived` |
| `service` | string | ID du service |
| `assignedTo` | string | ID de l'utilisateur assigné |
| `search` | string | Recherche texte |
| `startDate` | date | Date de début (YYYY-MM-DD) |
| `endDate` | date | Date de fin (YYYY-MM-DD) |
| `page` | number | Numéro de page (défaut: 1) |
| `limit` | number | Éléments par page (défaut: 20) |

#### Détail d'un courrier
```bash
curl -X GET http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

#### Créer un courrier
```bash
curl -X POST http://localhost:5000/api/mails \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: multipart/form-data" \
  -F "reference=ENT-2025-001" \
  -F "subject=Demande de renseignement" \
  -F "sender=Mairie de Paris" \
  -F "service=60f7b3b3b3b3b3b3b3b3b3b3" \
  -F "receivedDate=2025-01-15" \
  -F "priority=normal" \
  -F "file=@/path/to/document.pdf"
```

#### Modifier un courrier
```bash
curl -X PUT http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Demande urgente",
    "priority": "high",
    "assignedTo": "60f7b3b3b3b3b3b3b3b3b3b4"
  }'
```

#### Marquer comme traité
```bash
curl -X PUT http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "processedNote": "Réponse envoyée par courrier"
  }'
```

#### Archiver un courrier
```bash
curl -X PUT http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3/archive \
  -H "Authorization: Bearer <token>"
```

#### Ajouter une réponse
```bash
curl -X POST http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3/response \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: multipart/form-data" \
  -F "content=Voici notre réponse à votre demande..." \
  -F "file=@/path/to/response.pdf"
```

#### Supprimer un courrier
```bash
curl -X DELETE http://localhost:5000/api/mails/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Courriers en attente

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/pending-mails` | Liste des courriers en attente |
| POST | `/api/pending-mails/:id/validate` | Valider un courrier |
| DELETE | `/api/pending-mails/:id` | Rejeter un courrier |

#### Liste des courriers en attente
```bash
curl -X GET http://localhost:5000/api/pending-mails \
  -H "Authorization: Bearer <token>"
```

#### Valider un courrier en attente
```bash
curl -X POST http://localhost:5000/api/pending-mails/60f7b3b3b3b3b3b3b3b3b3b3/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "ENT-2025-002",
    "subject": "Facture janvier",
    "service": "60f7b3b3b3b3b3b3b3b3b3b4"
  }'
```

#### Rejeter un courrier en attente
```bash
curl -X DELETE http://localhost:5000/api/pending-mails/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Liste des utilisateurs |
| GET | `/api/users/:id` | Détail d'un utilisateur |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/:id` | Modifier un utilisateur |
| DELETE | `/api/users/:id` | Supprimer un utilisateur |

#### Liste des utilisateurs
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer <token>"
```

#### Détail d'un utilisateur
```bash
curl -X GET http://localhost:5000/api/users/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

#### Créer un utilisateur
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Doe",
    "group": "60f7b3b3b3b3b3b3b3b3b3b3",
    "service": "60f7b3b3b3b3b3b3b3b3b3b4",
    "isActive": true
  }'
```

#### Modifier un utilisateur
```bash
curl -X PUT http://localhost:5000/api/users/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "isActive": false
  }'
```

#### Supprimer un utilisateur
```bash
curl -X DELETE http://localhost:5000/api/users/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Groupes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/groups` | Liste des groupes |
| GET | `/api/groups/:id` | Détail d'un groupe |
| POST | `/api/groups` | Créer un groupe |
| PUT | `/api/groups/:id` | Modifier un groupe |
| DELETE | `/api/groups/:id` | Supprimer un groupe |

#### Liste des groupes
```bash
curl -X GET http://localhost:5000/api/groups \
  -H "Authorization: Bearer <token>"
```

#### Créer un groupe
```bash
curl -X POST http://localhost:5000/api/groups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gestionnaires",
    "description": "Groupe des gestionnaires de courrier",
    "permissions": [
      "view_own_mails",
      "view_service_mails",
      "process_mails",
      "archive_mails"
    ]
  }'
```

#### Modifier un groupe
```bash
curl -X PUT http://localhost:5000/api/groups/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gestionnaires Senior",
    "permissions": [
      "view_own_mails",
      "view_service_mails",
      "view_all_mails",
      "process_mails",
      "archive_mails",
      "delete_mails"
    ]
  }'
```

#### Supprimer un groupe
```bash
curl -X DELETE http://localhost:5000/api/groups/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Services

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/services` | Liste des services |
| POST | `/api/services` | Créer un service |
| PUT | `/api/services/:id` | Modifier un service |
| DELETE | `/api/services/:id` | Supprimer un service |

#### Liste des services
```bash
curl -X GET http://localhost:5000/api/services \
  -H "Authorization: Bearer <token>"
```

#### Créer un service
```bash
curl -X POST http://localhost:5000/api/services \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ressources Humaines",
    "code": "RH",
    "description": "Service des ressources humaines"
  }'
```

#### Modifier un service
```bash
curl -X PUT http://localhost:5000/api/services/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Direction RH",
    "description": "Direction des ressources humaines"
  }'
```

#### Supprimer un service
```bash
curl -X DELETE http://localhost:5000/api/services/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Expéditeurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/senders` | Liste des expéditeurs |
| POST | `/api/senders` | Créer un expéditeur |
| PUT | `/api/senders/:id` | Modifier un expéditeur |
| DELETE | `/api/senders/:id` | Supprimer un expéditeur |

#### Liste des expéditeurs
```bash
curl -X GET http://localhost:5000/api/senders \
  -H "Authorization: Bearer <token>"
```

#### Créer un expéditeur
```bash
curl -X POST http://localhost:5000/api/senders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Préfecture de Seine-Maritime",
    "email": "contact@prefecture76.gouv.fr",
    "address": "7 Place de la Madeleine, 76000 Rouen"
  }'
```

#### Modifier un expéditeur
```bash
curl -X PUT http://localhost:5000/api/senders/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouveau@email.com"
  }'
```

#### Supprimer un expéditeur
```bash
curl -X DELETE http://localhost:5000/api/senders/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Objets prédéfinis

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/subjects` | Liste des objets |
| POST | `/api/subjects` | Créer un objet |
| PUT | `/api/subjects/:id` | Modifier un objet |
| DELETE | `/api/subjects/:id` | Supprimer un objet |

#### Liste des objets
```bash
curl -X GET http://localhost:5000/api/subjects \
  -H "Authorization: Bearer <token>"
```

#### Créer un objet
```bash
curl -X POST http://localhost:5000/api/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demande de subvention",
    "category": "Finances"
  }'
```

#### Modifier un objet
```bash
curl -X PUT http://localhost:5000/api/subjects/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demande de subvention 2025"
  }'
```

#### Supprimer un objet
```bash
curl -X DELETE http://localhost:5000/api/subjects/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Modèles d'emails

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/email-templates` | Liste des templates |
| GET | `/api/email-templates/:id` | Détail d'un template |
| POST | `/api/email-templates` | Créer un template |
| PUT | `/api/email-templates/:id` | Modifier un template |
| DELETE | `/api/email-templates/:id` | Supprimer un template |

#### Liste des templates
```bash
curl -X GET http://localhost:5000/api/email-templates \
  -H "Authorization: Bearer <token>"
```

#### Détail d'un template
```bash
curl -X GET http://localhost:5000/api/email-templates/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

#### Créer un template
```bash
curl -X POST http://localhost:5000/api/email-templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notification de nouveau courrier",
    "action": "mail_to_process",
    "subject": "Nouveau courrier à traiter : {{mailReference}}",
    "htmlContent": "<h1>Bonjour {{userName}}</h1><p>Un nouveau courrier vous a été assigné.</p>",
    "description": "Email envoyé quand un courrier est assigné",
    "isActive": true
  }'
```

#### Modifier un template
```bash
curl -X PUT http://localhost:5000/api/email-templates/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Nouveau courrier urgent : {{mailReference}}",
    "isActive": true
  }'
```

#### Supprimer un template
```bash
curl -X DELETE http://localhost:5000/api/email-templates/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

---

### Webhooks

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/webhooks` | Liste des webhooks |
| GET | `/api/webhooks/:id` | Détail d'un webhook |
| GET | `/api/webhooks/events` | Liste des événements disponibles |
| POST | `/api/webhooks` | Créer un webhook |
| PUT | `/api/webhooks/:id` | Modifier un webhook |
| DELETE | `/api/webhooks/:id` | Supprimer un webhook |
| POST | `/api/webhooks/:id/toggle` | Activer/Désactiver un webhook |
| POST | `/api/webhooks/:id/test` | Tester un webhook |
| POST | `/api/webhooks/:id/reset-stats` | Réinitialiser les statistiques |

**Événements disponibles :**
| Événement | Description |
|-----------|-------------|
| `mail.created` | Courrier créé |
| `mail.updated` | Courrier modifié |
| `mail.processed` | Courrier traité |
| `mail.archived` | Courrier archivé |
| `mail.deleted` | Courrier supprimé |
| `mail.assigned` | Courrier assigné |
| `user.created` | Utilisateur créé |
| `user.updated` | Utilisateur modifié |
| `user.deleted` | Utilisateur supprimé |
| `user.login` | Utilisateur connecté |
| `pending_mail.received` | Courrier en attente reçu |
| `pending_mail.validated` | Courrier en attente validé |
| `pending_mail.rejected` | Courrier en attente rejeté |

#### Liste des webhooks
```bash
curl -X GET http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer <token>"
```

#### Obtenir les événements disponibles
```bash
curl -X GET http://localhost:5000/api/webhooks/events \
  -H "Authorization: Bearer <token>"
```

#### Créer un webhook

**Avec signature HMAC-SHA256 :**
```bash
curl -X POST http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notification Slack",
    "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
    "description": "Notification des nouveaux courriers",
    "events": ["mail.created", "mail.assigned"],
    "authType": "hmac",
    "secret": "mon-secret-webhook",
    "isActive": true,
    "retryOnFailure": true,
    "maxRetries": 3,
    "timeoutMs": 30000
  }'
```

**Avec Basic Auth :**
```bash
curl -X POST http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Externe",
    "url": "https://api.exemple.com/webhook",
    "description": "Intégration avec système externe",
    "events": ["mail.created", "mail.processed"],
    "authType": "basic",
    "authUsername": "webhook_user",
    "authPassword": "secret_password",
    "isActive": true
  }'
```

**Sans authentification :**
```bash
curl -X POST http://localhost:5000/api/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Webhook Simple",
    "url": "https://exemple.com/webhook",
    "events": ["mail.created"],
    "authType": "none"
  }'
```

#### Modifier un webhook
```bash
curl -X PUT http://localhost:5000/api/webhooks/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notification Slack - Urgents",
    "events": ["mail.created", "mail.assigned", "mail.processed"],
    "isActive": true
  }'
```

#### Activer/Désactiver un webhook
```bash
curl -X POST http://localhost:5000/api/webhooks/60f7b3b3b3b3b3b3b3b3b3b3/toggle \
  -H "Authorization: Bearer <token>"
```

#### Tester un webhook
```bash
curl -X POST http://localhost:5000/api/webhooks/60f7b3b3b3b3b3b3b3b3b3b3/test \
  -H "Authorization: Bearer <token>"
```

**Payload de test envoyé :**
```json
{
  "event": "webhook.test",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "message": "Ceci est un test de webhook depuis GED Courrier",
    "webhookId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "webhookName": "Mon webhook"
  }
}
```

**Headers envoyés :**
| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `User-Agent` | `GED-Courrier-Webhook/1.0` |
| `X-Webhook-Event` | Nom de l'événement |
| `X-Webhook-Delivery` | UUID unique de la livraison |
| `X-Webhook-Signature` | Signature HMAC-SHA256 (si `authType: "hmac"`) |
| `Authorization` | Basic Auth encodée en base64 (si `authType: "basic"`) |

#### Supprimer un webhook
```bash
curl -X DELETE http://localhost:5000/api/webhooks/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

#### Réinitialiser les statistiques
```bash
curl -X POST http://localhost:5000/api/webhooks/60f7b3b3b3b3b3b3b3b3b3b3/reset-stats \
  -H "Authorization: Bearer <token>"
```

---

### OneDrive (Stockage externe)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/onedrive/status` | Statut de la connexion OneDrive |
| GET | `/api/onedrive/config` | Configuration OneDrive |
| PUT | `/api/onedrive/config` | Mettre à jour la configuration |
| GET | `/api/onedrive/auth/url` | Obtenir l'URL d'autorisation OAuth |
| POST | `/api/onedrive/auth/callback` | Échanger le code OAuth contre un token |
| POST | `/api/onedrive/test` | Tester la connexion |
| POST | `/api/onedrive/disconnect` | Déconnecter OneDrive |
| GET | `/api/onedrive/folders` | Lister les dossiers |
| POST | `/api/onedrive/folders` | Créer un dossier |

**Configuration requise :**

Pour utiliser OneDrive, vous devez créer une application Azure AD :

1. Allez sur [Azure Portal](https://portal.azure.com)
2. Accédez à "Azure Active Directory" > "Inscriptions d'applications"
3. Cliquez sur "Nouvelle inscription"
4. Configurez :
   - Nom : "GED Courrier OneDrive"
   - Types de comptes : "Comptes dans un annuaire d'organisation et comptes Microsoft personnels"
   - URI de redirection : `http://localhost:5173/settings/onedrive/callback` (type Web)
5. Après création, notez :
   - **Application (client) ID** → Client ID
   - **Directory (tenant) ID** → Tenant ID
6. Créez un secret client dans "Certificats & secrets"
7. Ajoutez les permissions API :
   - Microsoft Graph > Files.ReadWrite.All
   - Microsoft Graph > User.Read

#### Obtenir le statut de connexion
```bash
curl -X GET http://localhost:5000/api/onedrive/status \
  -H "Authorization: Bearer <token>"
```

#### Configurer OneDrive
```bash
curl -X PUT http://localhost:5000/api/onedrive/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "clientId": "votre-client-id",
    "tenantId": "votre-tenant-id",
    "clientSecret": "votre-client-secret",
    "syncOptions": {
      "archivedMails": true,
      "responseFiles": true
    },
    "folderStructure": {
      "useServiceSubfolder": true,
      "useYearSubfolder": true,
      "useMonthSubfolder": true
    },
    "targetFolder": "/GED Courrier/Archives"
  }'
```

#### Tester la connexion
```bash
curl -X POST http://localhost:5000/api/onedrive/test \
  -H "Authorization: Bearer <token>"
```

#### Lister les dossiers
```bash
curl -X GET "http://localhost:5000/api/onedrive/folders?path=/Documents" \
  -H "Authorization: Bearer <token>"
```

#### Créer un dossier
```bash
curl -X POST http://localhost:5000/api/onedrive/folders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/GED Courrier",
    "name": "Archives"
  }'
```

---

### S3 (Stockage externe)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/storage/s3/status` | Statut de la connexion S3 |
| GET | `/api/storage/s3/config` | Configuration S3 |
| PUT | `/api/storage/s3/config` | Mettre à jour la configuration |
| POST | `/api/storage/s3/test` | Tester la connexion |
| POST | `/api/storage/s3/disconnect` | Déconnecter S3 |
| GET | `/api/storage/s3/objects` | Lister les objets |
| POST | `/api/storage/s3/folders` | Créer un dossier |

**Fournisseurs compatibles :**
- Amazon S3
- MinIO
- Wasabi
- DigitalOcean Spaces
- Tout service compatible S3

#### Configurer S3
```bash
curl -X PUT http://localhost:5000/api/storage/s3/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "provider": "aws",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "eu-west-3",
    "bucket": "mon-bucket-ged",
    "endpoint": "",
    "targetFolder": "GED-Courrier/Archives",
    "createServiceFolders": true,
    "createYearFolders": true,
    "createMonthFolders": true,
    "syncArchivedMails": true
  }'
```

#### Tester la connexion S3
```bash
curl -X POST http://localhost:5000/api/storage/s3/test \
  -H "Authorization: Bearer <token>"
```

#### Lister les objets
```bash
curl -X GET "http://localhost:5000/api/storage/s3/objects?prefix=GED-Courrier/" \
  -H "Authorization: Bearer <token>"
```

---

### NextCloud (Stockage externe)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/storage/nextcloud/status` | Statut de la connexion NextCloud |
| GET | `/api/storage/nextcloud/config` | Configuration NextCloud |
| PUT | `/api/storage/nextcloud/config` | Mettre à jour la configuration |
| POST | `/api/storage/nextcloud/test` | Tester la connexion |
| POST | `/api/storage/nextcloud/disconnect` | Déconnecter NextCloud |
| GET | `/api/storage/nextcloud/folders` | Lister les dossiers |
| POST | `/api/storage/nextcloud/folders` | Créer un dossier |

**Protocole :** WebDAV

**Compatible avec :**
- NextCloud
- ownCloud
- Tout serveur WebDAV

#### Configurer NextCloud
```bash
curl -X PUT http://localhost:5000/api/storage/nextcloud/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "serverUrl": "https://nextcloud.exemple.com",
    "username": "admin",
    "password": "mot-de-passe",
    "targetFolder": "/GED-Courrier/Archives",
    "createServiceFolders": true,
    "createYearFolders": true,
    "createMonthFolders": true,
    "syncArchivedMails": true
  }'
```

#### Tester la connexion NextCloud
```bash
curl -X POST http://localhost:5000/api/storage/nextcloud/test \
  -H "Authorization: Bearer <token>"
```

#### Lister les dossiers
```bash
curl -X GET "http://localhost:5000/api/storage/nextcloud/folders?path=/Documents" \
  -H "Authorization: Bearer <token>"
```

#### Créer un dossier
```bash
curl -X POST http://localhost:5000/api/storage/nextcloud/folders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/GED-Courrier/Archives/2025"
  }'
```

---

### Paramètres

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings` | Tous les paramètres |
| GET | `/api/settings/:key` | Un paramètre |
| PUT | `/api/settings` | Mettre à jour plusieurs paramètres |
| PUT | `/api/settings/:key` | Mettre à jour un paramètre |
| POST | `/api/settings/smtp/test` | Tester l'envoi SMTP |
| GET | `/api/settings/public/branding` | Branding (public) |
| POST | `/api/settings/branding/logo` | Upload du logo |
| DELETE | `/api/settings/branding/logo` | Supprimer le logo |

#### Obtenir tous les paramètres
```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer <token>"

# Par catégorie
curl -X GET "http://localhost:5000/api/settings?category=smtp" \
  -H "Authorization: Bearer <token>"
```

#### Obtenir un paramètre spécifique
```bash
curl -X GET http://localhost:5000/api/settings/smtp_host \
  -H "Authorization: Bearer <token>"
```

#### Mettre à jour plusieurs paramètres
```bash
curl -X PUT http://localhost:5000/api/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": [
      { "key": "smtp_host", "value": "smtp.gmail.com", "category": "smtp" },
      { "key": "smtp_port", "value": "587", "category": "smtp" },
      { "key": "smtp_user", "value": "user@gmail.com", "category": "smtp" },
      { "key": "smtp_password", "value": "app-password", "category": "smtp", "isSecret": true },
      { "key": "smtp_from", "value": "noreply@example.com", "category": "smtp" }
    ]
  }'
```

#### Mettre à jour un paramètre
```bash
curl -X PUT http://localhost:5000/api/settings/app_name \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "Mon Application GED",
    "category": "appearance"
  }'
```

#### Tester l'envoi SMTP
```bash
curl -X POST http://localhost:5000/api/settings/smtp/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "templateId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "smtpConfig": {
      "host": "smtp.gmail.com",
      "port": 587,
      "user": "user@gmail.com",
      "password": "app-password",
      "from": "noreply@example.com",
      "fromName": "GED Courrier",
      "secure": false
    }
  }'
```

#### Obtenir le branding (public)
```bash
curl -X GET http://localhost:5000/api/settings/public/branding
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "appName": "GED Courrier",
    "appVersion": "v1.0.0",
    "appLogo": "logo-123456.png",
    "footerText": "Fait avec ❤️",
    "footerVisible": true
  }
}
```

#### Upload du logo
```bash
curl -X POST http://localhost:5000/api/settings/branding/logo \
  -H "Authorization: Bearer <token>" \
  -F "logo=@/path/to/logo.png"
```

#### Supprimer le logo
```bash
curl -X DELETE http://localhost:5000/api/settings/branding/logo \
  -H "Authorization: Bearer <token>"
```

---

### Délégations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/delegations` | Liste des délégations de l'utilisateur |
| GET | `/api/delegations/active` | Délégations actives reçues (pour filtres courriers) |
| POST | `/api/delegations` | Créer une délégation |
| PUT | `/api/delegations/:id` | Modifier une délégation |
| POST | `/api/delegations/:id/revoke` | Révoquer une délégation |
| DELETE | `/api/delegations/:id` | Supprimer une délégation de l'historique |
| GET | `/api/delegations/check/:userId` | Vérifier les chevauchements avec un utilisateur |

#### Liste des délégations
```bash
# Toutes les délégations (données et reçues)
curl -X GET http://localhost:5000/api/delegations \
  -H "Authorization: Bearer <token>"

# Uniquement les délégations données
curl -X GET "http://localhost:5000/api/delegations?type=given" \
  -H "Authorization: Bearer <token>"

# Uniquement les délégations reçues
curl -X GET "http://localhost:5000/api/delegations?type=received" \
  -H "Authorization: Bearer <token>"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "given": [
      {
        "_id": "...",
        "delegator": "...",
        "delegate": {
          "_id": "...",
          "firstName": "Jean",
          "lastName": "Dupont",
          "email": "jean.dupont@example.com"
        },
        "startDate": "2025-01-15T00:00:00.000Z",
        "endDate": "2025-01-30T00:00:00.000Z",
        "status": "active",
        "reason": "Congés"
      }
    ],
    "received": []
  }
}
```

#### Créer une délégation
```bash
curl -X POST http://localhost:5000/api/delegations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "delegateId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "startDate": "2025-01-15",
    "endDate": "2025-01-30",
    "reason": "Congés annuels"
  }'
```

**Paramètres :**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `delegateId` | string | Oui | ID de l'utilisateur qui recevra la délégation |
| `startDate` | date | Non | Date de début (défaut: maintenant) |
| `endDate` | date | Non | Date de fin (null = indéterminée) |
| `reason` | string | Non | Motif de la délégation |

**Statuts possibles :**
| Statut | Description |
|--------|-------------|
| `active` | Délégation en cours |
| `pending` | Délégation programmée (date de début future) |
| `expired` | Délégation expirée (date de fin dépassée) |
| `revoked` | Délégation révoquée manuellement |

#### Révoquer une délégation
```bash
curl -X POST http://localhost:5000/api/delegations/60f7b3b3b3b3b3b3b3b3b3b3/revoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Retour anticipé de congés"
  }'
```

#### Vérifier les chevauchements
Vérifie si un utilisateur est déjà destinataire ou co-destinataire de certains courriers.
```bash
curl -X GET http://localhost:5000/api/delegations/check/60f7b3b3b3b3b3b3b3b3b3b3 \
  -H "Authorization: Bearer <token>"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com"
    },
    "overlap": {
      "asRecipient": 5,
      "asCoRecipient": 3,
      "total": 8,
      "sampleSize": 100
    }
  }
}
```

---

### Statistiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/stats` | Statistiques générales |
| GET | `/api/stats/dashboard` | Statistiques du dashboard |
| GET | `/api/stats/detailed` | Statistiques détaillées avec filtres |
| GET | `/api/stats/my-performance` | Mes performances personnelles |
| GET | `/api/stats/by-service` | Statistiques par service |
| GET | `/api/stats/by-month` | Statistiques par mois |

#### Statistiques du dashboard
```bash
curl -X GET http://localhost:5000/api/stats/dashboard \
  -H "Authorization: Bearer <token>"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "my": { "pending": 5, "processed": 10, "archived": 3 },
    "service": { "pending": 12, "processed": 25, "archived": 8 },
    "pendingCount": 17,
    "processedCount": 35,
    "archivedCount": 11,
    "thisWeek": 8,
    "thisMonth": 25,
    "unread": 4,
    "avgProcessingTime": 24.5
  }
}
```

#### Statistiques détaillées (avec filtres)
```bash
curl -X GET "http://localhost:5000/api/stats/detailed?scope=all&startDate=2025-01-01&endDate=2025-12-31&serviceId=xxx" \
  -H "Authorization: Bearer <token>"
```

**Paramètres :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| scope | string | `my`, `delegated`, `service` ou `all` (selon permissions) |
| startDate | date | Date de début (YYYY-MM-DD) |
| endDate | date | Date de fin (YYYY-MM-DD) |
| serviceId | string | ID du service (optionnel, admin only) |
| userId | string | ID de l'utilisateur (optionnel, admin only) |

**Réponse :**
```json
{
  "success": true,
  "data": {
    "summary": { "pending": 25, "processed": 100, "archived": 50, "total": 175 },
    "processing": { "avgTime": 24.5, "minTime": 0.5, "maxTime": 168, "unit": "heures" },
    "userStats": [
      { "_id": "xxx", "firstName": "Jean", "lastName": "Dupont", "processed": 45, "avgTime": 18.2 }
    ],
    "serviceStats": [
      { "_id": "xxx", "name": "RH", "code": "RH", "total": 50, "pending": 10, "processed": 30, "archived": 10 }
    ],
    "monthlyStats": [
      { "_id": { "year": 2025, "month": 1 }, "total": 15, "pending": 2, "processed": 8, "archived": 5 }
    ],
    "priorityStats": [
      { "_id": "normal", "count": 120 },
      { "_id": "urgent", "count": 15 }
    ],
    "senderStats": [
      { "_id": "xxx", "name": "Mairie de Paris", "count": 25 }
    ]
  }
}
```

#### Mes performances personnelles
```bash
curl -X GET "http://localhost:5000/api/stats/my-performance?startDate=2025-01-01" \
  -H "Authorization: Bearer <token>"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "summary": { "pending": 5, "processed": 20, "archived": 10, "total": 35 },
    "performance": { "processedByMe": 28, "avgProcessingTime": 12.5, "unit": "heures" },
    "monthlyProcessed": [
      { "_id": { "year": 2025, "month": 1 }, "count": 8 }
    ]
  }
}
```

---

### Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé (permissions insuffisantes) |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

### Format des réponses

**Succès :**
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

**Erreur :**
```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": [...]
}
```

**Liste paginée :**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}

## 🖥️ Captures d'écran

### Dashboard
Interface principale avec statistiques et courriers récents.

### Gestion des courriers
Liste des courriers avec filtres, recherche et actions rapides.

### Paramètres
Configuration complète de l'application avec onglets organisés.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est distribué sous licence GNU Affero General Public License v3.0 uniquement (AGPL-3.0-only).
Voir le fichier [LICENSE](LICENSE) pour le texte complet de la licence.

## 👨‍💻 Auteur

Développé avec ❤️ par le Service Informatique de Pavilly
