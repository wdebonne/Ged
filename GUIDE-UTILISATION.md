# 📖 Guide d'Utilisation - GED Courrier

**Gestion Électronique de Courrier**

Ce guide vous accompagne dans l'utilisation quotidienne de l'application GED Courrier, depuis la connexion jusqu'aux fonctionnalités avancées.

---

## 📑 Table des matières

1. [Premiers pas](#1-premiers-pas)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Gestion des courriers](#3-gestion-des-courriers)
4. [Import de courriers](#4-import-de-courriers)
5. [Traitement des courriers](#5-traitement-des-courriers)
6. [Archivage](#6-archivage)
7. [Délégations](#7-délégations)
8. [Statistiques](#8-statistiques)
9. [Mon Profil](#9-mon-profil)
10. [Administration](#10-administration)
11. [FAQ & Astuces](#11-faq--astuces)

---

## 1. Premiers pas

### 1.1 Connexion à l'application

1. Ouvrez votre navigateur et accédez à l'URL de l'application
2. Sur la page de connexion, saisissez :
   - **Nom d'utilisateur** ou **Email**
   - **Mot de passe**
3. Cliquez sur **Se connecter**

> 💡 **Astuce** : Si votre organisation utilise LDAP ou Kerberos, des boutons de connexion supplémentaires peuvent apparaître.

### 1.2 Mot de passe oublié

1. Cliquez sur **Mot de passe oublié ?** sur la page de connexion
2. Saisissez votre adresse email
3. Consultez votre boîte mail et suivez le lien de réinitialisation
4. Créez un nouveau mot de passe

### 1.3 Navigation dans l'application

L'interface est composée de :

- **Barre latérale (Sidebar)** : Navigation principale avec les sections
  - 📥 **Import** : Import de nouveaux courriers
  - 📬 **Mes Courriers** : Vos courriers personnels
  - 🟣 **Courriers Délégués** : Courriers reçus par délégation (si applicable)
  - 🟠 **Courriers Service(s)** : Courriers de votre service
  - ⚙️ **Administration** : Paramètres (si vous êtes admin)

- **Zone principale** : Contenu de la page sélectionnée
- **Barre supérieure** : Menu utilisateur et notifications

---

## 2. Tableau de bord

Le tableau de bord est votre page d'accueil. Il affiche une vue d'ensemble de votre activité.

### 2.1 Sections du tableau de bord

| Section | Description |
|---------|-------------|
| **Mes Courriers** | Statistiques de vos courriers personnels (à traiter, traités, archivés) |
| **Courriers Délégués** | Courriers de collègues délégués (visible si délégations actives) |
| **Courriers Service(s)** | Vue d'ensemble des courriers de votre service |
| **Statistiques globales** | Chiffres clés de l'ensemble des courriers |
| **Courriers urgents** | Liste des courriers prioritaires à traiter |
| **Derniers courriers** | Activité récente |

### 2.2 Interactivité

- **Cartes cliquables** : Cliquez sur une carte statistique pour accéder directement aux courriers correspondants
- **Sections repliables** : Cliquez sur l'en-tête d'une section pour la réduire/agrandir
- **Badges animés** : Les cartes avec des éléments à traiter sont animées pour attirer votre attention

---

## 3. Gestion des courriers

### 3.1 Types de courriers

L'application distingue trois périmètres :

| Périmètre | Icône | Description |
|-----------|-------|-------------|
| **Mes Courriers** | 🔵 | Courriers où vous êtes destinataire principal |
| **Courriers Délégués** | 🟣 | Courriers d'un collègue qui vous a délégué ses courriers |
| **Courriers Service(s)** | 🟠 | Courriers du service (visible pour superviseurs ou avec permission) |

### 3.2 Statuts des courriers

| Statut | Description |
|--------|-------------|
| **📥 En attente** | Courrier importé, en attente de validation |
| **📋 À traiter** | Courrier validé, assigné, en attente de traitement |
| **✅ Traité** | Courrier traité, peut contenir des réponses |
| **📁 Archivé** | Courrier archivé définitivement |

### 3.3 Liste des courriers

Sur chaque page de liste, vous disposez de :

#### Filtres de recherche
- **Recherche textuelle** : Par référence, objet, expéditeur
- **Filtre par priorité** : Normale, Urgente, Très urgente
- **Filtre par date** : Période de réception
- **Filtre par service** : Service assigné
- **Filtre par destinataire** : Destinataire principal

#### Actions disponibles
- 👁️ **Voir** : Consulter le détail du courrier
- ✏️ **Modifier** : Éditer les informations (si autorisé)
- 📥 **Télécharger** : Télécharger le fichier PDF
- 🗑️ **Supprimer** : Supprimer le courrier (admin uniquement)

### 3.4 Détail d'un courrier

La page de détail affiche :

- **Informations générales** : Référence, date, expéditeur, objet
- **Destinataires** : Principal et en copie
- **Visualiseur PDF** : Aperçu du document avec zoom et navigation
- **Historique/Timeline** : Toutes les actions effectuées sur le courrier
- **Réponses** : Liste des réponses avec pièces jointes

---

## 4. Import de courriers

### 4.1 Import manuel

1. Accédez à **Import** > **Courriers entrants**
2. Cliquez sur **+ Nouveau courrier**
3. Remplissez le formulaire :
   - **Fichier PDF** : Glissez-déposez ou sélectionnez le fichier
   - **Expéditeur** : Saisissez ou sélectionnez (auto-complétion)
   - **Objet** : Sujet du courrier
   - **Date de réception** : Date du courrier
   - **Priorité** : Normale / Urgente / Très urgente
4. Cliquez sur **Enregistrer**

> 💡 Le courrier est d'abord placé dans la file **En attente** pour validation.

### 4.2 Import par IMAP (automatique)

Si configuré par l'administrateur :

1. Les emails arrivent automatiquement dans la file **En attente**
2. Les pièces jointes PDF sont extraites
3. L'OCR peut être appliqué automatiquement (si activé)

#### Bouton "Vérifier Courrier"
- Disponible sur la page **Courriers entrants**
- Déclenche une vérification immédiate de la boîte mail
- Affiche le statut OCR en temps réel

### 4.3 Validation des courriers en attente

1. Accédez à **Courriers entrants**
2. Sélectionnez un courrier en attente
3. Vérifiez/complétez les informations :
   - Expéditeur
   - Objet
   - Service destinataire
   - Destinataire principal
   - Destinataires en copie
4. Cliquez sur **Valider** pour passer en "À traiter"
5. Ou **Rejeter** pour supprimer

---

## 5. Traitement des courriers

### 5.1 Consulter un courrier

1. Cliquez sur un courrier dans la liste
2. Le PDF s'affiche dans le visualiseur intégré
3. Utilisez les contrôles :
   - **+/-** : Zoom avant/arrière
   - **◀ ▶** : Navigation entre les pages
   - **⤢** : Plein écran

> 📌 La consultation est enregistrée dans l'historique (sauf permission "consultation silencieuse").

### 5.2 Marquer comme traité

1. Ouvrez le détail du courrier
2. Cliquez sur **Marquer comme traité**
3. Optionnel : Ajoutez un commentaire ou une réponse

### 5.3 Ajouter une réponse

1. Dans le détail du courrier, section **Réponses**
2. Cliquez sur **+ Ajouter une réponse**
3. Remplissez le formulaire :
   - **Type de réponse** : Courrier / Email / Téléphone
   - **Date** : Date de la réponse
   - **Commentaire** : Description de la réponse
   - **Fichier** : Pièce jointe (optionnel)
4. Cliquez sur **Enregistrer**

### 5.4 Export du courrier

Plusieurs options d'export sont disponibles :

| Option | Contenu |
|--------|---------|
| **Courrier seul** | PDF original uniquement |
| **Avec historique** | PDF + timeline des actions + réponses fusionnées |
| **Export complet (ZIP)** | Tous les fichiers (courrier + réponses) en archive |

---

## 6. Archivage

### 6.1 Archiver un courrier

1. Le courrier doit être en statut **Traité**
2. Cliquez sur **Archiver**
3. Confirmez l'archivage

### 6.2 Système d'archivage

L'archivage automatique :

- **Renomme** le fichier selon le format configuré (ex: `2025-001-Informatique.pdf`)
- **Organise** dans l'arborescence : `archives/[Service]/[Année]/[Mois]/`
- **Synchronise** vers le stockage externe (si configuré : OneDrive, S3, NextCloud)

### 6.3 Consulter les archives

1. Accédez à **Mes Courriers** > **Archivés** (ou Service > Archivés)
2. Utilisez les filtres pour rechercher
3. Cliquez sur un courrier pour voir le détail complet

### 6.4 Réouverture d'un courrier archivé

*(Nécessite la permission administrateur)*

1. Ouvrez le courrier archivé
2. Cliquez sur **Réouvrir**
3. Le courrier repasse en statut **À traiter**

---

## 7. Délégations

La délégation permet de transférer temporairement ses courriers à un collègue (absence, congés...).

### 7.1 Créer une délégation

1. Accédez à **Mon Profil** > **Délégations**
2. Cliquez sur **+ Nouvelle délégation**
3. Sélectionnez :
   - **Délégataire** : Le collègue qui recevra vos courriers
   - **Date de début** : Quand la délégation commence
   - **Date de fin** : Quand la délégation se termine
4. Cliquez sur **Créer**

### 7.2 Gérer ses délégations

- **Consulter** : Voir toutes vos délégations actives et passées
- **Révoquer** : Annuler une délégation avant la date de fin
- **Prolonger** : Modifier la date de fin

### 7.3 Recevoir des délégations

Si un collègue vous délègue ses courriers :

1. La section **Courriers Délégués** apparaît dans la sidebar (badge violet)
2. Vous avez accès complet aux courriers du délégant :
   - Consultation
   - Traitement
   - Archivage
3. Les actions sont tracées dans l'historique

---

## 8. Statistiques

### 8.1 Accès aux statistiques

1. Cliquez sur **Statistiques** dans le menu principal
2. La page affiche des graphiques et indicateurs

### 8.2 Filtres disponibles

| Filtre | Options |
|--------|---------|
| **Périmètre** | Mes courriers / Mon service / Tous |
| **Période** | Date de début et de fin |
| **Service** | Filtrer par service (admin) |
| **Utilisateur** | Filtrer par utilisateur (admin) |

### 8.3 Indicateurs affichés

- **Total des courriers** : Nombre global
- **Répartition par statut** : À traiter, traités, archivés
- **Temps de traitement** : Moyen, minimum, maximum
- **Évolution mensuelle** : Graphique d'évolution
- **Performance par utilisateur** : Classement
- **Top 10 expéditeurs** : Expéditeurs les plus fréquents

### 8.4 Export des statistiques

1. Cliquez sur l'icône **⚙️** à côté du bouton d'export
2. Sélectionnez les sections à inclure
3. Cliquez sur **Exporter en PDF**
4. Un document PDF professionnel est généré avec tous les graphiques

---

## 9. Mon Profil

### 9.1 Accès au profil

Cliquez sur votre avatar en haut à droite > **Mon Profil**

### 9.2 Informations personnelles

Vous pouvez modifier :

- **Avatar** : Uploadez une photo de profil
- **Nom / Prénom**
- **Email**
- **Mot de passe**

### 9.3 Onglet Délégations

Gérez vos délégations de courriers (voir section 7).

### 9.4 Préférences

- **Notifications email** : Activer/désactiver les notifications
- **Langue de l'interface** : Si disponible

---

## 10. Administration

*(Section visible uniquement pour les administrateurs)*

### 10.1 Utilisateurs

**Chemin : Administration > Utilisateurs**

| Action | Description |
|--------|-------------|
| **Créer** | Ajouter un nouvel utilisateur |
| **Modifier** | Changer les informations, groupes, services |
| **Activer/Désactiver** | Bloquer ou réactiver un compte |
| **Réinitialiser MDP** | Envoyer un lien de réinitialisation |

### 10.2 Groupes et Permissions

**Chemin : Administration > Groupes**

Les permissions sont organisées en catégories :

| Catégorie | Exemples de permissions |
|-----------|------------------------|
| **Courriers** | Voir, créer, modifier, supprimer |
| **Import** | Importer, valider |
| **Archive** | Archiver, désarchiver |
| **Administration** | Gérer utilisateurs, paramètres |

### 10.3 Services

**Chemin : Administration > Services**

- **Créer** des services/départements
- **Assigner** un superviseur
- **Hiérarchie** : Services parents/enfants

> 💡 Le superviseur d'un service voit automatiquement tous les courriers du service.

### 10.4 Expéditeurs prédéfinis

**Chemin : Administration > Expéditeurs**

Créez une liste d'expéditeurs fréquents pour l'auto-complétion.

### 10.5 Objets prédéfinis

**Chemin : Administration > Objets**

Créez des objets de courrier prédéfinis.

### 10.6 Modèles d'emails

**Chemin : Administration > Modèles d'emails**

Personnalisez les emails automatiques avec :

- Éditeur HTML intégré
- Variables dynamiques : `{{userName}}`, `{{mailSubject}}`, `{{appName}}`...
- Prévisualisation en temps réel

### 10.7 Paramètres système

**Chemin : Administration > Paramètres**

#### Général
- Timeout de session
- Taille maximale des fichiers
- Extensions autorisées

#### Apparence
- Nom et logo de l'application
- Texte du footer

#### OCR
- Activation de la reconnaissance de texte
- Langue de l'OCR
- Seuil de confiance

#### ChatBot
- Activation du widget n8n
- Configuration du webhook
- Personnalisation visuelle

#### SMTP / LDAP / IMAP
- Configuration des services externes

#### Stockage externe
- OneDrive, S3, NextCloud
- Synchronisation automatique

---

## 11. FAQ & Astuces

### Questions fréquentes

<details>
<summary><strong>❓ Je ne vois pas les courriers de mon service</strong></summary>

Vérifiez que :
1. Vous êtes bien assigné au service
2. Vous êtes superviseur du service OU avez la permission `view_service_mails`
</details>

<details>
<summary><strong>❓ Un courrier n'apparaît pas dans mes courriers</strong></summary>

Le courrier peut être :
- Dans une autre section (Service ou Délégué)
- En statut "En attente" (pas encore validé)
- Assigné à un autre destinataire
</details>

<details>
<summary><strong>❓ L'OCR ne fonctionne pas</strong></summary>

Vérifiez avec l'administrateur que :
1. L'OCR est activé dans les paramètres
2. La langue du document correspond à la langue configurée
3. Le document n'est pas trop volumineux
</details>

<details>
<summary><strong>❓ Je ne peux pas archiver un courrier</strong></summary>

Le courrier doit d'abord être **traité** avant de pouvoir être archivé.
</details>

<details>
<summary><strong>❓ Comment retrouver un courrier archivé ?</strong></summary>

1. Allez dans **Mes Courriers > Archivés** ou **Service > Archivés**
2. Utilisez la recherche par référence, objet ou expéditeur
3. Filtrez par date si nécessaire
</details>

### Raccourcis et astuces

| Action | Astuce |
|--------|--------|
| **Recherche rapide** | Utilisez le champ de recherche global |
| **Navigation clavier** | Utilisez Tab pour naviguer entre les champs |
| **Glisser-déposer** | Déposez directement vos PDF sur la zone d'import |
| **Clic droit** | Sur certains éléments pour accéder aux actions rapides |
| **Double-clic** | Sur un courrier pour l'ouvrir directement |

### Bonnes pratiques

1. ✅ **Traitez régulièrement** vos courriers pour éviter l'accumulation
2. ✅ **Archivez** les courriers traités pour garder une organisation propre
3. ✅ **Utilisez les filtres** pour retrouver rapidement vos courriers
4. ✅ **Déléguez vos courriers** avant une absence prolongée
5. ✅ **Consultez le dashboard** quotidiennement pour voir les urgences
6. ✅ **Ajoutez des commentaires** lors du traitement pour garder une trace

---

## 📞 Support

En cas de problème ou question :

1. Consultez ce guide d'utilisation
2. Contactez votre administrateur système
3. Vérifiez les messages d'erreur affichés

---

*Guide d'utilisation GED Courrier - Version 1.0*
*Dernière mise à jour : Décembre 2025*
