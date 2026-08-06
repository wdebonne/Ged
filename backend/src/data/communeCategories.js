/**
 * Référentiel type des catégories de documents d'une commune, avec leur durée
 * d'utilité administrative (DUA) et leur sort final.
 *
 * Établi d'après :
 *  - instruction DGP/SIAF/2014/006 du 22 septembre 2014 (tri et conservation des
 *    archives des communes et structures intercommunales) ;
 *  - instruction DAF/DPACI/RES/2009/018 du 28 août 2009 (archives des services
 *    communs aux collectivités territoriales) ;
 *  - tableaux de gestion simplifiés publiés par les services d'archives
 *    (CDG10, Archives départementales du Finistère) ;
 *  - Code du travail, Code civil, Code de la commande publique, Code de la
 *    sécurité intérieure pour les durées d'origine légale.
 *
 * ⚠️ Ces durées sont indicatives. La DUA est fixée d'un commun accord avec le
 * service d'archives départementales, et l'élimination d'archives publiques est
 * subordonnée au visa du directeur des Archives départementales
 * (Code du patrimoine, art. L212-2 et R212-14). Le référentiel sert donc à
 * ALERTER, jamais à supprimer sans décision humaine.
 *
 * Sort final :
 *  - C : conservation définitive → aucune durée appliquée, le document ne doit
 *        jamais être proposé à la suppression ;
 *  - E : élimination → la DUA est appliquée, alerte à échéance ;
 *  - T : tri → la DUA est appliquée, mais l'échéance déclenche un examen
 *        (une partie du fonds est conservée), jamais une élimination en bloc.
 */

export const SORT_FINAL = {
  CONSERVATION: 'C',
  ELIMINATION: 'E',
  TRI: 'T'
};

export const COMMUNE_DOMAINS = [
  'Assemblée et actes administratifs',
  'Affaires juridiques et assurances',
  'Patrimoine communal',
  'Finances et comptabilité',
  'Commande publique',
  'Ressources humaines',
  "État civil et attributions d'État",
  'Élections',
  'Police et sécurité',
  'Urbanisme',
  'Voirie, réseaux et environnement',
  'Cimetière',
  'Enfance, scolaire et périscolaire',
  'Action sociale et CCAS',
  'Culture, sport et vie associative',
  'Informatique et données personnelles'
];

// Raccourcis de lecture
const C = SORT_FINAL.CONSERVATION;
const E = SORT_FINAL.ELIMINATION;
const T = SORT_FINAL.TRI;

// Rappels resserrés pour les DUA courtes (les seuils globaux 90/30/7 n'ont pas
// de sens sur une conservation d'un mois ou d'un an).
const SHORT_ALERTS = [30, 7];
const VERY_SHORT_ALERTS = [7, 1];

export const COMMUNE_CATEGORIES = [
  // ---------------------------------------------------------------- Assemblée
  {
    name: 'Délibérations du conseil municipal', code: 'DELIB', sortFinal: C,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    description: 'Délibérations et pièces annexes',
    legalBasis: 'Conservation définitive — CGCT art. L2121-23 ; instruction DGP/SIAF/2014/006 (DUA 1 an, sort final C)'
  },
  {
    name: 'Procès-verbaux de séance', code: 'PVSEANCE', sortFinal: C,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    description: 'Procès-verbaux du conseil municipal et pièces annexes',
    legalBasis: 'Conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Arrêtés du maire (permanents)', code: 'ARRETE', sortFinal: C,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    description: 'Arrêtés à caractère permanent',
    legalBasis: 'Conservation définitive — CGCT art. L2122-29 ; instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Arrêtés temporaires', code: 'ARRETMP', sortFinal: E,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Arrêtés à caractère temporaire',
    legalBasis: 'DUA 5 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Dossiers préparatoires de séance', code: 'PREPSEA', sortFinal: E,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Convocations, projets de contrats et pièces annexes',
    legalBasis: 'DUA 1 an, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Contrôle de légalité', code: 'CTRLEG', sortFinal: E,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Actes et annexes transmis au contrôle de légalité',
    legalBasis: 'DUA 10 ans, élimination (les actes sont conservés dans les dossiers de séance)'
  },
  {
    name: 'Courrier administratif général', code: 'COURADM', sortFinal: T,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    retentionDuration: 6, retentionUnit: 'years',
    description: 'Correspondance administrative courante',
    legalBasis: 'DUA 1 an après la fin du mandat (mandature de 6 ans), tri qualitatif — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Registre du courrier', code: 'REGCOUR', sortFinal: C,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    description: 'Enregistrement chronologique du courrier',
    legalBasis: 'Conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Bulletin municipal et communication', code: 'BULMUN', sortFinal: C,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    description: 'Bulletins municipaux, supports de communication institutionnelle',
    legalBasis: 'Conservation définitive (conserver 3 exemplaires de chaque numéro)'
  },
  {
    name: 'Notes de service', code: 'NOTESERV', sortFinal: T,
    domain: 'Assemblée et actes administratifs', color: '#4F46E5',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Notes internes de fonctionnement',
    legalBasis: 'DUA de validité, tri qualitatif — instruction DGP/SIAF/2014/006'
  },

  // ------------------------------------------------- Juridique et assurances
  {
    name: 'Contentieux', code: 'CONTEN', sortFinal: T,
    domain: 'Affaires juridiques et assurances', color: '#EF4444',
    retentionDuration: 1, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    alertBeforeDays: SHORT_ALERTS,
    description: 'Dossiers de contentieux',
    legalBasis: "DUA 1 an à compter de l'extinction des voies de recours, tri (conserver les dossiers d'intérêt local)"
  },
  {
    name: 'Litiges réglés à l\'amiable', code: 'LITIGE', sortFinal: T,
    domain: 'Affaires juridiques et assurances', color: '#EF4444',
    retentionDuration: 30, retentionUnit: 'years',
    description: 'Litiges clos sans procédure juridictionnelle',
    legalBasis: 'DUA 30 ans (prescription la plus longue en matière civile), tri'
  },
  {
    name: 'Assurances — contrats', code: 'ASSUR', sortFinal: E,
    domain: 'Affaires juridiques et assurances', color: '#EF4444',
    retentionDuration: 5, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Contrats et avenants d\'assurance',
    legalBasis: 'DUA 5 ans à compter de la fin du contrat, élimination (à conserver en cas de sinistre en cours)'
  },
  {
    name: 'Sinistres avec dommages corporels', code: 'SINCORP', sortFinal: T,
    domain: 'Affaires juridiques et assurances', color: '#EF4444',
    retentionDuration: 30, retentionUnit: 'years',
    description: 'Sinistres ayant entraîné des dommages corporels',
    legalBasis: 'DUA 30 ans, tri (ne conserver que les sinistres importants)'
  },
  {
    name: 'Sinistres matériels', code: 'SINISTRE', sortFinal: T,
    domain: 'Affaires juridiques et assurances', color: '#EF4444',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Sinistres sans dommage corporel',
    legalBasis: 'DUA 10 ans, tri (ne conserver que les sinistres importants)'
  },

  // ------------------------------------------------------ Patrimoine communal
  {
    name: 'Actes notariés (cessions, acquisitions)', code: 'ACTENOT', sortFinal: C,
    domain: 'Patrimoine communal', color: '#8B5CF6',
    description: 'Actes de cession et d\'acquisition du patrimoine communal',
    legalBasis: 'DUA 30 ans, conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Dons, donations et legs', code: 'DONLEGS', sortFinal: C,
    domain: 'Patrimoine communal', color: '#8B5CF6',
    description: 'Libéralités consenties à la commune',
    legalBasis: 'DUA 10 ans, conservation définitive'
  },
  {
    name: 'Inventaire du patrimoine', code: 'INVPAT', sortFinal: C,
    domain: 'Patrimoine communal', color: '#8B5CF6',
    description: 'Inventaire des biens mobiliers et immobiliers',
    legalBasis: 'DUA 5 ans, conservation définitive'
  },
  {
    name: 'Locations et mises à disposition', code: 'LOCATION', sortFinal: E,
    domain: 'Patrimoine communal', color: '#8B5CF6',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Baux, conventions d\'occupation, états des lieux',
    legalBasis: 'DUA 10 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Véhicules et gros matériel', code: 'VEHIC', sortFinal: E,
    domain: 'Patrimoine communal', color: '#8B5CF6',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Acquisition, location, cession, mise à la réforme',
    legalBasis: 'DUA 10 ans à compter de la cession ou de la réforme, élimination'
  },

  // ------------------------------------------------------------- Finances
  {
    name: 'Budgets et comptes administratifs', code: 'BUDGET', sortFinal: C,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    description: 'Budget primitif, supplémentaire, décisions modificatives, compte administratif et compte de gestion',
    legalBasis: 'DUA 5 ans, conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Facture', code: 'FACT', sortFinal: E,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Factures fournisseurs et pièces justificatives de dépense',
    legalBasis: 'DUA 10 ans, élimination — pièces justificatives comptables (art. L123-22 Code de commerce à titre de repère)'
  },
  {
    name: 'Pièces comptables (mandats et titres)', code: 'COMPTA', sortFinal: E,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Bordereaux de mandats et de titres, fonctionnement et investissement',
    legalBasis: 'DUA 10 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Emprunts', code: 'EMPRUNT', sortFinal: E,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Contrats d\'emprunt et tableaux d\'amortissement',
    legalBasis: 'DUA 10 ans à compter de la fin du prêt, élimination'
  },
  {
    name: 'Régies de recettes et d\'avances', code: 'REGIE', sortFinal: E,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Carnets à souches, quittances, bordereaux de versement',
    legalBasis: 'DUA 10 ans, élimination (les procès-verbaux de contrôle sont conservés)'
  },
  {
    name: 'Impôts locaux — rôles et matrices', code: 'IMPLOC', sortFinal: E,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Copies de matrices et rôles des impôts directs locaux',
    legalBasis: 'DUA 5 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Subventions aux associations', code: 'SUBV', sortFinal: T,
    domain: 'Finances et comptabilité', color: '#F59E0B',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Demandes, conventions et justificatifs de subvention',
    legalBasis: 'DUA 10 ans, tri'
  },

  // ------------------------------------------------------ Commande publique
  {
    name: 'Marchés publics — travaux', code: 'MPTX', sortFinal: T,
    domain: 'Commande publique', color: '#EC4899',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Dossiers de marchés de travaux',
    legalBasis: "DUA 10 ans à compter de la fin d'exécution, tri (conserver les marchés d'intérêt patrimonial) — référentiel 2021/D/73"
  },
  {
    name: 'Marchés publics — fournitures et services', code: 'MPFS', sortFinal: T,
    domain: 'Commande publique', color: '#EC4899',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Dossiers de marchés de fournitures et de services',
    legalBasis: "DUA 10 ans à compter de la fin d'exécution (réductible à 5 ans si les pièces comptables sont conservées ailleurs), tri"
  },
  {
    name: 'Consultations et candidatures non retenues', code: 'MPCAND', sortFinal: E,
    domain: 'Commande publique', color: '#EC4899',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'DCE, registres de dépôt, PV d\'ouverture des plis, offres non retenues',
    legalBasis: 'DUA 5 ans, élimination — référentiel 2021/D/73 du délégué interministériel aux archives de France'
  },

  // ------------------------------------------------------ Ressources humaines
  {
    name: 'Dossiers individuels des agents', code: 'DOSAGENT', sortFinal: T,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 80, retentionUnit: 'years',
    description: 'Dossier individuel de carrière',
    legalBasis: "DUA 80 ans à compter de l'année de naissance de l'agent, tri — arrêté NOR RDFF1239419A du 21/12/2012 ⚠️ le point de départ réel est la naissance de l'agent, à ajuster au cas par cas"
  },
  {
    name: 'Bulletins de paie', code: 'PAIE', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Doubles des bulletins de paie',
    legalBasis: "DUA 5 ans, élimination — Code du travail art. L3243-4 et L3245-1 ; le récapitulatif annuel des paies est conservé"
  },
  {
    name: 'Préparation de la paie et cotisations sociales', code: 'COTISOC', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Éléments variables de paie, cotisations sociales',
    legalBasis: 'DUA 10 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Plannings et heures supplémentaires', code: 'PLANNING', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Plannings des heures, états d\'heures supplémentaires',
    legalBasis: 'DUA 10 ans, élimination'
  },
  {
    name: 'Congés et absences', code: 'CONGES', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 2, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes de congés, ARTT, justificatifs d\'absence',
    legalBasis: 'DUA 2 ans, élimination — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Candidatures non retenues', code: 'CANDRH', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 2, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes d\'emploi sans suite',
    legalBasis: 'DUA 2 ans, élimination (conserver les récapitulatifs annuels) ; CNIL — 2 ans après le dernier contact'
  },
  {
    name: 'Stagiaires', code: 'STAGE', sortFinal: E,
    domain: 'Ressources humaines', color: '#7C3AED',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Dossiers des stagiaires non rémunérés',
    legalBasis: 'DUA 5 ans, élimination'
  },

  // ----------------------------------------------------------- État civil
  {
    name: 'Registres d\'état civil', code: 'REGEC', sortFinal: C,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    description: 'Registres de naissances, mariages, décès et tables décennales',
    legalBasis: 'Conservation définitive — Code civil art. 40 ; instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Dossiers de mariage', code: 'MARIAGE', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Pièces non obligatoires : dossier de préparation, projet d\'acte',
    legalBasis: 'DUA 1 an, élimination (le registre fait foi) — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Avis de mention et mises à jour', code: 'MENTION', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Avis de mention, récépissés, pièces justificatives',
    legalBasis: 'DUA 10 ans, élimination'
  },
  {
    name: 'PACS', code: 'PACS', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 5, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Dossiers de préparation du pacte civil de solidarité',
    legalBasis: 'DUA 5 ans après la dissolution du PACS, élimination'
  },
  {
    name: 'Cartes d\'identité et passeports', code: 'CNIPASS', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Registres d\'inscription des demandes et de remise',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Recensement citoyen', code: 'RECENS', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Notices individuelles, listes des recensés',
    legalBasis: 'DUA 5 ans, élimination — Code du service national'
  },
  {
    name: 'Attestations d\'accueil', code: 'ACCUEIL', sortFinal: E,
    domain: "État civil et attributions d'État", color: '#0EA5E9',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Demandes d\'attestation d\'accueil (le fichier de délivrance est conservé)',
    legalBasis: 'DUA 5 ans, élimination — CESEDA'
  },

  // ------------------------------------------------------------- Élections
  {
    name: 'Listes électorales générales', code: 'LISTELEC', sortFinal: C,
    domain: 'Élections', color: '#6366F1',
    description: 'Listes électorales arrêtées',
    legalBasis: 'DUA 3 ans, conservation définitive — instruction DPACI/RES/2004/01'
  },
  {
    name: 'Procès-verbaux d\'élections', code: 'PVELEC', sortFinal: C,
    domain: 'Élections', color: '#6366F1',
    description: 'Procès-verbaux des opérations électorales, dossiers d\'organisation',
    legalBasis: 'Conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Listes d\'émargement', code: 'EMARG', sortFinal: E,
    domain: 'Élections', color: '#6366F1',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Listes d\'émargement des scrutins',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Tableaux rectificatifs et procurations', code: 'RECTELEC', sortFinal: E,
    domain: 'Élections', color: '#6366F1',
    retentionDuration: 3, retentionUnit: 'years',
    description: 'Inscriptions, radiations, feuilles de dépouillement, volets de procuration',
    legalBasis: 'DUA 3 ans (3 ans et 4 mois pour les procurations), élimination'
  },

  // -------------------------------------------------------- Police, sécurité
  {
    name: 'Main courante', code: 'MAINCOUR', sortFinal: C,
    domain: 'Police et sécurité', color: '#F97316',
    description: 'Main courante de la police municipale',
    legalBasis: 'DUA 3 ans, conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Rapports d\'intervention', code: 'RAPPINT', sortFinal: T,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Rapports d\'information et d\'intervention, cahier journalier',
    legalBasis: 'DUA 5 ans, tri qualitatif'
  },
  {
    name: 'Infractions et timbres-amendes', code: 'INFRACT', sortFinal: E,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Constats d\'infraction, notifications, procès-verbaux',
    legalBasis: 'DUA 10 ans, élimination'
  },
  {
    name: 'Objets trouvés', code: 'OBJTROUV', sortFinal: E,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 3, retentionUnit: 'years',
    description: 'Déclarations de perte, registres des objets trouvés',
    legalBasis: 'DUA 3 ans, élimination'
  },
  {
    name: 'Chiens dangereux', code: 'CHIENDG', sortFinal: E,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 15, retentionUnit: 'years',
    description: 'Dossiers d\'identification, arrêtés du maire (le registre est conservé)',
    legalBasis: 'DUA 15 ans, élimination'
  },
  {
    name: 'Débits de boissons temporaires', code: 'DEBBOIS', sortFinal: E,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes et arrêtés portant autorisation temporaire',
    legalBasis: 'DUA 1 an, élimination'
  },
  {
    name: 'Manifestations et réunions publiques', code: 'MANIFEST', sortFinal: T,
    domain: 'Police et sécurité', color: '#F97316',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Dossiers de manifestations, événements, réunions publiques',
    legalBasis: 'DUA 5 ans, tri qualitatif'
  },

  // ------------------------------------------------------------- Urbanisme
  {
    name: 'Autorisations d\'urbanisme', code: 'AUTURB', sortFinal: C,
    domain: 'Urbanisme', color: '#10B981',
    description: 'Permis de construire, de démolir, d\'aménager, de lotir et déclarations préalables',
    legalBasis: 'Conservation définitive — instruction DGP/SIAF/2014/006 ; note DGPA/SIAF/2021/003'
  },
  {
    name: 'Autorisations d\'urbanisme refusées ou sans suite', code: 'URBREF', sortFinal: E,
    domain: 'Urbanisme', color: '#10B981',
    retentionDuration: 1, retentionUnit: 'years', retentionStartFrom: 'processedDate',
    alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes refusées, retirées ou classées sans suite',
    legalBasis: 'DUA 1 an après décision, élimination'
  },
  {
    name: 'Certificats d\'urbanisme', code: 'CU', sortFinal: E,
    domain: 'Urbanisme', color: '#10B981',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Certificats d\'urbanisme d\'information et opérationnels',
    legalBasis: 'DUA de validité, élimination ⚠️ les CU portant détachement de parcelle d\'un terrain bâti (avant la loi SRU du 13/12/2000) doivent être conservés'
  },
  {
    name: 'Déclarations d\'intention d\'aliéner', code: 'DIA', sortFinal: E,
    domain: 'Urbanisme', color: '#10B981',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'DIA sans suite (le registre de préemption est conservé)',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Déclarations de travaux (DT-DICT)', code: 'DICT', sortFinal: E,
    domain: 'Urbanisme', color: '#10B981',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Déclarations d\'intention de commencement des travaux',
    legalBasis: 'DUA 1 an, élimination'
  },

  // ------------------------------------------- Voirie, réseaux, environnement
  {
    name: 'Plans et cartes des réseaux', code: 'RESEAUX', sortFinal: C,
    domain: 'Voirie, réseaux et environnement', color: '#14B8A6',
    description: 'Plans des réseaux d\'eau, d\'assainissement, d\'éclairage public',
    legalBasis: 'DUA de validité, conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Permissions de voirie', code: 'VOIRIE', sortFinal: E,
    domain: 'Voirie, réseaux et environnement', color: '#14B8A6',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Arrêtés de permission de voirie temporaire, poses de bennes et d\'échafaudages',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Analyses d\'eau conformes', code: 'EAUCONF', sortFinal: E,
    domain: 'Voirie, réseaux et environnement', color: '#14B8A6',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Contrôles sanitaires de l\'eau destinée à la consommation humaine — résultats conformes',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Analyses d\'eau non conformes', code: 'EAUNCONF', sortFinal: C,
    domain: 'Voirie, réseaux et environnement', color: '#14B8A6',
    description: 'Contrôles sanitaires — résultats non conformes',
    legalBasis: 'DUA 10 ans, conservation définitive'
  },
  {
    name: 'Collecte des déchets', code: 'DECHETS', sortFinal: E,
    domain: 'Voirie, réseaux et environnement', color: '#14B8A6',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Plannings, fiches de contrôle, gestion des bacs, réclamations',
    legalBasis: 'DUA 1 an, élimination — instruction DGP/SIAF/2014/006'
  },

  // ------------------------------------------------------------- Cimetière
  {
    name: 'Registre des inhumations', code: 'REGINHUM', sortFinal: C,
    domain: 'Cimetière', color: '#6B7280',
    description: 'Registre des inhumations et plan du cimetière',
    legalBasis: 'DUA de validité, conservation définitive — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Concessions funéraires', code: 'CONCES', sortFinal: C,
    domain: 'Cimetière', color: '#6B7280',
    description: 'Titres de possession, actes de concession, plans',
    legalBasis: 'DUA 30 ans, conservation définitive'
  },
  {
    name: 'Autorisations funéraires', code: 'AUTFUN', sortFinal: E,
    domain: 'Cimetière', color: '#6B7280',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Autorisations d\'inhumation, d\'exhumation, de dispersion des cendres',
    legalBasis: 'DUA 10 ans, élimination'
  },

  // --------------------------------------------- Enfance et affaires scolaires
  {
    name: 'Petite enfance — dossiers d\'admission', code: 'PETENF', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 3, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'État civil, fiche d\'inscription, justificatif de domicile',
    legalBasis: 'DUA 3 ans, élimination'
  },
  {
    name: 'Petite enfance — pièces financières', code: 'PETENFFI', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Justificatifs de ressources, prestations sociales, contrats',
    legalBasis: 'DUA 10 ans, élimination'
  },
  {
    name: 'Registre des entrées et sorties', code: 'REGCRECH', sortFinal: C,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    description: 'Registre des entrées et sorties des structures d\'accueil',
    legalBasis: 'DUA 1 an, conservation définitive'
  },
  {
    name: 'Dérogations scolaires', code: 'DEROGSCO', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Demandes et décisions de dérogation à la carte scolaire',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Sorties scolaires', code: 'SORTSCO', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Fiches d\'inscription, pièces justificatives, listes de participants',
    legalBasis: 'DUA 10 ans, élimination'
  },
  {
    name: 'Périscolaire — inscriptions et présences', code: 'PERISCO', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Dossiers d\'inscription, états de présence, facturation',
    legalBasis: 'DUA 5 ou 10 ans (10 ans si le tarif dépend du quotient familial), élimination'
  },
  {
    name: 'Accidents d\'enfants', code: 'ACCENF', sortFinal: E,
    domain: 'Enfance, scolaire et périscolaire', color: '#0891B2',
    retentionDuration: 28, retentionUnit: 'years',
    description: 'Déclarations d\'accident survenu à un mineur',
    legalBasis: "DUA 28 ans à compter de la date de naissance de l'enfant, élimination ⚠️ point de départ à ajuster au cas par cas"
  },

  // ------------------------------------------------------- Action sociale
  {
    name: 'Aide sociale — dossiers individuels', code: 'AIDESOC', sortFinal: T,
    domain: 'Action sociale et CCAS', color: '#DC2626',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Dossiers individuels des bénéficiaires de l\'aide sociale obligatoire',
    legalBasis: 'DUA 10 ans, tri systématique — instruction DGP/SIAF/2014/006'
  },
  {
    name: 'Demandes d\'aide refusées ou sans suite', code: 'AIDEREF', sortFinal: E,
    domain: 'Action sociale et CCAS', color: '#DC2626',
    retentionDuration: 2, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes d\'aide sociale rejetées, obligations alimentaires',
    legalBasis: 'DUA 2 ans, élimination'
  },
  {
    name: 'Services aux personnes âgées', code: 'PERSAGE', sortFinal: T,
    domain: 'Action sociale et CCAS', color: '#DC2626',
    retentionDuration: 10, retentionUnit: 'years', retentionStartFrom: 'archivedDate',
    description: 'Aide ménagère, téléassistance, portage de repas',
    legalBasis: 'DUA 10 ans, tri (verser un spécimen)'
  },
  {
    name: 'Logement social — demandes', code: 'LOGSOC', sortFinal: E,
    domain: 'Action sociale et CCAS', color: '#DC2626',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Demandes de logement et dossiers de commission d\'attribution',
    legalBasis: 'DUA 1 an, élimination'
  },
  {
    name: 'Domiciliation des personnes sans résidence fixe', code: 'DOMICIL', sortFinal: C,
    domain: 'Action sociale et CCAS', color: '#DC2626',
    description: 'Demandes de rattachement à une commune, avis du maire, arrêté préfectoral',
    legalBasis: 'DUA 2 ans, conservation définitive — loi n°2017-86 du 27 janvier 2017, art. 194'
  },

  // ------------------------------------------ Culture, sport, vie associative
  {
    name: 'Vie associative — dossiers de suivi', code: 'ASSOC', sortFinal: T,
    domain: 'Culture, sport et vie associative', color: '#A855F7',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Statuts, composition du bureau, règlement intérieur',
    legalBasis: "DUA correspondant à la durée de vie de l'association, tri (conserver les associations locales)"
  },
  {
    name: 'Utilisation de salles', code: 'SALLES', sortFinal: E,
    domain: 'Culture, sport et vie associative', color: '#A855F7',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Conventions de location, calendriers d\'occupation, fiches techniques',
    legalBasis: 'DUA 1 an, ou 10 ans si la location est payante (pièces justificatives comptables), élimination'
  },
  {
    name: 'Bibliothèque — inscriptions des lecteurs', code: 'BIBLIO', sortFinal: E,
    domain: 'Culture, sport et vie associative', color: '#A855F7',
    retentionDuration: 1, retentionUnit: 'years', alertBeforeDays: SHORT_ALERTS,
    description: 'Fiches d\'inscription des lecteurs, demandes de prêt',
    legalBasis: 'DUA 1 an, élimination'
  },
  {
    name: 'École de musique — dossiers d\'élèves', code: 'ECOMUS', sortFinal: T,
    domain: 'Culture, sport et vie associative', color: '#A855F7',
    retentionDuration: 10, retentionUnit: 'years',
    description: 'Dossiers scolaires, fichiers des élèves, registres matricules',
    legalBasis: 'DUA 10 ans, tri systématique'
  },
  {
    name: 'Manifestations — programme annuel', code: 'PROGMAN', sortFinal: C,
    domain: 'Culture, sport et vie associative', color: '#A855F7',
    description: 'Programmes annuels, bilans, supports pédagogiques d\'animations',
    legalBasis: 'DUA 1 an, conservation définitive'
  },

  // ------------------------------------- Informatique et données personnelles
  {
    name: 'Architecture des systèmes d\'information', code: 'ARCHIINF', sortFinal: C,
    domain: 'Informatique et données personnelles', color: '#64748B',
    description: 'Études, cahiers des charges techniques, schémas et plans de câblage',
    legalBasis: 'DUA de validité, conservation définitive'
  },
  {
    name: 'Échanges avec les prestataires informatiques', code: 'PRESTINF', sortFinal: E,
    domain: 'Informatique et données personnelles', color: '#64748B',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Correspondance, tickets, suivi des licences',
    legalBasis: 'DUA 5 ans, élimination'
  },
  {
    name: 'Registre des traitements', code: 'REGTRAIT', sortFinal: C,
    domain: 'Informatique et données personnelles', color: '#64748B',
    description: 'Registre des activités de traitement et documentation de conformité',
    legalBasis: 'Conservation définitive — RGPD art. 30'
  },
  {
    name: 'Demandes d\'exercice des droits RGPD', code: 'DROITSRG', sortFinal: E,
    domain: 'Informatique et données personnelles', color: '#64748B',
    retentionDuration: 5, retentionUnit: 'years',
    description: 'Demandes d\'accès, de rectification, d\'effacement, d\'opposition',
    legalBasis: 'DUA 5 ans (preuve du traitement de la demande), élimination — RGPD art. 12 à 22'
  },
  {
    name: 'Vidéoprotection — images', code: 'VIDEO', sortFinal: E,
    domain: 'Informatique et données personnelles', color: '#64748B',
    retentionDuration: 30, retentionUnit: 'days', alertBeforeDays: VERY_SHORT_ALERTS,
    description: 'Enregistrements des dispositifs de vidéoprotection',
    legalBasis: 'Un mois maximum — Code de la sécurité intérieure art. L252-3'
  }
];

/**
 * Normalise une entrée du référentiel en document Category.
 * Les catégories dont le sort final est « conservation définitive » n'ont
 * volontairement aucune durée active : elles ne doivent jamais faire l'objet
 * d'une alerte de suppression.
 */
export const toCategoryPayload = (entry) => ({
  name: entry.name,
  code: entry.code,
  domain: entry.domain,
  description: entry.description || '',
  color: entry.color || '#4F46E5',
  isActive: true,
  sortFinal: entry.sortFinal,
  retentionEnabled: entry.sortFinal !== SORT_FINAL.CONSERVATION && Boolean(entry.retentionDuration),
  retentionDuration: entry.sortFinal === SORT_FINAL.CONSERVATION ? null : (entry.retentionDuration ?? null),
  retentionUnit: entry.retentionUnit || 'years',
  retentionStartFrom: entry.retentionStartFrom || 'receivedDate',
  legalBasis: entry.legalBasis || '',
  // Jamais de suppression automatique dans le référentiel : l'élimination
  // d'archives publiques exige le visa des Archives départementales.
  expiryAction: 'notify',
  alertBeforeDays: entry.alertBeforeDays || []
});

export default COMMUNE_CATEGORIES;
