# Changelog - GED Courrier

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [3.13.0] - 2026-06-23

### Ajouté

- **Pièce jointe PDF dans les notifications email** :
  - Option « Joindre le PDF du courrier » dans les modèles de mail (pour les actions liées aux courriers)
  - Badge « PDF joint » visible dans la liste des templates quand l'option est activée
  - Le PDF du courrier est automatiquement attaché à l'email si le template le demande
  - Supporté sur toutes les notifications : nouveau courrier, superviseur, traitement, archivage

- **Notification email au destinataire lors de l'import** :
  - Le destinataire principal reçoit désormais un email lors de la création ou de l'import d'un courrier
  - Les destinataires en copie sont également notifiés lors de l'import
  - Auparavant, seuls les superviseurs de service étaient notifiés

- **Préférences de notification personnalisables par utilisateur** :
  - Nouvel onglet « Notifications » dans Mon Profil
  - Chaque utilisateur peut personnaliser les notifications qu'il souhaite recevoir :
    - Nouveau courrier (destinataire principal)
    - Nouveau courrier (en copie)
    - Nouveau courrier du service (superviseur)
    - Courrier traité
    - Courrier archivé
    - Rappels d'échéance
    - Courriers en retard
  - Toggle « Personnaliser mes notifications » : désactivé = paramètres globaux, activé = préférences individuelles
  - Indicateurs visuels clairs (badges « Activé/Désactivé par défaut » quand en mode global)

- **Paramètres de notification globaux (Administration)** :
  - Nouvel onglet « Notifications » dans Paramètres d'administration
  - L'administrateur définit les notifications activées par défaut pour tous les utilisateurs
  - Les préférences individuelles des utilisateurs priment sur les paramètres globaux
  - Stocké en base de données (clé `notification_defaults`)

---

## [3.12.0] - 2026-06-23

### Ajouté

- **Fiche contact expéditeur (modal)** :
  - Le nom de l'expéditeur est désormais cliquable sur la page de détails du courrier
  - Ouvre une modal "Fiche contact" affichant les informations du contact :
    - **Email** : lien `mailto:` cliquable pour envoyer un email directement
    - **Téléphone** : lien `tel:` cliquable pour lancer un appel
    - **Adresse** : affichée pour faciliter l'envoi d'un courrier de réponse
  - Affiche le nom et l'organisation du contact en en-tête
  - Les champs non renseignés sont indiqués en grisé ("Non renseigné")
  - Design cohérent avec les autres modales de l'application (Framer Motion, backdrop blur)

---

## [3.11.0] - 2026-06-23

### Ajouté

- **Tableau de bord statistiques personnalisé pour les superviseurs** :
  - Les superviseurs voient désormais les filtres Service et Utilisateur (auparavant réservés aux administrateurs)
  - Le filtre Service n'affiche que les services auxquels le superviseur est rattaché
  - Le filtre Utilisateur n'affiche que les utilisateurs des services du superviseur
  - Sélectionner un service filtre dynamiquement la liste des utilisateurs associés
  - Les statistiques par service s'affichent pour les superviseurs ayant plusieurs services
  - Validation backend : un superviseur ne peut interroger que ses propres services

- **Filtres autocomplete Service et Utilisateur** :
  - Remplacement des listes déroulantes classiques par des champs de recherche autocomplete (react-select)
  - Recherche instantanée par saisie de texte pour filtrer services et utilisateurs
  - Adapté aux grandes structures (100+ utilisateurs, 30+ services)
  - Option de vidage rapide (bouton ×) pour réinitialiser un filtre
  - Style cohérent avec le design existant du tableau de bord

- **Multi-superviseurs par service** :
  - Un service peut désormais avoir plusieurs superviseurs (tableau `supervisors` au lieu de `supervisor` unique)
  - Mise à jour de la détection superviseur côté frontend et backend

- **Statistiques courrier départ** :
  - Compteurs brouillons/envoyés/archivés dans les statistiques générales
  - Prise en compte des permissions courrier sortant (view_all_outgoing, view_service_outgoing)

- **Courrier Départ (Gestion du courrier sortant)** :
  - Nouveau module complet pour gérer le courrier sortant indépendamment du courrier entrant
  - Modèle OutgoingMail avec cycle de vie : Brouillon -> Envoyé -> Archivé
  - Référence auto-générée format `CRD-YYYYMMDD-RANDOM`
  - Support de différentes méthodes d'envoi : courrier postal, email, fax, remise en main propre
  - Lien optionnel vers un courrier entrant existant
  - Numéro de suivi postal optionnel
  - OCR automatique du PDF joint pour recherche plein texte
  - Archivage avec déplacement dans une arborescence organisée par service/année/mois
  - 9 nouvelles permissions dédiées (view_own_outgoing, create_outgoing, send_outgoing, etc.)
  - Interface complète : création, liste par statut (brouillons/envoyés/archivés), détail avec visionneuse PDF
  - Section dédiée dans la sidebar avec badges de comptage

- **IMAP Email-to-PDF (Conversion automatique des emails en PDF)** :
  - Nouveau service IMAP indépendant avec sa propre configuration (serveur, port, credentials, filtres)
  - Conversion automatique du corps des emails sans pièce jointe PDF en document PDF
  - Import des pièces jointes PDF existantes (même comportement que l'IMAP actuel)
  - Toggle configurable : générer le PDF du corps systématiquement ou seulement quand il n'y a pas de PJ
  - Les PDF générés incluent les métadonnées (De, À, Cc, Objet, Date) et le corps du mail
  - Filtres configurables : domaines, emails, mots-clés sujet/corps
  - Post-traitement : marquer comme lu, déplacer vers un dossier, ou supprimer
  - Nouvel onglet "IMAP Email-PDF" dans les paramètres d'administration

- **Renommage Expéditeurs -> Contacts** :
  - Le modèle Sender est renommé en Contact pour un usage bidirectionnel (expéditeur pour le courrier entrant, destinataire pour le sortant)
  - Migration automatique de la collection MongoDB `senders` -> `contacts` au démarrage
  - Migration automatique des permissions `view_senders` -> `view_contacts`, etc.
  - Routes API `/api/contacts` (avec alias `/api/senders` pour compatibilité)
  - Interface renommée : page "Contacts" au lieu de "Expéditeurs"

- **Correspondances LDAP (attribution automatique rôle/services par groupe AD)** :
  - Nouvelle page d'administration pour définir des correspondances entre groupes AD/LDAP et la configuration GED
  - Attribution automatique d'un rôle GED (Administrateur, Archiviste, Superviseur, Utilisateur) en fonction du groupe AD
  - Attribution automatique des services accessibles par correspondance
  - Attribution automatique du statut superviseur de services par correspondance
  - Système de priorité pour résoudre les conflits entre plusieurs correspondances
  - Activation/désactivation individuelle de chaque correspondance
  - Nom optionnel et description pour identifier facilement chaque règle
  - Interface CRUD complète avec table récapitulative et modal de création/édition

### Corrigé

- **Correspondances LDAP — services et rôles non affichés** : le formulaire de création/édition affichait "Aucun service disponible" et le sélecteur de rôle restait vide tant que la page n'était pas rafraîchie manuellement — la page n'attendait pas la fin du chargement des services et des groupes avant de s'afficher (ajout de `isLoadingGroups` et `isLoadingServices` dans la condition de chargement)

---

## [3.10.0] - 2026-06-22

### Ajouté

- **Login unifié (LDAP + Local)** :
  - Suppression du sélecteur "Local / LDAP" sur la page de connexion
  - Le backend tente automatiquement l'authentification LDAP en premier (si activé), puis Kerberos, puis locale en fallback
  - L'utilisateur n'a plus besoin de savoir quel mode d'authentification utiliser : un seul formulaire pour tous

- **Groupe AD requis configurable depuis l'interface** :
  - Nouveau champ "Groupe AD requis (DN)" dans Paramètres > LDAP
  - Seuls les utilisateurs membres de ce groupe AD peuvent se connecter via LDAP
  - Si laissé vide, tous les utilisateurs LDAP authentifiés sont autorisés
  - Le DN peut être copié directement depuis la liste "Lister les groupes AD"
  - La restriction est vérifiée à chaque connexion ET en continu via la synchronisation périodique

- **Synchronisation des settings LDAP depuis la base de données** :
  - Les paramètres LDAP configurés dans l'interface (Paramètres > LDAP) sont désormais chargés au démarrage du serveur et synchronisés vers `process.env` à chaque sauvegarde
  - Plus besoin de redémarrer le conteneur Docker après modification des paramètres LDAP dans l'interface

### Corrigé

- **Mot de passe LDAP masqué envoyé au test** : les routes de test connexion LDAP et de listing des groupes AD envoyaient le masque `********` au lieu du vrai mot de passe stocké en base — le test échouait systématiquement après un rechargement de page
- **Objets DN ldapjs non convertis en string** : sur Synology AD (Samba 4), `ldapjs` retourne des objets DN au lieu de simples strings pour `entry.objectName`, `entry.dn` et les valeurs d'attributs — causait des crashs React ("Objects are not valid as a React child") lors de l'affichage des groupes, et une erreur `stringToWrite must be a string` lors du bind utilisateur
- **Conversion des valeurs `memberOf`** : les DN des groupes dans l'attribut `memberOf` sont maintenant convertis en string, assurant le bon fonctionnement de la restriction par groupe AD sur Synology

### Technique

- Ajout de `docker/setup-buildx-action@v3` dans le workflow GitHub Actions et mise à jour de `build-push-action` v5 → v6 avec cache GHA pour corriger l'erreur "unknown blob" lors du push
- Les logs de test LDAP incluent désormais le message d'erreur détaillé du serveur (`lde_message`) au lieu du message générique "Échec de l'authentification"

---

## [3.9.18] - 2026-06-17

### Ajouté

- **Rotation du PDF dans l'aperçu des courriers entrants** :
  - Boutons "Pivoter à gauche" et "Pivoter à droite" (−90° / +90°) dans la barre d'outils de l'aperçu
  - La rotation est visible immédiatement dans l'aperçu grâce à la prop `rotate` de react-pdf
  - Si une rotation est appliquée, elle est enregistrée **définitivement dans le fichier PDF** lors de l'import (via `pdf-lib` côté backend, avant le déplacement du fichier)

- **Recadrage manuel du PDF dans l'aperçu des courriers entrants** :
  - Bouton "Ciseaux" pour activer le mode recadrage : le curseur passe en croix et l'utilisateur trace un rectangle sur l'aperçu (pointillés bleus pendant le tracé, pointillés verts une fois confirmé)
  - Le recadrage est appliqué **définitivement dans le fichier PDF** lors de l'import (via `page.setCropBox()` de pdf-lib)

- **Recadrage automatique du PDF** :
  - Bouton "Sparkle" pour détecter automatiquement les bords du contenu en analysant les pixels du canvas rendu
  - Supprime les marges blanches et bords noirs des scans (seuil configurable à 240/255, padding de 10 px)
  - Le cropRect automatique est visualisé de la même façon que le recadrage manuel et appliqué à l'import

### Technique

- Coordonnées de recadrage envoyées en fractions normalisées (0–1) depuis le frontend, converties en unités PDF côté backend avec formules de transformation pour chacun des 4 angles de rotation (0°, 90°, 180°, 270°)
- Les états `rotation`, `cropMode`, `cropRect` et `cropDrag` sont réinitialisés automatiquement à chaque changement de fichier et après chaque import réussi
- `pdf-lib` déjà installé en backend (v1.17.1) — aucune nouvelle dépendance ajoutée

---

## [3.9.17] - 2026-05-31

### Sécurité

- **Algorithme JWT explicite** : tous les appels à `jwt.verify()` spécifient désormais `{ algorithms: ['HS256'] }` dans `auth.middleware.js` (middleware `authenticate` et `optionalAuth`) — protège contre les attaques par confusion d'algorithme (CVE pattern : `alg: none` ou substitution RS256/HS256)

- **Validation des magic bytes sur les uploads** : nouveau middleware exporté `validateMagicBytes(types)` dans `upload.middleware.js` — après que multer a sauvegardé le fichier sur disque, les premiers octets sont lus et comparés aux signatures binaires connues (`%PDF`, `FF D8 FF`, `89 50 4E 47`, `GIF8`, `WEBP`) ; tout fichier dont la signature ne correspond pas est supprimé immédiatement et la requête est rejetée avec 400 — empêche l'upload de fichiers malveillants déguisés en PDF/image via un MIME type falsifié

- **Politique de mot de passe renforcée** : les routes `/api/auth/reset-password` et `/api/auth/change-password` exigent désormais un minimum de 8 caractères avec au moins une majuscule, une minuscule et un chiffre (contre 6 caractères sans contrainte de complexité auparavant)

### Corrigé

- **Fuites mémoire setTimeout (IncomingMailsPage)** : les identifiants des deux `setTimeout` imbriqués déclenchés lors du traitement OCR sont maintenant stockés dans un `useRef` (`ocrTimeoutRefs`) et nettoyés via un `useEffect` de cleanup au démontage du composant — empêche les mises à jour d'état sur un composant démonté

- **Dépendances manquantes dans useEffect (IncomingMailsPage)** : `handleSelectFile` wrappé en `useCallback([token])` et ajouté au tableau de dépendances du `useEffect` de présélection — corrige l'avertissement ESLint `react-hooks/exhaustive-deps` et élimine le risque de closure périmée sur le token

### Amélioré

- **Gestion d'erreur Dashboard** : `isError` exposé sur les 4 `useQuery` du `DashboardPage` ; un écran d'erreur explicite (icône + message) s'affiche si la query principale `dashboard-stats` échoue — les utilisateurs ne voient plus une page blanche en cas d'indisponibilité de l'API

- **Accessibilité Pagination** : ajout des attributs `aria-label="Page précédente"`, `aria-label="Page suivante"`, `aria-label="Page N"` et `aria-current="page"` sur tous les boutons de `Pagination.jsx` — conformité WCAG 2.1 niveau AA pour la navigation clavier et les lecteurs d'écran

- **Performance MainLayout** :
  - `refetchInterval` des stats de la sidebar porté de 30 s à 60 s — réduit de moitié les requêtes périodiques inutiles
  - `filteredAdminNav` wrappé en `useMemo([user?.group?.permissions])` — évite le recalcul du filtre de navigation admin à chaque rendu du layout

- **Traçabilité erreur branding** : `brandingStore` expose un champ `isError: boolean` initialisé à `false`, passé à `true` si l'appel à l'API de branding échoue — les composants consommateurs peuvent désormais détecter et réagir à un échec de chargement de la configuration visuelle

---

## [3.9.16] - 2026-05-31

### Amélioré

- **Build frontend — optimisations production** :
  - **Source maps désactivées** : `sourcemap: false` dans la config Vite — élimine les fichiers `.map` du bundle prod, réduit la taille déployée et n'expose plus le code source
  - **Code splitting vendors** : découpage en 7 chunks indépendants (`vendor-react`, `vendor-ui`, `vendor-query`, `vendor-charts`, `vendor-pdf`, `vendor-forms`, `vendor-misc`) — le navigateur met chaque chunk en cache séparément ; une mise à jour applicative ne nécessite le re-téléchargement que du chunk `index`, les vendors restent en cache

---

## [3.9.15] - 2026-05-31

### Sécurité / Amélioré

- **Token refresh avec file d'attente de requêtes** :
  - **Backend** : nouveau endpoint `POST /api/auth/refresh` qui échange un refresh token valide contre un nouveau couple access token / refresh token
  - **Backend** : introduction des refresh tokens longue durée (défaut `7d`, variable `JWT_REFRESH_EXPIRE`) distincts des access tokens de courte durée (défaut désormais `15m`, variable `JWT_EXPIRE`)
  - **Backend** : variable d'environnement `JWT_REFRESH_SECRET` pour signer les refresh tokens indépendamment de `JWT_SECRET`
  - **Frontend** : l'intercepteur axios implémente un mécanisme de file d'attente (`failedQueue`) : lorsqu'un premier 401 déclenche un rafraîchissement, toutes les requêtes simultanées qui reçoivent un 401 sont mises en attente et rejouées automatiquement avec le nouveau token dès que le rafraîchissement aboutit
  - **Frontend** : si le refresh token est absent ou expiré, toutes les requêtes en attente sont rejetées et l'utilisateur est redirigé vers `/login`
  - **Frontend** : le `authStore` persiste le `refreshToken` dans `localStorage` et expose `updateTokens()` pour synchroniser les tokens après rafraîchissement

---

## [3.9.14] - 2026-05-31

### Amélioré

- **Frontend — Lazy loading des routes** :
  - Toutes les pages sont maintenant chargées à la demande via `React.lazy()` + `Suspense`
  - Les layouts (`MainLayout`, `AuthLayout`) restent en import statique (présents sur toutes les pages)
  - Un composant `PageLoader` (spinner centré) s'affiche pendant le chargement du chunk JS
  - Réduit significativement la taille du bundle initial et accélère le premier affichage

- **Frontend — Gestion d'erreur globale sur toutes les queries** :
  - Ajout d'un `QueryCache.onError` dans le `QueryClient` : toutes les `useQuery` sans gestion d'erreur explicite affichent désormais un toast avec le message de l'API ou un message générique
  - Ajout d'un `MutationCache.onError` : couvre les mutations sans `onError` défini ; les mutations avec leur propre `onError` ne sont pas doublées
  - Les erreurs déjà gérées par l'intercepteur axios sont ignorées (401 → redirection login, 5xx → toast "Erreur serveur" existant)

---

## [3.9.13] - 2026-05-31

### Sécurité

- **Path traversal — middleware et routes fichiers** : normalisation et bornage strict de tous les chemins construits à partir d'entrées utilisateur ou de la base de données
  - `serveMailFiles.middleware.js` : correction du regex d'extraction (le middleware est monté sur `/uploads`, donc `req.path` est déjà sans ce préfixe) + ajout de `path.normalize()` pour résoudre les séquences `../` + vérification que le chemin résolu reste strictement sous `UPLOAD_BASE` avant tout accès disque — rejet avec 403 sinon
  - `mail.routes.js` — `GET /api/mails/pending/:id/file` : borne le chemin résolu au sous-répertoire `uploads/pending/` ; rejet avec 403 si `filePath` de la BDD sort de cette zone
  - `mail.routes.js` — `GET /api/mails/:id/pdf` : borne le chemin résolu à `uploadPath` ; rejet avec 404 si `filePath` de la BDD sort de cette zone

---

## [3.9.12] - 2026-05-31

### Sécurité

- **Injection regex MongoDB** : échappement systématique de tous les inputs utilisateur passés à `$regex` MongoDB
  - Création d'un utilitaire partagé `backend/src/utils/regex.js` exposant `escapeRegex()` — neutralise les caractères spéciaux regex (`. * + ? ^ $ { } ( ) | [ ] \`)
  - Corrigé dans `user.routes.js` : paramètre `search` (routes `/` et `/recipients`)
  - Corrigé dans `service.routes.js` : paramètres `search`, `name`, `code` (liste, création, modification)
  - Corrigé dans `subject.routes.js` : paramètres `search`, `q`, `name` (liste, autocomplétion, création, modification)
  - Corrigé dans `sender.routes.js` : paramètres `search`, `q` (liste, autocomplétion)
  - Corrigé dans `mail.routes.js` : paramètre `search` (liste principale)

---

## [3.9.11] - 2026-05-31

### Sécurité

- **JWT_SECRET** : remplacement du placeholder par une clé cryptographique de 64 octets générée via `crypto.randomBytes(64)`
- **Helmet** : ajout du middleware `helmet` sur le serveur Express — positionne automatiquement les headers HTTP de sécurité (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.)
- **Rate limiting sur les routes sensibles** :
  - `/api/auth/login` : 10 tentatives maximum par IP sur une fenêtre de 15 minutes (protection brute-force)
  - `/api/auth/forgot-password` : 5 requêtes maximum par IP sur une fenêtre de 1 heure (protection spam de reset)
- **Mise à jour des dépendances** :
  - `nodemailer` mis à jour en v8.0.10 : correction de 4 CVE (injection de commandes SMTP via CRLF, DoS addressparser, routage e-mail non intentionnel)
  - `minimatch` mis à jour : correction de 3 CVE ReDoS
  - 32 autres vulnérabilités corrigées via `npm audit fix`

---

## [3.9.10] - 2026-01-03

### Modifié

- **Docker Compose Portainer - Correction du build** :
  - Modification de `docker-compose.portainer.yml` pour utiliser une image pré-buildée (`ged-app:latest`)
  - Correction de l'erreur "BuildKit HTTP2 frame too large" lors du déploiement via Git dans Portainer
  - Le build de l'image doit maintenant être fait manuellement sur le serveur avant le déploiement
  - Mise à jour de la documentation `DEPLOYMENT-PORTAINER.md` avec les nouvelles instructions

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
