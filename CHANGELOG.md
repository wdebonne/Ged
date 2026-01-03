# Changelog - GED Courrier

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [3.9.9] - 2025-12-16

### Ajouté

- **Dashboard - Sections collapsibles améliorées** :
  - Toutes les sections du tableau de bord sont maintenant collapsibles
  - Sections principales : Import, Mes courriers, Courriers Délégués, Service, Statistiques globales
  - Cartes détaillées : Derniers courriers, Courriers urgents, Fichiers en attente, Statistiques du mois
  - Animation fluide à l'ouverture/fermeture uniquement (pas d'animation au chargement)
  - Header cliquable avec indicateur chevron (▶/▼)
  - Suppression de l'espace blanc quand une section est fermée (border conditionnel)

- **Export PDF Statistiques - Rendu amélioré** :
  - Capture des graphiques en haute résolution (facteur x3)
  - Préservation des proportions des graphiques (pas de déformation)
  - Header avec dégradé progressif violet/indigo
  - Cartes résumé avec fond coloré et bordures améliorées
  - Titres de sections avec fond coloré distinctif
  - Tableaux avec en-têtes colorés (violet pour utilisateurs, vert pour services)
  - Alternance de couleurs plus prononcée dans les tableaux
  - Section "Mes performances" avec gradient vert et cartes blanches
  - Footer avec ligne colorée et numérotation améliorée
  - **Lisibilité améliorée** : polices agrandies pour les tableaux (12-14pt) et graphiques (18-22pt)
  - Correction du débordement de la colonne "Archivés" dans le tableau "Répartition par service"

- **Dashboard - Cartes animées** :
  - Animation visuelle sur les cartes ayant des éléments à traiter (valeur > 0)
  - Animation subtile de rebond sur l'icône
  - Animation de rotation légère (wiggle) sur l'icône
  - Effet de pulsation sur la valeur numérique
  - Effet de halo coloré autour de la carte
  - Exception : la carte "Archivés" n'est pas animée (statut final)

- **Graphique des courriers importés** :
  - Nouveau graphique "Courriers importés" dans la page Statistiques
  - Affichage des imports par source : Manuel vs IMAP
  - Statistiques mensuelles de l'évolution des imports
  - Cartes récapitulatives avec totaux par type d'import

- **Options d'export PDF pour les statistiques** :
  - Nouveau bouton "Paramètres" (engrenage) à côté de "Export PDF" dans la page Statistiques
  - Modal permettant de sélectionner les sections à inclure dans l'export :
    - Cartes résumé (Total, À traiter, Traités, Archivés)
    - Temps de traitement (moyen, min, max)
    - Répartition par statut
    - Répartition par priorité
    - Évolution mensuelle
    - Statistiques d'import
    - Mes performances
    - Performance par utilisateur
    - Répartition par service
    - Top expéditeurs
  - Possibilité de tout sélectionner / désélectionner d'un clic
  - Export personnalisé avec uniquement les sections choisies

- **Export PDF Statistiques professionnel** :
  - Génération native PDF avec jsPDF (plus fiable que html2canvas)
  - Header avec dégradé violet/indigo
  - Cartes résumé avec bordures colorées
  - Graphiques capturés individuellement depuis Chart.js
  - Tableaux formatés avec alternance de couleurs
  - Gestion automatique multi-pages
  - Footer avec numérotation des pages

### Modifié

- L'API `/api/stats/detailed` retourne maintenant les statistiques d'import (`importStats` et `importSummary`)
- Le bouton "Export PDF" est maintenant accompagné d'un bouton paramètres pour personnaliser l'export
- Remplacement de html2canvas par génération native jsPDF pour les statistiques (meilleure qualité)
- **Export PDF Statistiques** : augmentation significative des tailles de police pour une meilleure lisibilité à l'impression A4
- **Dashboard** : les cartes statistiques sont maintenant animées quand elles contiennent des éléments à traiter

---

## [3.9.8] - 2025-12-16

### Ajouté

- **Options d'export PDF personnalisables pour l'historique des courriers** :
	- Nouveau bouton "Options" (engrenage) à côté d'"Exporter PDF" dans la page Détails du courrier (visible uniquement pour les administrateurs)
	- Modal permettant de choisir les éléments à inclure dans l'export de l'historique (création, attribution au service, destinataire, lectures, traitement, réponses, archivage)
	- Les options activées s'appliquent à tous les utilisateurs lors de l'export, même si le bouton n'est pas visible pour eux
	- Les exports PDF et ZIP respectent ces options

- **Amélioration du rafraîchissement OCR lors de la vérification des courriers entrants** :
	- Affichage d'un badge "OCR en cours" après l'import IMAP
	- Rafraîchissement automatique de la liste après traitement OCR
	- Message "OCR terminé" affiché dès que les fichiers sont prêts

### Modifié

- L'API d'export historique PDF prend désormais en compte les options configurées dans les paramètres
- L'interface d'import IMAP affiche le statut de traitement en temps réel

### Corrigé

- **Synchronisation IMAP/OCR** :
  - Correction d'un bug où le backend renvoyait le résultat avant la fin réelle du traitement des emails (parsing, OCR, sauvegarde). Désormais, le système attend la fin de toutes les opérations avant de compter les courriers importés.
  - Les fichiers apparaissent désormais dans la liste en même temps que le message de confirmation.
- **Message utilisateur** :
  - Le message "Aucun mail à traiter" a été remplacé par "Vérification terminée" pour éviter la confusion lorsque des fichiers sont bien importés mais que le compteur retourné est 0.
  - Les messages d'information sont plus explicites si des emails sont filtrés ou ignorés.
- **Robustesse du rafraîchissement** :
  - Le rafraîchissement de la liste des fichiers en attente est systématique, même en cas d'erreur ou d'absence de nouveaux courriers.
  - Correction d'un cas où la liste pouvait ne pas se mettre à jour immédiatement après une vérification IMAP.
- **Options d'export PDF** :
  - Correction de l'erreur 404 lors du chargement des options d'export de l'historique. Le frontend utilisait une mauvaise route API (`/api/settings/export_history_options` au lieu de `/api/settings/public/export-options`).
  - Le PDF d'historique inclut maintenant les événements "Attribué au service", "Destinataire" et "Destinataires en copie" dans la timeline, conformément aux options activées.
  - Ajout des couleurs distinctes pour chaque type d'événement dans la timeline PDF (service en ambre, destinataire en violet, copies en cyan).
- **Export PDF Statistiques** :
  - Correction de l'export PDF des statistiques qui affichait une page vide. Les graphiques Chart.js (canvas) n'étaient pas capturés par html2canvas.
  - Les canvas sont maintenant convertis en images avant la capture, puis restaurés.

### Sécurité

- Les options d'export ne sont modifiables que par les administrateurs, mais s'appliquent à tous

## [3.9.7] - 2024-12-15

### Amélioré

#### Page de connexion
- **Affichage conditionnel des méthodes d'authentification** : Les boutons LDAP et Kerberos ne sont affichés que si ces méthodes sont activées dans la configuration
- **Interface simplifiée** : Si seule l'authentification locale est disponible, le sélecteur de méthode n'est pas affiché
- **Chargement dynamique** : La configuration d'authentification est récupérée via l'API `/api/auth/config` au montage du composant

#### OCR optionnel
- **Packages OCR optionnels** : Les packages `tesseract.js` et `pdf-to-img` sont maintenant chargés dynamiquement
- **Compatibilité hébergement mutualisé** : L'application démarre même si les packages OCR ne sont pas installés
- **API informative** : L'endpoint `/api/settings/ocr/config` retourne maintenant `available: true/false` pour indiquer si l'OCR est disponible
- **Gestion gracieuse** : Les fonctions OCR retournent des erreurs explicites si les packages ne sont pas installés

### Ajouté

#### Documentation O2Switch
- **Guide de déploiement complet** : Nouveau fichier `DEPLOYMENT-O2SWITCH.md` avec instructions détaillées
- **Configuration MongoDB Atlas** : Guide pour utiliser MongoDB en externe
- **Filtrage IP** : Documentation complète sur la sécurisation via .htaccess
- **Fichier .htaccess** : Template prêt à l'emploi dans `deploy/o2switch/`

---

## [3.9.6] - 2024-12-14

### Corrigé

#### Bug de suppression de courrier
- **Erreur 404 après suppression** : Correction de l'erreur qui survenait quand React Query tentait de recharger un courrier supprimé
- **Nettoyage du cache** : Utilisation de `removeQueries` au lieu de `invalidateQueries` pour supprimer proprement la query du cache
- **Redirection intelligente** : Redirection vers la page appropriée selon le statut (à traiter, traités, archivés) et le scope (mine, service, delegated)
- **Conservation du scope** : Après suppression, retour vers la même section (Mes courriers, Courriers Service(s), Courriers Délégués)

#### Bug de la permission "Consulter sans marquer comme lu"
- **Correction de la portée** : La variable `canSilentView` est maintenant définie au début du composant pour être accessible dans les callbacks
- **Closure fix** : Résolution du problème où `hasPermission` n'était pas accessible dans le callback `onLoadSuccess` du PDF

---

## [3.9.5] - 2024-12-14

### Amélioré

#### Interface du tableau de bord
- **Section Import collapsible** : La section "Import" peut maintenant être repliée/dépliée comme les autres sections
- **Carte Import pleine largeur** : La carte "Courriers entrants" prend désormais toute la largeur pour un affichage plus harmonieux
- **Hauteur uniforme des cartes** : Correction de la hauteur de la carte "Temps moyen" pour qu'elle soit alignée avec les autres cartes

---

## [3.9.4] - 2024-12-14

### Ajouté

#### Permission "Consulter sans marquer comme lu"
- **Nouvelle permission** : `silent_view` - Permet de consulter les courriers sans être enregistré dans l'historique des lectures
- **Cas d'usage** : Permet aux administrateurs de vérifier les courriers sans apparaître dans l'historique
- **Disponible dans la gestion des groupes** : Peut être attribuée à n'importe quel groupe

---

## [3.9.3] - 2024-12-14

### Ajouté

#### Suppression de courriers (Admin uniquement)
- **Bouton de suppression** : Les administrateurs peuvent supprimer définitivement un courrier depuis la page de détails
- **Confirmation requise** : Une boîte de dialogue de confirmation empêche les suppressions accidentelles
- **Nettoyage complet** : Supprime le fichier PDF principal et tous les fichiers de réponse associés
- **Disponible pour tous les statuts** : Fonctionne pour les courriers à traiter, traités et archivés
- **Restriction stricte** : Seuls les utilisateurs du groupe "Administrateur" peuvent effectuer cette action

---

## [3.9.2] - 2024-12-14

### Ajouté

#### Suivi des lectures multi-utilisateurs
- **Marquage automatique** : Le courrier est marqué comme lu automatiquement lors de l'aperçu du PDF
- **Historique des lectures** : Chaque utilisateur qui consulte le courrier est enregistré (une seule fois par utilisateur)
- **Affichage dans la timeline** : Toutes les lectures sont affichées dans l'historique avec le nom de l'utilisateur et la date/heure
- **Multi-destinataires** : Fonctionne pour le destinataire principal, les destinataires en copie et les délégués

---

## [3.9.1] - 2024-12-14

### Amélioré

#### Historique enrichi des courriers
- **Attribution au service** : Affichage du service attribué dans la timeline (icône ambre)
- **Destinataire principal** : Affichage du destinataire avec nom complet et email (icône violet)
- **Destinataires en copie** : Liste complète des destinataires en copie avec le nombre entre parenthèses (icône cyan)
- **Timeline améliorée** : Ordre logique des événements (création → service → destinataire → copies → lecture → traitement → réponses → archivage)

---

## [3.9.0] - 2024-12-14

### Ajouté

#### Nouvelle section "Courriers Délégués"
- **Sidebar** : Nouvelle section "Courriers Délégués" avec sous-menus (À traiter, Traités, Archivés)
- **Dashboard** : Nouvelle section de cartes statistiques pour les courriers délégués
- **Badges violets** : Les compteurs de courriers délégués utilisent des badges violets pour les distinguer
- **Visibilité conditionnelle** : La section n'apparaît que si l'utilisateur a des délégations actives reçues
- **Scope `delegated`** : Nouveau scope pour filtrer uniquement les courriers délégués dans les listes et statistiques

#### Personnalisation du ChatBot
- **Variables de personnalisation** : Support des variables `{{firstName}}`, `{{lastName}}`, `{{fullName}}`, `{{email}}`, `{{username}}` dans les messages du chatbot
- **Indicateurs visuels** : Ajout d'un encadré d'aide dans l'administration pour montrer les variables disponibles

#### Route publique ChatBot
- **`GET /api/settings/public/chatbot`** : Nouvelle route accessible à tous les utilisateurs authentifiés (sans permission admin requise)

### Modifié

#### Séparation des statistiques
- **"Mes courriers"** : Compte maintenant uniquement les courriers où l'utilisateur est destinataire direct
- **"Courriers Délégués"** : Compte séparément les courriers des utilisateurs ayant délégué leurs courriers
- **Exclusion intelligente** : Les courriers où l'utilisateur est en copie mais le destinataire principal est un délégant sont comptés dans "Courriers Délégués", pas dans "Mes courriers"

#### Titres de pages dynamiques
- **MailsPendingPage** : Affiche "Courriers Délégués à traiter" quand `scope=delegated`
- **MailsProcessedPage** : Affiche "Courriers Délégués traités" quand `scope=delegated`
- **MailsArchivedPage** : Affiche "Courriers Délégués archivés" quand `scope=delegated`

#### Page Statistiques
- **Nouveau filtre de périmètre** : Ajout de l'option "Courriers délégués" dans le sélecteur de scope

### Corrigé

#### Bug de comparaison d'ID (Superviseur)
- **MainLayout.jsx** : Correction de la comparaison d'ObjectId avec String pour détecter si l'utilisateur est superviseur
- **DashboardPage.jsx** : Même correction
- **StatisticsPage.jsx** : Même correction

#### Bug de chargement des services avec superviseur
- **auth.routes.js** : Ajout du champ `supervisor` dans le populate des services lors du login et `/me`
- **user.routes.js** : Ajout du champ `supervisor` dans tous les populate de services

#### Bug de validation des dates de délégation
- **delegation.routes.js** : Remplacement de `isISO8601()` par un validateur custom acceptant le format `YYYY-MM-DD`

#### Bug d'accès aux courriers délégués
- **mail.routes.js (GET /:id)** : Ajout de la vérification de délégation pour permettre l'accès aux détails d'un courrier délégué

#### Bug des compteurs dans le dashboard
- **DashboardPage.jsx** : Suppression des fallbacks obsolètes, utilisation directe de `stats?.my`

#### Bug des requêtes MongoDB pour les délégations
- **stats.routes.js** : Restructuration des requêtes avec `$and` pour combiner correctement les conditions
- **mail.routes.js** : Même correction pour le scope `delegated`

---

## [3.8.0] - 2024-12-13

### Ajouté

#### Système de délégation de courriers
- **Modèle Delegation** : Nouveau modèle pour gérer les délégations temporaires
- **Routes de délégation** : CRUD complet des délégations
- **Méthode `getDelegatorsForUser()`** : Récupération des utilisateurs ayant délégué leurs courriers
- **Onglet Délégations** : Nouvelle section dans le profil utilisateur
- **Gestion des dates** : Dates de début et de fin de délégation
- **Révocation instantanée** : Possibilité de révoquer une délégation à tout moment

#### Notifications superviseur
- **Email automatique** : Notification au superviseur du service à l'arrivée d'un nouveau courrier
- **Template email dédié** : Nouveau template `supervisor_notification`

#### Accès superviseur automatique
- **Détection superviseur** : Les superviseurs de service voient automatiquement les courriers du service
- **Sans permission explicite** : Pas besoin de la permission `view_service_mails`

### Modifié

#### Modèle Service
- Ajout du champ `supervisor` (référence vers User)

#### Séparation Mes Courriers / Service
- **Scope `mine`** : Courriers où l'utilisateur est destinataire
- **Scope `service`** : Courriers du service (hors destinataire direct)
- **Badges différenciés** : Orange pour les courriers service

---

## [3.7.0] - 2024-12

### Ajouté

#### Widget ChatBot n8n
- **Composant ChatBotButton** : Widget flottant intégré
- **Configuration complète** : URL webhook, authentification, branding
- **9 couleurs personnalisables** : Palette complète pour le widget
- **3 formes de bouton** : Cercle, arrondi, carré
- **Aperçu en temps réel** : Prévisualisation des modifications
- **Options de comportement** : Mode agrandi, fermeture au clic extérieur

#### Page de configuration ChatBot
- Section dédiée dans les paramètres d'administration
- Toggles de visibilité pour chaque élément du widget

---

## [3.6.0] - 2024-11

### Ajouté

#### Intégration OneDrive
- **OAuth 2.0** : Authentification sécurisée Microsoft
- **Navigateur de dossiers** : Interface pour parcourir OneDrive
- **Synchronisation automatique** : Upload des courriers archivés
- **Structure personnalisable** : Par service/année/mois

#### Page OneDriveCallback
- Gestion du callback OAuth

### Modifié

#### Service de stockage externe
- Ajout du support OneDrive via Microsoft Graph API

---

## [3.5.0] - 2024-10

### Ajouté

#### Stockage Amazon S3 et compatibles
- **Support multi-provider** : S3, MinIO, Wasabi, DigitalOcean Spaces
- **Configuration flexible** : Endpoint, région, bucket
- **Synchronisation automatique** : Upload vers le cloud
- **Mode stockage externe uniquement** : Suppression locale après sync

#### Stockage NextCloud/ownCloud
- **Protocole WebDAV** : Connexion standard
- **Création automatique de dossiers**
- **Structure personnalisable**

---

## [3.4.0] - 2024-09

### Ajouté

#### Système de Webhooks
- **CRUD complet** : Création, modification, suppression
- **Événements déclencheurs** : Nouveau courrier, traitement, archivage
- **Authentification** : HMAC-SHA256, Basic Auth
- **Statistiques** : Compteurs d'appels, succès, échecs
- **Test d'envoi** : Avec aperçu de la réponse

---

## [3.3.0] - 2024-08

### Ajouté

#### OCR avancé
- **15 langues supportées** : Dont multilingues
- **Seuil de confiance** : Configurable
- **Support PDF scannés** : Conversion automatique en images
- **Test OCR intégré** : Dans l'administration
- **Options avancées** : Deskew, nettoyage, préservation layout

#### Page de configuration OCR
- Interface dédiée dans l'administration
- Activation/désactivation globale

---

## [3.2.0] - 2024-07

### Ajouté

#### Modèles d'emails personnalisables
- **Éditeur HTML** : Avec prévisualisation
- **Variables dynamiques** : `{{userName}}`, `{{appName}}`, etc.
- **Templates par type** : Bienvenue, réinitialisation, assignation, rappel

#### Page EmailTemplatesPage
- CRUD des templates email

### Modifié

#### Service email
- Support des templates personnalisés
- Fallback vers templates par défaut

---

## [3.1.0] - 2024-06

### Ajouté

#### Import IMAP automatique
- **Récupération automatique** : Des emails avec pièces jointes PDF
- **Filtrage avancé** : Par domaine, adresse, mots-clés
- **Détection des doublons** : Évite les imports multiples
- **Déplacement automatique** : Vers dossier traité

#### Configuration IMAP
- Interface dans les paramètres
- Test de connexion
- Sélection des dossiers

---

## [3.0.0] - 2024-05

### Ajouté

#### Page Statistiques avancées
- **Design moderne** : Header dégradé, cartes animées
- **Filtres dynamiques** : Périmètre, période, service, utilisateur
- **6 graphiques interactifs** : Chart.js
- **Section performances personnelles**
- **Export PDF** : Rapport professionnel

#### API statistiques détaillées
- `GET /api/stats/detailed` avec filtres
- `GET /api/stats/my-performance`

---

## [2.5.0] - 2024-04

### Ajouté

#### Historique des courriers
- **Timeline visuelle** : Avec icônes par événement
- **Suivi complet** : Création, lecture, traitement, réponses, archivage
- **Export PDF historique** : Avec timeline et PDFs fusionnés

#### Fusion de documents PDF
- Intégration pdf-lib pour fusionner les documents

---

## [2.4.0] - 2024-03

### Ajouté

#### Système de réponses
- **Ajout de réponses** : Avec pièces jointes
- **Types de réponse** : Courrier, Email, Téléphone
- **Aperçu inline** : Des pièces jointes
- **Plein écran** : Visualisation des documents

---

## [2.3.0] - 2024-02

### Ajouté

#### Export avancé
- **Export courrier seul** : PDF du document
- **Export historique** : Avec timeline
- **Export complet** : Archive ZIP avec tous les fichiers

#### Génération PDF
- Service pdf.service.js avec PDFKit

---

## [2.2.0] - 2024-01

### Ajouté

#### Archivage intelligent
- **Renommage automatique** : Selon format configurable
- **Variables** : `{YEAR}`, `{MONTH}`, `{DAY}`, `{SERVICE}`, `{NUMBER}`
- **Arborescence** : `archives/[Service]/[Année]/[Mois]/`
- **Format mois** : `01 - Janvier`, etc.

---

## [2.1.0] - 2023-12

### Ajouté

#### Personnalisation (Branding)
- **Nom de l'application** : Personnalisable
- **Version affichée** : Dans la sidebar
- **Logo** : Upload personnalisé
- **Footer** : Texte et visibilité

---

## [2.0.0] - 2023-11

### Ajouté

#### Support LDAP
- **Authentification LDAP** : Optionnelle
- **Configuration** : Base DN, filtres
- **Test de connexion**

#### Support Kerberos
- **SSO Kerberos** : Optionnel
- **Configuration realm et KDC**

---

## [1.5.0] - 2023-10

### Ajouté

#### Gestion des Objets prédéfinis
- **CRUD objets** : Sujets de courrier
- **Auto-complétion** : Lors de la saisie

#### Gestion des Expéditeurs
- **CRUD expéditeurs** : Fréquents
- **Auto-complétion** : Lors de la saisie

---

## [1.4.0] - 2023-09

### Ajouté

#### Gestion des Services
- **CRUD services** : Départements
- **Hiérarchie** : Organisation arborescente
- **Assignation utilisateurs** : Multi-services

---

## [1.3.0] - 2023-08

### Ajouté

#### Système de permissions
- **27 permissions** : Granulaires par catégorie
- **Interface visuelle** : Sélection des permissions
- **Groupes avec permissions** : Attribution par groupe

---

## [1.2.0] - 2023-07

### Ajouté

#### Gestion des Groupes
- **CRUD groupes** : Création, modification, suppression
- **Assignation utilisateurs** : À un groupe

#### Gestion des Utilisateurs
- **CRUD utilisateurs** : Complet
- **Activation/Désactivation** : Des comptes

---

## [1.1.0] - 2023-06

### Ajouté

#### Dashboard
- **Statistiques globales** : Vue d'ensemble
- **Courriers par statut** : Compteurs
- **Courriers récents** : Liste rapide
- **Activité utilisateurs** : Résumé

#### Visualisation PDF
- **React-PDF** : Affichage intégré
- **Zoom et navigation** : Contrôles complets

---

## [1.0.0] - 2023-05

### Ajouté

#### Structure initiale du projet
- **Backend** : Node.js + Express + MongoDB
- **Frontend** : React 18 + Vite + TailwindCSS
- **Architecture** : API REST

#### Authentification
- **JWT** : Tokens sécurisés
- **Login/Logout** : Authentification basique
- **Profil utilisateur** : Gestion du compte
- **Récupération mot de passe** : Par email

#### Gestion des courriers - Base
- **Modèle Mail** : Structure de données
- **CRUD courriers** : Création, lecture, modification
- **Statuts** : Pending, Processed, Archived
- **Priorités** : Low, Normal, High, Urgent

#### Interface utilisateur - Base
- **Sidebar** : Navigation principale
- **Pages courriers** : Listes avec filtres
- **Design responsive** : Mobile-first

#### Upload de fichiers
- **Multer** : Gestion des uploads
- **Validation** : Types et tailles de fichiers
- **Structure dossiers** : Organisation uploads/

#### Configuration
- **Variables d'environnement** : .env
- **CORS** : Configuration origines
- **Scripts** : dev, build, seed

---

## Format des versions

- **MAJOR** : Changements incompatibles avec les versions précédentes
- **MINOR** : Nouvelles fonctionnalités rétrocompatibles
- **PATCH** : Corrections de bugs rétrocompatibles

---

## Liens

- [README](README.md) - Documentation principale
- [DEPLOYMENT](DEPLOYMENT.md) - Guide de déploiement
