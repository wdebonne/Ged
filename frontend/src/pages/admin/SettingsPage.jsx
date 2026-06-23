import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { settingsAPI, emailTemplatesAPI, webhooksAPI, onedriveAPI, s3API, nextcloudAPI, imapMailAPI } from '../../services/api';
import useBrandingStore from '../../stores/brandingStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExcelRegisterSettings from '../../components/ExcelRegisterSettings';
import toast from 'react-hot-toast';
import {
  Cog6ToothIcon,
  ServerIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  KeyIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  TrashIcon,
  PaintBrushIcon,
  PaperAirplaneIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  BoltIcon,
  ArrowPathIcon,
  SignalIcon,
  PlayIcon,
  CloudIcon,
  FolderIcon,
  LinkIcon,
  DocumentMagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  SwatchIcon,
  BellIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'general', name: 'Général', icon: Cog6ToothIcon },
  { id: 'appearance', name: 'Apparence', icon: PaintBrushIcon },
  { id: 'chatbot', name: 'ChatBot', icon: ChatBubbleLeftRightIcon },
  { id: 'ocr', name: 'OCR', icon: DocumentMagnifyingGlassIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'email-templates', name: 'Modèles de mail', icon: EnvelopeIcon },
  { id: 'webhooks', name: 'Webhooks', icon: BoltIcon },
  { id: 'storage', name: 'Stockage externe', icon: CloudIcon },
  { id: 'ldap', name: 'LDAP', icon: ShieldCheckIcon },
  { id: 'kerberos', name: 'Kerberos', icon: KeyIcon },
  { id: 'imap', name: 'IMAP', icon: EnvelopeIcon },
  { id: 'imap-mail', name: 'IMAP Email-PDF', icon: EnvelopeIcon },
  { id: 'smtp', name: 'SMTP', icon: EnvelopeIcon },
  { id: 'database', name: 'Base de données', icon: ServerIcon },
  { id: 'excel', name: 'Registre Excel', icon: TableCellsIcon }
];

// Composant Notifications par défaut
function NotificationDefaultsSettings() {
  const queryClient = useQueryClient();
  const NOTIFICATION_OPTIONS = [
    { key: 'email_newMail_recipient', label: 'Nouveau courrier (destinataire principal)', description: 'Le destinataire principal reçoit un email' },
    { key: 'email_newMail_copy', label: 'Nouveau courrier (en copie)', description: 'Les destinataires en copie reçoivent un email' },
    { key: 'email_newMail_service', label: 'Nouveau courrier du service (superviseur)', description: 'Les superviseurs du service sont notifiés' },
    { key: 'email_processed', label: 'Courrier traité', description: 'Notification quand un courrier est marqué comme traité' },
    { key: 'email_archived', label: 'Courrier archivé', description: 'Notification quand un courrier est archivé' },
    { key: 'email_reminder', label: 'Rappels d\'échéance', description: 'Rappels avant la date d\'échéance' },
    { key: 'email_overdue', label: 'Courriers en retard', description: 'Alertes pour les courriers dont l\'échéance est dépassée' }
  ];

  const [defaults, setDefaults] = useState({
    email_newMail_recipient: true,
    email_newMail_copy: true,
    email_newMail_service: false,
    email_processed: true,
    email_archived: true,
    email_reminder: true,
    email_overdue: true
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings', 'notification_defaults'],
    queryFn: async () => {
      const res = await settingsAPI.getOne('notification_defaults');
      return res.data?.data?.value;
    },
    retry: false
  });

  useEffect(() => {
    if (settingsData) {
      setDefaults(prev => ({ ...prev, ...settingsData }));
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.update('notification_defaults', {
      value: defaults,
      category: 'general',
      description: 'Préférences de notification par défaut pour tous les utilisateurs'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'notification_defaults']);
      toast.success('Paramètres de notification par défaut enregistrés');
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BellIcon className="w-5 h-5" />
          Notifications par défaut
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Définissez les notifications email activées par défaut pour tous les utilisateurs.
          Chaque utilisateur peut ensuite personnaliser ses propres préférences depuis son profil.
        </p>
      </div>

      <div className="divide-y rounded-lg border overflow-hidden">
        {NOTIFICATION_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={defaults[opt.key] ?? true}
              onChange={(e) => setDefaults({ ...defaults, [opt.key]: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              <p className="text-xs text-gray-500">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {saveMutation.isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistrer les paramètres par défaut
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Composant IMAP Email-PDF (second IMAP pour conversion email -> PDF)
function ImapMailSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    enabled: false,
    host: '', port: 993, user: '', password: '',
    tls: true, mailbox: 'INBOX', checkInterval: 5,
    autoImport: true,
    filterDomains: '', filterEmails: '', filterSubjectKeywords: '', filterBodyKeywords: '',
    processedFolder: 'Traités', markAsRead: true, deleteAfterProcess: false, processAllMails: false,
    alwaysGenerateBodyPdf: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

  const { data: settingsData } = useQuery({
    queryKey: ['settings', 'imap_mail'],
    queryFn: async () => {
      const res = await settingsAPI.getAll('imap_mail');
      return res.data?.data || [];
    }
  });

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const newData = { ...formData };
      settingsData.forEach(s => {
        const key = s.key.replace('imap_mail_', '');
        let value = s.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);
        if (key in newData) newData[key] = value;
      });
      setFormData(newData);
    }
  }, [settingsData]);

  const fetchStatus = async () => {
    try {
      const res = await imapMailAPI.getStatus();
      setStatus(res.data?.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const secretKeys = ['password'];
      const settings = Object.entries(formData).map(([key, value]) => ({
        key: `imap_mail_${key}`,
        value,
        category: 'imap_mail',
        isSecret: secretKeys.includes(key)
      }));
      return settingsAPI.updateMany(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'imap_mail']);
      toast.success('Paramètres IMAP Email-PDF sauvegardés');
    },
    onError: () => toast.error('Erreur de sauvegarde')
  });

  const handleStart = async () => {
    try { await imapMailAPI.start(); toast.success('Service démarré'); fetchStatus(); }
    catch { toast.error('Erreur au démarrage'); }
  };
  const handleStop = async () => {
    try { await imapMailAPI.stop(); toast.success('Service arrêté'); fetchStatus(); }
    catch { toast.error('Erreur à l\'arrêt'); }
  };
  const handleCheck = async () => {
    try {
      const res = await imapMailAPI.check();
      toast.success(res.data?.message || 'Vérification terminée');
      fetchStatus();
    } catch { toast.error('Erreur de vérification'); }
  };

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <EnvelopeIcon className="w-5 h-5" />
          IMAP Email-to-PDF
        </h2>
        <div className="flex items-center gap-2">
          {status?.running ? (
            <button onClick={handleStop} className="btn-danger btn-sm">Arrêter</button>
          ) : (
            <button onClick={handleStart} className="btn-primary btn-sm" disabled={!formData.enabled}>Démarrer</button>
          )}
          <button onClick={handleCheck} className="btn-secondary btn-sm">Vérifier maintenant</button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Ce service IMAP convertit automatiquement les emails en documents PDF pour import dans la GED.
          Si l'email contient des pièces jointes PDF, elles sont importées directement.
          Si l'email n'a pas de PJ PDF, le corps du mail est converti en PDF.
        </p>
      </div>

      {status && (
        <div className="card p-4">
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2 py-1 rounded-full ${status.running ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {status.running ? 'En cours' : 'Arrêté'}
            </span>
            {status.lastCheck && (
              <span className="text-gray-500">
                Dernière vérification: {new Date(status.lastCheck).toLocaleString('fr-FR')}
              </span>
            )}
            <span className="text-gray-500">{status.messagesProcessed} document(s) traité(s)</span>
            {status.lastError && (
              <span className="text-red-600">Erreur: {status.lastError}</span>
            )}
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="imap_mail_enabled" checked={formData.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600" />
          <label htmlFor="imap_mail_enabled" className="font-medium text-gray-700">Activer le service IMAP Email-PDF</label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">Serveur IMAP</label>
            <input type="text" value={formData.host} onChange={(e) => update('host', e.target.value)}
              className="input" placeholder="imap.exemple.com" />
          </div>
          <div>
            <label className="label">Port</label>
            <input type="number" value={formData.port} onChange={(e) => update('port', parseInt(e.target.value))}
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Utilisateur</label>
            <input type="text" value={formData.user} onChange={(e) => update('user', e.target.value)}
              className="input" placeholder="user@exemple.com" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={formData.password}
                onChange={(e) => update('password', e.target.value)} className="input pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Dossier</label>
            <input type="text" value={formData.mailbox} onChange={(e) => update('mailbox', e.target.value)}
              className="input" placeholder="INBOX" />
          </div>
          <div>
            <label className="label">Intervalle (minutes)</label>
            <input type="number" value={formData.checkInterval} min="1"
              onChange={(e) => update('checkInterval', parseInt(e.target.value))} className="input" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="imap_mail_tls" checked={formData.tls}
            onChange={(e) => update('tls', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600" />
          <label htmlFor="imap_mail_tls" className="text-gray-700">Utiliser TLS</label>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Conversion Email-PDF</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="imap_mail_alwaysBody" checked={formData.alwaysGenerateBodyPdf}
              onChange={(e) => update('alwaysGenerateBodyPdf', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="imap_mail_alwaysBody" className="text-gray-700">
              Toujours générer le PDF du corps du mail (même si l'email a des pièces jointes PDF)
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Si désactivé, le PDF du corps est généré uniquement quand l'email n'a pas de pièce jointe PDF.
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Filtres</h3>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="imap_mail_autoImport" checked={formData.autoImport}
              onChange={(e) => update('autoImport', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="imap_mail_autoImport" className="text-gray-700">Importer tous les emails</label>
          </div>

          {!formData.autoImport && (
            <div className="grid grid-cols-2 gap-4 ml-7">
              <div>
                <label className="label">Domaines</label>
                <input type="text" value={formData.filterDomains} onChange={(e) => update('filterDomains', e.target.value)}
                  className="input" placeholder="exemple.com, domaine.fr" />
              </div>
              <div>
                <label className="label">Emails</label>
                <input type="text" value={formData.filterEmails} onChange={(e) => update('filterEmails', e.target.value)}
                  className="input" placeholder="user@exemple.com" />
              </div>
              <div>
                <label className="label">Mots-clés sujet</label>
                <input type="text" value={formData.filterSubjectKeywords} onChange={(e) => update('filterSubjectKeywords', e.target.value)}
                  className="input" placeholder="facture, commande" />
              </div>
              <div>
                <label className="label">Mots-clés corps</label>
                <input type="text" value={formData.filterBodyKeywords} onChange={(e) => update('filterBodyKeywords', e.target.value)}
                  className="input" placeholder="important, urgent" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Post-traitement</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Dossier des traités</label>
              <input type="text" value={formData.processedFolder} onChange={(e) => update('processedFolder', e.target.value)}
                className="input w-64" placeholder="Traités" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={formData.markAsRead}
                onChange={(e) => update('markAsRead', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600" />
              <span className="text-gray-700">Marquer comme lu après traitement</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={formData.processAllMails}
                onChange={(e) => update('processAllMails', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600" />
              <span className="text-gray-700">Traiter tous les emails (pas seulement les non lus)</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={formData.deleteAfterProcess}
                onChange={(e) => update('deleteAfterProcess', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600" />
              <span className="text-gray-700">Supprimer au lieu de déplacer</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isLoading}
            className="btn-primary">
            {saveMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Stockage externe (OneDrive, S3, NextCloud)
function StorageSettings() {
  const queryClient = useQueryClient();
  const [activeStorage, setActiveStorage] = useState('onedrive');
  const [showPasswords, setShowPasswords] = useState({});
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState('/');
  const [folders, setFolders] = useState([]);

  // === OneDrive State ===
  const [oneDriveConfig, setOneDriveConfig] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    tenantId: '',
    targetFolder: 'GED-Courrier/Archives',
    syncArchived: true,
    syncResponses: false,
    deleteLocalAfterSync: false,
    createServiceFolders: true,
    createYearFolders: true,
    createMonthFolders: true
  });

  // === S3 State ===
  const [s3Config, setS3Config] = useState({
    enabled: false,
    provider: 'aws',
    endpoint: '',
    region: 'eu-west-1',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    basePath: 'GED-Courrier',
    syncArchivedMails: true,
    syncResponseFiles: false,
    deleteLocalAfterSync: false,
    useServiceSubfolder: true,
    useYearSubfolder: true,
    useMonthSubfolder: true
  });

  // === NextCloud State ===
  const [nextCloudConfig, setNextCloudConfig] = useState({
    enabled: false,
    serverUrl: '',
    username: '',
    password: '',
    basePath: 'GED-Courrier',
    syncArchivedMails: true,
    syncResponseFiles: false,
    deleteLocalAfterSync: false,
    useServiceSubfolder: true,
    useYearSubfolder: true,
    useMonthSubfolder: true
  });

  // === OneDrive Queries ===
  const { data: onedriveStatus } = useQuery({
    queryKey: ['onedrive-status'],
    queryFn: async () => {
      const response = await onedriveAPI.getStatus();
      return response.data.data;
    }
  });

  const { data: onedriveConfigData } = useQuery({
    queryKey: ['onedrive-config'],
    queryFn: async () => {
      const response = await onedriveAPI.getConfig();
      return response.data.data;
    }
  });

  // === S3 Queries ===
  const { data: s3Status } = useQuery({
    queryKey: ['s3-status'],
    queryFn: async () => {
      const response = await s3API.getStatus();
      return response.data.data;
    }
  });

  const { data: s3ConfigData } = useQuery({
    queryKey: ['s3-config'],
    queryFn: async () => {
      const response = await s3API.getConfig();
      return response.data.data;
    }
  });

  // === NextCloud Queries ===
  const { data: nextcloudStatus } = useQuery({
    queryKey: ['nextcloud-status'],
    queryFn: async () => {
      const response = await nextcloudAPI.getStatus();
      return response.data.data;
    }
  });

  const { data: nextcloudConfigData } = useQuery({
    queryKey: ['nextcloud-config'],
    queryFn: async () => {
      const response = await nextcloudAPI.getConfig();
      return response.data.data;
    }
  });

  // Initialize forms with data
  useEffect(() => {
    if (onedriveConfigData) {
      setOneDriveConfig(prev => ({
        ...prev,
        ...onedriveConfigData,
        enabled: onedriveConfigData.enabled === true || onedriveConfigData.enabled === 'true',
        syncArchived: onedriveConfigData.syncArchived === true || onedriveConfigData.syncArchived === 'true',
        syncResponses: onedriveConfigData.syncResponses === true || onedriveConfigData.syncResponses === 'true',
        deleteLocalAfterSync: onedriveConfigData.deleteLocalAfterSync === true || onedriveConfigData.deleteLocalAfterSync === 'true',
        createServiceFolders: onedriveConfigData.createServiceFolders !== false,
        createYearFolders: onedriveConfigData.createYearFolders !== false,
        createMonthFolders: onedriveConfigData.createMonthFolders !== false
      }));
    }
  }, [onedriveConfigData]);

  useEffect(() => {
    if (s3ConfigData) {
      setS3Config(prev => ({
        ...prev,
        ...s3ConfigData,
        enabled: s3ConfigData.enabled === true || s3ConfigData.enabled === 'true',
        syncArchivedMails: s3ConfigData.syncArchivedMails === true || s3ConfigData.syncArchivedMails === 'true',
        syncResponseFiles: s3ConfigData.syncResponseFiles === true || s3ConfigData.syncResponseFiles === 'true',
        deleteLocalAfterSync: s3ConfigData.deleteLocalAfterSync === true || s3ConfigData.deleteLocalAfterSync === 'true',
        useServiceSubfolder: s3ConfigData.useServiceSubfolder !== false,
        useYearSubfolder: s3ConfigData.useYearSubfolder !== false,
        useMonthSubfolder: s3ConfigData.useMonthSubfolder !== false
      }));
    }
  }, [s3ConfigData]);

  useEffect(() => {
    if (nextcloudConfigData) {
      setNextCloudConfig(prev => ({
        ...prev,
        ...nextcloudConfigData,
        enabled: nextcloudConfigData.enabled === true || nextcloudConfigData.enabled === 'true',
        syncArchivedMails: nextcloudConfigData.syncArchivedMails === true || nextcloudConfigData.syncArchivedMails === 'true',
        syncResponseFiles: nextcloudConfigData.syncResponseFiles === true || nextcloudConfigData.syncResponseFiles === 'true',
        deleteLocalAfterSync: nextcloudConfigData.deleteLocalAfterSync === true || nextcloudConfigData.deleteLocalAfterSync === 'true',
        useServiceSubfolder: nextcloudConfigData.useServiceSubfolder !== false,
        useYearSubfolder: nextcloudConfigData.useYearSubfolder !== false,
        useMonthSubfolder: nextcloudConfigData.useMonthSubfolder !== false
      }));
    }
  }, [nextcloudConfigData]);

  // === OneDrive Mutations ===
  const saveOneDriveMutation = useMutation({
    mutationFn: (data) => onedriveAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['onedrive-config', 'onedrive-status']);
      toast.success('Configuration OneDrive enregistrée');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur')
  });

  const testOneDriveMutation = useMutation({
    mutationFn: () => onedriveAPI.test(),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['onedrive-status']);
      toast.success(`Connexion OneDrive réussie !`);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur de connexion')
  });

  const disconnectOneDriveMutation = useMutation({
    mutationFn: () => onedriveAPI.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries(['onedrive-status', 'onedrive-config']);
      toast.success('OneDrive déconnecté');
    }
  });

  // === S3 Mutations ===
  const saveS3Mutation = useMutation({
    mutationFn: (data) => s3API.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['s3-config', 's3-status']);
      toast.success('Configuration S3 enregistrée');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur')
  });

  const testS3Mutation = useMutation({
    mutationFn: () => s3API.test(),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['s3-status']);
      toast.success(response.data.message || 'Connexion S3 réussie !');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur de connexion')
  });

  const disconnectS3Mutation = useMutation({
    mutationFn: () => s3API.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries(['s3-status', 's3-config']);
      toast.success('S3 déconnecté');
    }
  });

  // === NextCloud Mutations ===
  const saveNextCloudMutation = useMutation({
    mutationFn: (data) => nextcloudAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['nextcloud-config', 'nextcloud-status']);
      toast.success('Configuration NextCloud enregistrée');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur')
  });

  const testNextCloudMutation = useMutation({
    mutationFn: () => nextcloudAPI.test(),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['nextcloud-status']);
      toast.success(response.data.message || 'Connexion NextCloud réussie !');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur de connexion')
  });

  const disconnectNextCloudMutation = useMutation({
    mutationFn: () => nextcloudAPI.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries(['nextcloud-status', 'nextcloud-config']);
      toast.success('NextCloud déconnecté');
    }
  });

  // OneDrive OAuth connection
  const handleConnectOneDrive = async () => {
    try {
      const redirectUri = `${window.location.origin}/settings/onedrive/callback`;
      const response = await onedriveAPI.getAuthUrl(redirectUri);
      const authUrl = response.data.data.authUrl;
      
      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(authUrl, 'onedrive-auth', `width=${width},height=${height},left=${left},top=${top}`);
      
      const handleMessage = async (event) => {
        if (event.data?.type === 'onedrive-callback' && event.data?.code) {
          window.removeEventListener('message', handleMessage);
          authWindow?.close();
          try {
            await onedriveAPI.authCallback(event.data.code, redirectUri);
            queryClient.invalidateQueries(['onedrive-status', 'onedrive-config']);
            toast.success('Connexion OneDrive réussie !');
          } catch (error) {
            toast.error(error.response?.data?.message || 'Erreur d\'authentification');
          }
        }
      };
      window.addEventListener('message', handleMessage);
      setTimeout(() => window.removeEventListener('message', handleMessage), 300000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la connexion');
    }
  };

  // Folder browser for OneDrive
  const listOneDriveFolders = useMutation({
    mutationFn: (path) => onedriveAPI.listFolders(path),
    onSuccess: (response) => setFolders(response.data.data || []),
    onError: (error) => toast.error('Erreur de listage des dossiers')
  });

  const openFolderBrowser = (provider) => {
    setFolderBrowserOpen(true);
    setCurrentFolderPath('/');
    if (provider === 'onedrive') {
      listOneDriveFolders.mutate('root');
    }
  };

  const navigateToFolder = (folderPath) => {
    setCurrentFolderPath(folderPath);
    listOneDriveFolders.mutate(folderPath === '/' ? 'root' : folderPath);
  };

  const selectFolder = (folderPath) => {
    setOneDriveConfig(prev => ({ ...prev, targetFolder: folderPath.replace(/^\//, '') }));
    setFolderBrowserOpen(false);
  };

  const storageProviders = [
    { id: 'onedrive', name: 'Microsoft OneDrive', color: 'blue', icon: '☁️' },
    { id: 's3', name: 'Amazon S3 / Compatible', color: 'orange', icon: '🪣' },
    { id: 'nextcloud', name: 'NextCloud / ownCloud', color: 'indigo', icon: '☁️' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CloudIcon className="w-5 h-5" />
          Stockage externe
        </h2>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-2 border-b pb-2">
        {storageProviders.map(provider => (
          <button
            key={provider.id}
            onClick={() => setActiveStorage(provider.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeStorage === provider.id
                ? `bg-${provider.color}-100 text-${provider.color}-700 border-b-2 border-${provider.color}-500`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="mr-2">{provider.icon}</span>
            {provider.name}
          </button>
        ))}
      </div>

      {/* === OneDrive Panel === */}
      {activeStorage === 'onedrive' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-2xl">☁️</div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Microsoft OneDrive</h3>
              <p className="text-blue-100 text-sm">Synchronisez vos courriers avec OneDrive</p>
            </div>
            {onedriveStatus?.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Connecté
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">Non connecté</span>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="onedriveEnabled"
                  checked={oneDriveConfig.enabled}
                  onChange={(e) => setOneDriveConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="onedriveEnabled" className="text-gray-700 font-medium">Activer OneDrive</label>
              </div>
              <button
                onClick={() => saveOneDriveMutation.mutate(oneDriveConfig)}
                disabled={saveOneDriveMutation.isLoading}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
              >
                {saveOneDriveMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {oneDriveConfig.enabled && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Configuration Azure AD</h4>
                  <p className="text-sm text-gray-600">
                    Créez une application dans le <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">portail Azure</a>
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Client ID</label>
                      <input
                        type="text"
                        value={oneDriveConfig.clientId || ''}
                        onChange={(e) => setOneDriveConfig(prev => ({ ...prev, clientId: e.target.value }))}
                        className="input font-mono text-sm"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="label">Tenant ID</label>
                      <input
                        type="text"
                        value={oneDriveConfig.tenantId || ''}
                        onChange={(e) => setOneDriveConfig(prev => ({ ...prev, tenantId: e.target.value }))}
                        className="input font-mono text-sm"
                        placeholder="common"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Client Secret</label>
                    <div className="relative">
                      <input
                        type={showPasswords.onedriveSecret ? 'text' : 'password'}
                        value={oneDriveConfig.clientSecret || ''}
                        onChange={(e) => setOneDriveConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                        className="input pr-10 font-mono text-sm"
                      />
                      <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, onedriveSecret: !prev.onedriveSecret }))} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPasswords.onedriveSecret ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {!onedriveStatus?.connected ? (
                      <button onClick={handleConnectOneDrive} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                        <LinkIcon className="w-4 h-4 inline mr-2" />Connecter à OneDrive
                      </button>
                    ) : (
                      <>
                        <button onClick={() => testOneDriveMutation.mutate()} disabled={testOneDriveMutation.isLoading} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                          <PlayIcon className="w-4 h-4 inline mr-2" />{testOneDriveMutation.isLoading ? 'Test...' : 'Tester'}
                        </button>
                        <button onClick={() => disconnectOneDriveMutation.mutate()} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                          <XMarkIcon className="w-4 h-4 inline mr-2" />Déconnecter
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Options de synchronisation</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.syncArchived} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, syncArchived: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les courriers archivés</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.syncResponses} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, syncResponses: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les fichiers de réponse</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.deleteLocalAfterSync} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, deleteLocalAfterSync: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span className="flex items-center gap-2">
                        Supprimer les fichiers locaux après synchronisation
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">⚠️ Stockage externe uniquement</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Dossier de destination</h4>
                  <div className="flex gap-2">
                    <input type="text" value={oneDriveConfig.targetFolder || ''} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, targetFolder: e.target.value }))} className="input flex-1" placeholder="GED-Courrier/Archives" />
                    {onedriveStatus?.connected && (
                      <button onClick={() => openFolderBrowser('onedrive')} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <FolderIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.createServiceFolders} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, createServiceFolders: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par service</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.createYearFolders} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, createYearFolders: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par année</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={oneDriveConfig.createMonthFolders} onChange={(e) => setOneDriveConfig(prev => ({ ...prev, createMonthFolders: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par mois</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* === S3 Panel === */}
      {activeStorage === 's3' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-2xl">🪣</div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Amazon S3 / Compatible S3</h3>
              <p className="text-orange-100 text-sm">AWS S3, MinIO, Wasabi, DigitalOcean Spaces...</p>
            </div>
            {s3Status?.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Connecté ({s3Status.bucket})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">Non connecté</span>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="s3Enabled" checked={s3Config.enabled} onChange={(e) => setS3Config(prev => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                <label htmlFor="s3Enabled" className="text-gray-700 font-medium">Activer S3</label>
              </div>
              <button onClick={() => saveS3Mutation.mutate(s3Config)} disabled={saveS3Mutation.isLoading} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
                {saveS3Mutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {s3Config.enabled && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Configuration S3</h4>

                  <div>
                    <label className="label">Fournisseur</label>
                    <select value={s3Config.provider} onChange={(e) => setS3Config(prev => ({ ...prev, provider: e.target.value }))} className="input">
                      <option value="aws">Amazon Web Services (AWS)</option>
                      <option value="minio">MinIO</option>
                      <option value="wasabi">Wasabi</option>
                      <option value="digitalocean">DigitalOcean Spaces</option>
                      <option value="other">Autre (compatible S3)</option>
                    </select>
                  </div>

                  {s3Config.provider !== 'aws' && (
                    <div>
                      <label className="label">Endpoint URL</label>
                      <input type="text" value={s3Config.endpoint || ''} onChange={(e) => setS3Config(prev => ({ ...prev, endpoint: e.target.value }))} className="input" placeholder="https://s3.example.com" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Région</label>
                      <input type="text" value={s3Config.region || ''} onChange={(e) => setS3Config(prev => ({ ...prev, region: e.target.value }))} className="input" placeholder="eu-west-1" />
                    </div>
                    <div>
                      <label className="label">Bucket</label>
                      <input type="text" value={s3Config.bucket || ''} onChange={(e) => setS3Config(prev => ({ ...prev, bucket: e.target.value }))} className="input" placeholder="mon-bucket" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Access Key ID</label>
                      <input type="text" value={s3Config.accessKeyId || ''} onChange={(e) => setS3Config(prev => ({ ...prev, accessKeyId: e.target.value }))} className="input font-mono text-sm" />
                    </div>
                    <div>
                      <label className="label">Secret Access Key</label>
                      <div className="relative">
                        <input type={showPasswords.s3Secret ? 'text' : 'password'} value={s3Config.secretAccessKey || ''} onChange={(e) => setS3Config(prev => ({ ...prev, secretAccessKey: e.target.value }))} className="input pr-10 font-mono text-sm" />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, s3Secret: !prev.s3Secret }))} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPasswords.s3Secret ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={() => testS3Mutation.mutate()} disabled={testS3Mutation.isLoading} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                      <PlayIcon className="w-4 h-4 inline mr-2" />{testS3Mutation.isLoading ? 'Test...' : 'Tester la connexion'}
                    </button>
                    {s3Status?.connected && (
                      <button onClick={() => disconnectS3Mutation.mutate()} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                        <XMarkIcon className="w-4 h-4 inline mr-2" />Déconnecter
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Options de synchronisation</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.syncArchivedMails} onChange={(e) => setS3Config(prev => ({ ...prev, syncArchivedMails: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les courriers archivés</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.syncResponseFiles} onChange={(e) => setS3Config(prev => ({ ...prev, syncResponseFiles: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les fichiers de réponse</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.deleteLocalAfterSync} onChange={(e) => setS3Config(prev => ({ ...prev, deleteLocalAfterSync: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span className="flex items-center gap-2">
                        Supprimer les fichiers locaux après synchronisation
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">⚠️ Stockage externe uniquement</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Chemin de base</h4>
                  <input type="text" value={s3Config.basePath || ''} onChange={(e) => setS3Config(prev => ({ ...prev, basePath: e.target.value }))} className="input" placeholder="GED-Courrier" />
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.useServiceSubfolder} onChange={(e) => setS3Config(prev => ({ ...prev, useServiceSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par service</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.useYearSubfolder} onChange={(e) => setS3Config(prev => ({ ...prev, useYearSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par année</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={s3Config.useMonthSubfolder} onChange={(e) => setS3Config(prev => ({ ...prev, useMonthSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par mois</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* === NextCloud Panel === */}
      {activeStorage === 'nextcloud' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-2xl">☁️</div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">NextCloud / ownCloud</h3>
              <p className="text-indigo-100 text-sm">Stockage cloud auto-hébergé via WebDAV</p>
            </div>
            {nextcloudStatus?.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Connecté
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">Non connecté</span>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="nextcloudEnabled" checked={nextCloudConfig.enabled} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                <label htmlFor="nextcloudEnabled" className="text-gray-700 font-medium">Activer NextCloud</label>
              </div>
              <button onClick={() => saveNextCloudMutation.mutate(nextCloudConfig)} disabled={saveNextCloudMutation.isLoading} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
                {saveNextCloudMutation.isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {nextCloudConfig.enabled && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Configuration NextCloud</h4>

                  <div>
                    <label className="label">URL du serveur</label>
                    <input type="text" value={nextCloudConfig.serverUrl || ''} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, serverUrl: e.target.value }))} className="input" placeholder="https://cloud.example.com" />
                    <p className="text-xs text-gray-500 mt-1">L'URL de votre instance NextCloud (sans /remote.php/...)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nom d'utilisateur</label>
                      <input type="text" value={nextCloudConfig.username || ''} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, username: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="label">Mot de passe</label>
                      <div className="relative">
                        <input type={showPasswords.nextcloudPassword ? 'text' : 'password'} value={nextCloudConfig.password || ''} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, password: e.target.value }))} className="input pr-10" />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, nextcloudPassword: !prev.nextcloudPassword }))} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPasswords.nextcloudPassword ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Utilisez un mot de passe d'application pour plus de sécurité</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={() => testNextCloudMutation.mutate()} disabled={testNextCloudMutation.isLoading} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                      <PlayIcon className="w-4 h-4 inline mr-2" />{testNextCloudMutation.isLoading ? 'Test...' : 'Tester la connexion'}
                    </button>
                    {nextcloudStatus?.connected && (
                      <button onClick={() => disconnectNextCloudMutation.mutate()} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                        <XMarkIcon className="w-4 h-4 inline mr-2" />Déconnecter
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Options de synchronisation</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.syncArchivedMails} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, syncArchivedMails: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les courriers archivés</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.syncResponseFiles} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, syncResponseFiles: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Synchroniser les fichiers de réponse</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.deleteLocalAfterSync} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, deleteLocalAfterSync: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span className="flex items-center gap-2">
                        Supprimer les fichiers locaux après synchronisation
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">⚠️ Stockage externe uniquement</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900">Dossier de destination</h4>
                  <input type="text" value={nextCloudConfig.basePath || ''} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, basePath: e.target.value }))} className="input" placeholder="GED-Courrier" />
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.useServiceSubfolder} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, useServiceSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par service</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.useYearSubfolder} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, useYearSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par année</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={nextCloudConfig.useMonthSubfolder} onChange={(e) => setNextCloudConfig(prev => ({ ...prev, useMonthSubfolder: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span>Sous-dossier par mois</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Folder Browser Modal (OneDrive) */}
      {folderBrowserOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sélectionner un dossier</h3>
              <button onClick={() => setFolderBrowserOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4 text-sm">
                <button onClick={() => navigateToFolder('/')} className="text-primary-600 hover:underline">OneDrive</button>
                {currentFolderPath !== '/' && currentFolderPath.split('/').filter(p => p).map((part, index, arr) => (
                  <span key={index} className="flex items-center gap-2">
                    <span className="text-gray-400">/</span>
                    <button onClick={() => navigateToFolder('/' + arr.slice(0, index + 1).join('/'))} className="text-primary-600 hover:underline">{part}</button>
                  </span>
                ))}
              </div>
              
              <div className="border rounded-lg max-h-64 overflow-auto">
                {listOneDriveFolders.isLoading ? (
                  <div className="p-4 text-center text-gray-500">Chargement...</div>
                ) : folders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Aucun dossier</div>
                ) : (
                  folders.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" onClick={() => navigateToFolder(folder.path)}>
                      <FolderIcon className="w-5 h-5 text-yellow-500" />
                      <span className="flex-1">{folder.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); selectFolder(folder.path); }} className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200">Sélectionner</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-between">
              <button onClick={() => selectFolder(currentFolderPath)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Sélectionner ce dossier</button>
              <button onClick={() => setFolderBrowserOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant ChatBot Settings (Widget n8n)
function ChatBotSettings() {
  const queryClient = useQueryClient();
  const [showPasswords, setShowPasswords] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // État du formulaire avec tous les paramètres du widget
  const [config, setConfig] = useState({
    // Activation
    enabled: false,
    
    // Comportement
    featureFullscreen: true,
    featureCloseOutside: true,
    featureCloseButton: true,
    
    // Webhook n8n
    webhookUrl: '',
    webhookRoute: 'general',
    webhookAuthType: 'none',
    webhookAuthUser: '',
    webhookAuthPassword: '',
    
    // Branding et textes
    brandLogo: '',
    brandBotAvatar: '',
    brandName: 'Assistant GED',
    brandWelcomeText: 'Bonjour 👋, comment pouvons-nous vous aider ?',
    brandResponseText: 'Nous répondons en général immédiatement.',
    brandPoweredText: 'Propulsé par le Service Informatique',
    brandPoweredLink: '',
    brandGreetingMessage: 'Bonjour, je suis l\'assistant de la GED. Je suis là pour répondre à vos questions.',
    brandPromptMessage: 'Quelle est votre question ?',
    chatPlaceholder: 'Votre question...',
    chatButtonLabel: 'Envoyer',
    ctaButtonLabel: 'Envoyer un message',
    infoText: 'Merci de ne communiquer aucune donnée personnelle.',
    
    // Couleurs
    stylePrimaryColor: '#6366f1',
    styleSecondaryColor: '#8b5cf6',
    styleBackgroundColor: '#ffffff',
    styleFontColor: '#333333',
    styleUserMessageBg: '#6366f1',
    styleUserMessageText: '#ffffff',
    styleBotMessageBg: '#f3f4f6',
    styleBotMessageText: '#333333',
    styleToggleBackground: '#6366f1',
    
    // Position et forme
    stylePosition: 'right',
    styleToggleShape: 'circle',
    styleToggleIcon: '',
    
    // Toggles de visibilité
    toggleBrandLogo: true,
    toggleBrandBotAvatar: true,
    toggleBrandName: true,
    toggleBrandResponseText: true,
    toggleBrandWelcomeText: true,
    toggleCtaButtonLabel: true,
    toggleBrandGreetingMessage: true,
    toggleBrandPromptMessage: true,
    toggleInfoText: true,
    toggleChatPlaceholder: true,
    toggleChatButtonLabel: true,
    toggleBrandPowered: true
  });

  // Charger la configuration existante
  const { data: chatbotConfig, isLoading } = useQuery({
    queryKey: ['chatbot-config'],
    queryFn: async () => {
      const response = await settingsAPI.getAll('chatbot');
      return response.data.data;
    }
  });

  // Initialiser le formulaire avec les données chargées
  useEffect(() => {
    if (chatbotConfig && Array.isArray(chatbotConfig)) {
      const newConfig = { ...config };
      chatbotConfig.forEach(setting => {
        const key = setting.key.replace('chatbot_', '');
        // Convertir la clé snake_case en camelCase
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (camelKey in newConfig) {
          let value = setting.value;
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          newConfig[camelKey] = value;
        }
      });
      setConfig(newConfig);
    }
  }, [chatbotConfig]);

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const settings = Object.entries(data).map(([key, value]) => {
        // Convertir camelCase en snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return {
          key: `chatbot_${snakeKey}`,
          value: String(value),
          category: 'chatbot',
          isSecret: key.toLowerCase().includes('password')
        };
      });
      return settingsAPI.updateMany(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatbot-config']);
      toast.success('Configuration du ChatBot enregistrée');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = () => {
    saveMutation.mutate(config);
  };

  // Couleurs pour la palette
  const colorFields = [
    { key: 'stylePrimaryColor', label: 'Couleur primaire' },
    { key: 'styleSecondaryColor', label: 'Couleur secondaire' },
    { key: 'styleBackgroundColor', label: 'Fond du widget' },
    { key: 'styleFontColor', label: 'Texte global' },
    { key: 'styleUserMessageBg', label: 'Bulles utilisateur' },
    { key: 'styleUserMessageText', label: 'Texte utilisateur' },
    { key: 'styleBotMessageBg', label: 'Bulles bot' },
    { key: 'styleBotMessageText', label: 'Texte bot' },
    { key: 'styleToggleBackground', label: 'Bouton flottant' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          Configuration du ChatBot n8n
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="btn-secondary btn-sm flex items-center gap-2"
          >
            <EyeIcon className="w-4 h-4" />
            {previewOpen ? 'Masquer aperçu' : 'Aperçu'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveMutation.isLoading}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            {saveMutation.isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      <div className={`grid ${previewOpen ? 'grid-cols-2' : 'grid-cols-1'} gap-6 items-start`}>
        {/* Formulaire */}
        <div className="space-y-6">
          {/* Section Activation */}
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <BoltIcon className="w-4 h-4" />
              Activation
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-gray-700 font-medium">Activer le chatbot</label>
                <p className="text-sm text-gray-500">Affiche le widget chatbot sur l'application</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          {config.enabled && (
            <>
              {/* Section Comportement */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Comportement du widget</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700">Mode agrandi</span>
                      <p className="text-sm text-gray-500">Affiche le bouton d'agrandissement</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.featureFullscreen}
                      onChange={(e) => setConfig({ ...config, featureFullscreen: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700">Fermer en cliquant dehors</span>
                      <p className="text-sm text-gray-500">Ferme le widget si on clique à l'extérieur</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.featureCloseOutside}
                      onChange={(e) => setConfig({ ...config, featureCloseOutside: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700">Bouton fermer</span>
                      <p className="text-sm text-gray-500">Affiche le bouton de fermeture</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.featureCloseButton}
                      onChange={(e) => setConfig({ ...config, featureCloseButton: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
                </div>
              </div>

              {/* Section Webhook n8n */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Webhook n8n
                </h3>
                
                <div>
                  <label className="label">URL du Webhook</label>
                  <input
                    type="url"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    className="input"
                    placeholder="https://n8n.exemple.com/webhook/..."
                  />
                </div>
                
                <div>
                  <label className="label">Route</label>
                  <input
                    type="text"
                    value={config.webhookRoute}
                    onChange={(e) => setConfig({ ...config, webhookRoute: e.target.value })}
                    className="input"
                    placeholder="general"
                  />
                </div>
                
                <div>
                  <label className="label">Authentification</label>
                  <select
                    value={config.webhookAuthType}
                    onChange={(e) => setConfig({ ...config, webhookAuthType: e.target.value })}
                    className="input"
                  >
                    <option value="none">Aucune</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                
                {config.webhookAuthType === 'basic' && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <label className="label">Utilisateur</label>
                      <input
                        type="text"
                        value={config.webhookAuthUser}
                        onChange={(e) => setConfig({ ...config, webhookAuthUser: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPasswords.webhook ? 'text' : 'password'}
                          value={config.webhookAuthPassword}
                          onChange={(e) => setConfig({ ...config, webhookAuthPassword: e.target.value })}
                          className="input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, webhook: !showPasswords.webhook })}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showPasswords.webhook ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section Branding et Textes */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <PaintBrushIcon className="w-4 h-4" />
                  Branding et textes
                </h3>
                
                {/* Logo */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">Logo</label>
                    <input
                      type="checkbox"
                      checked={config.toggleBrandLogo}
                      onChange={(e) => setConfig({ ...config, toggleBrandLogo: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </div>
                  {config.toggleBrandLogo && (
                    <input
                      type="url"
                      value={config.brandLogo}
                      onChange={(e) => setConfig({ ...config, brandLogo: e.target.value })}
                      className="input"
                      placeholder="https://exemple.com/logo.png"
                    />
                  )}
                </div>

                {/* Avatar Bot */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">Avatar du bot</label>
                    <input
                      type="checkbox"
                      checked={config.toggleBrandBotAvatar}
                      onChange={(e) => setConfig({ ...config, toggleBrandBotAvatar: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </div>
                  {config.toggleBrandBotAvatar && (
                    <input
                      type="url"
                      value={config.brandBotAvatar}
                      onChange={(e) => setConfig({ ...config, brandBotAvatar: e.target.value })}
                      className="input"
                      placeholder="https://exemple.com/avatar.png"
                    />
                  )}
                </div>

                {/* Nom et texte de bienvenue */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Nom du bot</label>
                      <input
                        type="checkbox"
                        checked={config.toggleBrandName}
                        onChange={(e) => setConfig({ ...config, toggleBrandName: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleBrandName && (
                      <input
                        type="text"
                        value={config.brandName}
                        onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Texte de bienvenue</label>
                      <input
                        type="checkbox"
                        checked={config.toggleBrandWelcomeText}
                        onChange={(e) => setConfig({ ...config, toggleBrandWelcomeText: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleBrandWelcomeText && (
                      <input
                        type="text"
                        value={config.brandWelcomeText}
                        onChange={(e) => setConfig({ ...config, brandWelcomeText: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                </div>

                {/* Texte réponse et bouton CTA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Texte de réponse</label>
                      <input
                        type="checkbox"
                        checked={config.toggleBrandResponseText}
                        onChange={(e) => setConfig({ ...config, toggleBrandResponseText: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleBrandResponseText && (
                      <input
                        type="text"
                        value={config.brandResponseText}
                        onChange={(e) => setConfig({ ...config, brandResponseText: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Bouton CTA</label>
                      <input
                        type="checkbox"
                        checked={config.toggleCtaButtonLabel}
                        onChange={(e) => setConfig({ ...config, toggleCtaButtonLabel: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleCtaButtonLabel && (
                      <input
                        type="text"
                        value={config.ctaButtonLabel}
                        onChange={(e) => setConfig({ ...config, ctaButtonLabel: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Message d'accueil</label>
                      <input
                        type="checkbox"
                        checked={config.toggleBrandGreetingMessage}
                        onChange={(e) => setConfig({ ...config, toggleBrandGreetingMessage: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleBrandGreetingMessage && (
                      <>
                        <textarea
                          value={config.brandGreetingMessage}
                          onChange={(e) => setConfig({ ...config, brandGreetingMessage: e.target.value })}
                          className="input"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500">
                          Variables : <code className="bg-gray-100 px-1 rounded">{'{{firstName}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{lastName}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{fullName}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{email}}'}</code>
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Message de prompt</label>
                      <input
                        type="checkbox"
                        checked={config.toggleBrandPromptMessage}
                        onChange={(e) => setConfig({ ...config, toggleBrandPromptMessage: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleBrandPromptMessage && (
                      <textarea
                        value={config.brandPromptMessage}
                        onChange={(e) => setConfig({ ...config, brandPromptMessage: e.target.value })}
                        className="input"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Placeholder et bouton */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Placeholder</label>
                      <input
                        type="checkbox"
                        checked={config.toggleChatPlaceholder}
                        onChange={(e) => setConfig({ ...config, toggleChatPlaceholder: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleChatPlaceholder && (
                      <input
                        type="text"
                        value={config.chatPlaceholder}
                        onChange={(e) => setConfig({ ...config, chatPlaceholder: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 font-medium text-sm">Bouton envoyer</label>
                      <input
                        type="checkbox"
                        checked={config.toggleChatButtonLabel}
                        onChange={(e) => setConfig({ ...config, toggleChatButtonLabel: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                    </div>
                    {config.toggleChatButtonLabel && (
                      <input
                        type="text"
                        value={config.chatButtonLabel}
                        onChange={(e) => setConfig({ ...config, chatButtonLabel: e.target.value })}
                        className="input"
                      />
                    )}
                  </div>
                </div>

                {/* Info et Powered by */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">Texte d'information</label>
                    <input
                      type="checkbox"
                      checked={config.toggleInfoText}
                      onChange={(e) => setConfig({ ...config, toggleInfoText: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </div>
                  {config.toggleInfoText && (
                    <input
                      type="text"
                      value={config.infoText}
                      onChange={(e) => setConfig({ ...config, infoText: e.target.value })}
                      className="input"
                    />
                  )}
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">Powered by</label>
                    <input
                      type="checkbox"
                      checked={config.toggleBrandPowered}
                      onChange={(e) => setConfig({ ...config, toggleBrandPowered: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </div>
                  {config.toggleBrandPowered && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={config.brandPoweredText}
                        onChange={(e) => setConfig({ ...config, brandPoweredText: e.target.value })}
                        className="input"
                        placeholder="Texte"
                      />
                      <input
                        type="url"
                        value={config.brandPoweredLink}
                        onChange={(e) => setConfig({ ...config, brandPoweredLink: e.target.value })}
                        className="input"
                        placeholder="Lien (optionnel)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section Couleurs */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <SwatchIcon className="w-4 h-4" />
                  Couleurs
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {colorFields.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 p-2 border rounded-lg">
                      <input
                        type="color"
                        value={config[key]}
                        onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
                        <p className="text-xs text-gray-500 font-mono">{config[key]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Style du bouton */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Style du bouton</h3>
                <p className="text-sm text-gray-500">Le bouton ChatBot sera affiché en bas à droite de l'écran</p>
                
                <div>
                  <label className="label">Forme du bouton</label>
                  <select
                    value={config.styleToggleShape}
                    onChange={(e) => setConfig({ ...config, styleToggleShape: e.target.value })}
                    className="input"
                  >
                    <option value="circle">Cercle</option>
                    <option value="rounded">Arrondi</option>
                    <option value="square">Carré</option>
                  </select>
                </div>

                <div>
                  <label className="label">Icône personnalisée (optionnel)</label>
                  <input
                    type="url"
                    value={config.styleToggleIcon}
                    onChange={(e) => setConfig({ ...config, styleToggleIcon: e.target.value })}
                    className="input"
                    placeholder="https://exemple.com/icon.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG ou SVG carré (60x60 recommandé)</p>
                </div>
              </div>
            </>
          )}

          {/* Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              Information
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              Ce widget ChatBot utilise n8n comme backend pour traiter les messages. 
              Assurez-vous d'avoir configuré votre workflow n8n avec un webhook pour recevoir les messages.
            </p>
          </div>
        </div>

        {/* Aperçu en direct */}
        {previewOpen && (
          <div className="sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto">
            <div className="bg-white border rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 sticky top-0 z-10">
                <h3 className="text-white font-medium">Aperçu du ChatBot</h3>
                <p className="text-primary-100 text-sm">Prévisualisation en temps réel</p>
              </div>
              
              <div className="p-4 bg-gray-100 min-h-[600px] relative">
                {/* Indicateur d'état */}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-gray-500">{config.enabled ? 'Activé' : 'Désactivé'}</span>
                </div>

                {/* Bouton flottant en bas à droite */}
                <div className="absolute bottom-4 right-4">
                  <button
                    className="w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                    style={{
                      backgroundColor: config.styleToggleBackground,
                      borderRadius: config.styleToggleShape === 'circle' ? '50%' : config.styleToggleShape === 'rounded' ? '12px' : '4px'
                    }}
                  >
                    {config.styleToggleIcon ? (
                      <img src={config.styleToggleIcon} alt="" className="w-8 h-8" />
                    ) : (
                      <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
                    )}
                  </button>
                </div>

                {/* Fenêtre de chat simulée */}
                <div 
                  className="absolute bottom-20 right-4 w-80 rounded-xl shadow-2xl overflow-hidden"
                  style={{ backgroundColor: config.styleBackgroundColor }}
                >
                  {/* Header */}
                  <div 
                    className="p-4"
                    style={{ background: `linear-gradient(135deg, ${config.stylePrimaryColor} 0%, ${config.styleSecondaryColor} 100%)` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {config.toggleBrandLogo && config.brandLogo && (
                          <img src={config.brandLogo} alt="" className="w-10 h-10 rounded-lg bg-white/20 p-1" />
                        )}
                        <div className="text-white">
                          {config.toggleBrandName && <h4 className="font-semibold">{config.brandName}</h4>}
                          {config.toggleBrandWelcomeText && <p className="text-sm opacity-90">{config.brandWelcomeText}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {config.featureFullscreen && (
                          <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                        )}
                        {config.featureCloseButton && (
                          <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {config.toggleBrandResponseText && (
                      <p className="text-white/70 text-xs mt-2">{config.brandResponseText}</p>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 min-h-[200px]" style={{ color: config.styleFontColor }}>
                    {config.toggleBrandGreetingMessage && config.brandGreetingMessage && (
                      <div className="flex gap-2">
                        {config.toggleBrandBotAvatar && config.brandBotAvatar && (
                          <img src={config.brandBotAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        )}
                        <div 
                          className="rounded-lg p-3 max-w-[80%]"
                          style={{ backgroundColor: config.styleBotMessageBg, color: config.styleBotMessageText }}
                        >
                          <p className="text-sm">{config.brandGreetingMessage}</p>
                        </div>
                      </div>
                    )}
                    
                    {config.toggleBrandPromptMessage && config.brandPromptMessage && (
                      <div className="flex gap-2">
                        {config.toggleBrandBotAvatar && config.brandBotAvatar && (
                          <img src={config.brandBotAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                        )}
                        <div 
                          className="rounded-lg p-3 max-w-[80%]"
                          style={{ backgroundColor: config.styleBotMessageBg, color: config.styleBotMessageText }}
                        >
                          <p className="text-sm">{config.brandPromptMessage}</p>
                        </div>
                      </div>
                    )}

                    {/* Message utilisateur exemple */}
                    <div className="flex justify-end">
                      <div 
                        className="rounded-lg p-3 max-w-[80%]"
                        style={{ backgroundColor: config.styleUserMessageBg, color: config.styleUserMessageText }}
                      >
                        <p className="text-sm">Bonjour !</p>
                      </div>
                    </div>

                    {/* Réponse bot exemple */}
                    <div className="flex gap-2">
                      {config.toggleBrandBotAvatar && config.brandBotAvatar && (
                        <img src={config.brandBotAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      )}
                      <div 
                        className="rounded-lg p-3 max-w-[80%]"
                        style={{ backgroundColor: config.styleBotMessageBg, color: config.styleBotMessageText }}
                      >
                        <p className="text-sm">Bonjour ! Comment puis-je vous aider ?</p>
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t" style={{ borderColor: config.styleBotMessageBg }}>
                    {config.toggleInfoText && config.infoText && (
                      <p className="text-xs text-gray-500 mb-2 text-center">{config.infoText}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={config.toggleChatPlaceholder ? config.chatPlaceholder : ''}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        style={{ borderColor: config.stylePrimaryColor + '40' }}
                        disabled
                      />
                      <button
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: config.stylePrimaryColor }}
                      >
                        {config.toggleChatButtonLabel ? config.chatButtonLabel : 'Envoyer'}
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  {config.toggleBrandPowered && config.brandPoweredText && (
                    <div className="px-3 py-2 bg-gray-50 text-center">
                      <p className="text-xs text-gray-500">
                        {config.brandPoweredLink ? (
                          <a href={config.brandPoweredLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {config.brandPoweredText}
                          </a>
                        ) : config.brandPoweredText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bouton CTA (si activé) */}
                {config.toggleCtaButtonLabel && config.ctaButtonLabel && (
                  <div className="absolute bottom-4 left-4">
                    <button
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg"
                      style={{ backgroundColor: config.stylePrimaryColor }}
                    >
                      {config.ctaButtonLabel}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant OCR Settings
function OCRSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [testFile, setTestFile] = useState(null);
  const [testResult, setTestResult] = useState(null);
  
  const [config, setConfig] = useState({
    enabled: true,
    language: 'fra',
    confidenceThreshold: 60,
    maxPages: 50,
    autoProcess: true,
    preserveLayout: false,
    deskew: true,
    cleanText: true
  });

  // Liste des langues OCR
  const languages = [
    { code: 'fra', name: 'Français', flag: '🇫🇷' },
    { code: 'eng', name: 'Anglais', flag: '🇬🇧' },
    { code: 'deu', name: 'Allemand', flag: '🇩🇪' },
    { code: 'spa', name: 'Espagnol', flag: '🇪🇸' },
    { code: 'ita', name: 'Italien', flag: '🇮🇹' },
    { code: 'por', name: 'Portugais', flag: '🇵🇹' },
    { code: 'nld', name: 'Néerlandais', flag: '🇳🇱' },
    { code: 'pol', name: 'Polonais', flag: '🇵🇱' },
    { code: 'rus', name: 'Russe', flag: '🇷🇺' },
    { code: 'ara', name: 'Arabe', flag: '🇸🇦' },
    { code: 'chi_sim', name: 'Chinois simplifié', flag: '🇨🇳' },
    { code: 'jpn', name: 'Japonais', flag: '🇯🇵' },
    { code: 'kor', name: 'Coréen', flag: '🇰🇷' },
    { code: 'fra+eng', name: 'Français + Anglais', flag: '🇫🇷🇬🇧' },
    { code: 'fra+deu', name: 'Français + Allemand', flag: '🇫🇷🇩🇪' }
  ];

  // Charger la configuration
  const { data: configData, isLoading } = useQuery({
    queryKey: ['ocr-config'],
    queryFn: async () => {
      const response = await settingsAPI.getOCRConfig();
      return response.data.data;
    }
  });

  // Initialiser avec les données
  useEffect(() => {
    if (configData) {
      setConfig({
        enabled: configData.enabled ?? true,
        language: configData.language || 'fra',
        confidenceThreshold: configData.confidenceThreshold || 60,
        maxPages: configData.maxPages || 50,
        autoProcess: configData.autoProcess ?? true,
        preserveLayout: configData.preserveLayout ?? false,
        deskew: configData.deskew ?? true,
        cleanText: configData.cleanText ?? true
      });
    }
  }, [configData]);

  // Sauvegarder la configuration
  const saveMutation = useMutation({
    mutationFn: (data) => settingsAPI.saveOCRConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ocr-config']);
      toast.success('Configuration OCR enregistrée');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde')
  });

  // Tester l'OCR
  const testMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await settingsAPI.testOCR(formData);
      return response.data.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast.success(`OCR terminé en ${data.processingTime}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors du test OCR');
      setTestResult(null);
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestFile(file);
      setTestResult(null);
    }
  };

  const handleTest = () => {
    if (!testFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('language', config.language);
    testMutation.mutate(formData);
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentMagnifyingGlassIcon className="w-5 h-5" />
          Configuration OCR (Reconnaissance de texte)
        </h2>
        <button
          onClick={handleSave}
          disabled={saveMutation.isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {saveMutation.isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistrer
            </>
          )}
        </button>
      </div>

      {/* Activation */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Activer l'OCR</h3>
            <p className="text-sm text-gray-500 mt-1">
              L'OCR permet d'extraire le texte des documents PDF et images scannés pour la recherche
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Langue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Langue de reconnaissance</label>
              <select
                value={config.language}
                onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
                className="input"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Sélectionnez la langue principale de vos documents
              </p>
            </div>

            <div>
              <label className="label">Seuil de confiance (%)</label>
              <input
                type="number"
                value={config.confidenceThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) || 60 }))}
                className="input"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Niveau minimum de confiance pour accepter le texte reconnu (60% recommandé)
              </p>
            </div>

            <div>
              <label className="label">Nombre max. de pages</label>
              <input
                type="number"
                value={config.maxPages}
                onChange={(e) => setConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 50 }))}
                className="input"
                min="1"
                max="500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Limite de pages à traiter par document (performance)
              </p>
            </div>
          </div>

          {/* Options avancées */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Options avancées</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoProcess}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoProcess: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-gray-700">Traitement automatique</span>
                  <p className="text-xs text-gray-500">Extraire le texte automatiquement à l'import</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.deskew}
                  onChange={(e) => setConfig(prev => ({ ...prev, deskew: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-gray-700">Redresser les documents</span>
                  <p className="text-xs text-gray-500">Corriger l'inclinaison des scans</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cleanText}
                  onChange={(e) => setConfig(prev => ({ ...prev, cleanText: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-gray-700">Nettoyer le texte</span>
                  <p className="text-xs text-gray-500">Supprimer les caractères parasites</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.preserveLayout}
                  onChange={(e) => setConfig(prev => ({ ...prev, preserveLayout: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-gray-700">Préserver la mise en page</span>
                  <p className="text-xs text-gray-500">Conserver les sauts de ligne et espaces</p>
                </div>
              </label>
            </div>
          </div>

          {/* Test OCR */}
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <PlayIcon className="w-5 h-5" />
              Tester l'OCR
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                  {testFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <DocumentTextIcon className="w-5 h-5 text-primary-600" />
                      <span className="text-gray-700">{testFile.name}</span>
                      <span className="text-gray-400 text-sm">({(testFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <DocumentTextIcon className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Cliquez pour sélectionner un fichier PDF ou image</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleTest}
                disabled={!testFile || testMutation.isLoading}
                className="btn-primary h-fit self-end flex items-center gap-2"
              >
                {testMutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    Lancer le test
                  </>
                )}
              </button>
            </div>

            {/* Résultat du test */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    ✓ {testResult.method}
                  </span>
                  <span className="text-gray-500">
                    Temps: {testResult.processingTime}
                  </span>
                  <span className="text-gray-500">
                    {testResult.wordCount} mots
                  </span>
                  <span className="text-gray-500">
                    {testResult.charCount} caractères
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Texte extrait :</h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                    {testResult.text || '(Aucun texte extrait)'}
                  </pre>
                  {testResult.truncated && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Texte tronqué ({testResult.fullLength} caractères au total)
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              Information
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              L'OCR utilise Tesseract.js pour la reconnaissance de texte. Pour de meilleures performances 
              sur les PDF scannés, il est recommandé d'utiliser des documents de bonne qualité (300 DPI minimum).
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswords, setShowPasswords] = useState({});
  const logoInputRef = useRef(null);
  const { appName, appVersion, appLogo, footerText, footerVisible, fetchBranding, updateBranding } = useBrandingStore();
  
  // États pour l'onglet Apparence
  const [brandingForm, setBrandingForm] = useState({
    appName: appName,
    appVersion: appVersion,
    footerText: footerText,
    footerVisible: footerVisible
  });
  const [logoPreview, setLogoPreview] = useState(appLogo ? `/uploads/${appLogo}` : null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsAPI.getAll();
      return response.data.data;
    }
  });

  const [formData, setFormData] = useState({
    smtp: { host: '', port: 587, user: '', password: '', from: '', fromName: '', secure: false },
    ldap: { server: '', baseDn: '', bindDn: '', bindPassword: '', userFilter: '', groupFilter: '' },
    ldapBackup: { server: '', port: 389, baseDN: '', bindDN: '', bindPassword: '', useTLS: false },
    kerberos: { realm: '', kdc: '', adminServer: '' },
    imap: { 
      host: '', 
      port: 993, 
      user: '', 
      password: '', 
      tls: true,
      mailbox: 'INBOX',
      checkInterval: 5,
      enabled: false,
      autoImport: true,
      filterDomains: '',
      filterEmails: '',
      filterSubjectKeywords: '',
      filterBodyKeywords: '',
      processedFolder: 'Traités',
      markAsRead: true,
      deleteAfterProcess: false,
      processAllMails: false
    },
    database: { host: 'localhost', port: 27017, name: 'ged_courrier' },
    general: { sessionTimeout: 30, maxFileSize: 10, allowedExtensions: 'pdf,doc,docx,xls,xlsx' }
  });

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings && Array.isArray(settings)) {
      const newFormData = { ...formData };
      
      settings.forEach(setting => {
        const [category, ...keyParts] = setting.key.split('_');
        const key = keyParts.join('_');
        
        if (newFormData[category] && key) {
          // Convertir les valeurs appropriées
          let value = setting.value;
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(value) && value !== '') value = Number(value);
          
          newFormData[category][key] = value;
        }
      });
      
      setFormData(newFormData);
    }
  }, [settings]);
  
  // Mettre à jour brandingForm quand les données du store changent
  useEffect(() => {
    setBrandingForm({
      appName,
      appVersion,
      footerText,
      footerVisible
    });
    setLogoPreview(appLogo ? `/uploads/${appLogo}` : null);
  }, [appName, appVersion, footerText, footerVisible, appLogo]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Convertir formData en tableau de paramètres pour updateMany
      const settingsArray = [];
      
      // SMTP
      if (data.smtp) {
        Object.entries(data.smtp).forEach(([key, value]) => {
          settingsArray.push({
            key: `smtp_${key}`,
            value: String(value),
            category: 'smtp',
            isSecret: key === 'password'
          });
        });
      }
      
      // LDAP
      if (data.ldap) {
        Object.entries(data.ldap).forEach(([key, value]) => {
          settingsArray.push({
            key: `ldap_${key}`,
            value: String(value),
            category: 'ldap',
            isSecret: key === 'bindPassword'
          });
        });
      }

      // LDAP de secours (failover)
      if (data.ldapBackup) {
        Object.entries(data.ldapBackup).forEach(([key, value]) => {
          settingsArray.push({
            key: `ldapBackup_${key}`,
            value: String(value),
            category: 'ldap',
            isSecret: key === 'bindPassword'
          });
        });
      }

      // Kerberos
      if (data.kerberos) {
        Object.entries(data.kerberos).forEach(([key, value]) => {
          settingsArray.push({
            key: `kerberos_${key}`,
            value: String(value),
            category: 'kerberos'
          });
        });
      }
      
      // IMAP
      if (data.imap) {
        Object.entries(data.imap).forEach(([key, value]) => {
          settingsArray.push({
            key: `imap_${key}`,
            value: String(value),
            category: 'imap',
            isSecret: key === 'password'
          });
        });
      }
      
      // Database
      if (data.database) {
        Object.entries(data.database).forEach(([key, value]) => {
          settingsArray.push({
            key: `database_${key}`,
            value: String(value),
            category: 'database'
          });
        });
      }
      
      // General
      if (data.general) {
        Object.entries(data.general).forEach(([key, value]) => {
          settingsArray.push({
            key: `general_${key}`,
            value: String(value),
            category: 'general'
          });
        });
      }
      
      return settingsAPI.updateMany(settingsArray);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      toast.success('Paramètres enregistrés');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  });
  
  // Mutation pour sauvegarder les paramètres de branding
  const brandingMutation = useMutation({
    mutationFn: async (data) => {
      const settings = [
        { key: 'app_name', value: data.appName, category: 'appearance' },
        { key: 'app_version', value: data.appVersion, category: 'appearance' },
        { key: 'footer_text', value: data.footerText, category: 'appearance' },
        { key: 'footer_visible', value: String(data.footerVisible), category: 'appearance' }
      ];
      return settingsAPI.updateMany(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      updateBranding(brandingForm);
      fetchBranding();
    }
  });
  
  // Mutation pour upload du logo
  const logoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('logo', file);
      return settingsAPI.uploadLogo(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      fetchBranding();
    }
  });
  
  // Mutation pour supprimer le logo
  const logoDeleteMutation = useMutation({
    mutationFn: () => settingsAPI.deleteLogo(),
    onSuccess: () => {
      setLogoPreview(null);
      queryClient.invalidateQueries(['settings']);
      fetchBranding();
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (type) => {
      if (type === 'imap') {
        return settingsAPI.testIMAP(formData.imap);
      }
      if (type === 'ldap') {
        return settingsAPI.testLDAP(formData.ldap);
      }
      if (type === 'ldapBackup') {
        return settingsAPI.testLDAP(formData.ldapBackup);
      }
      if (type === 'smtp') {
        return settingsAPI.testSMTP(formData.smtp);
      }
      return settingsAPI.testConnection(type);
    },
    onSuccess: (response, type) => {
      if (response.data?.success) {
        toast.success(response.data.message || 'Connexion réussie');
        // Si le test IMAP retourne des dossiers, les stocker
        if (type === 'imap' && response.data.folders) {
          setImapFolders(response.data.folders);
        }
      } else {
        toast.error(response.data?.message || 'Erreur de connexion');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    }
  });

  // État pour stocker les groupes AD/LDAP disponibles (serveur principal et de secours)
  const [ldapGroups, setLdapGroups] = useState([]);
  const [ldapBackupGroups, setLdapBackupGroups] = useState([]);

  // Mutation pour lister les groupes AD/LDAP (target: 'ldap' ou 'ldapBackup')
  const loadLdapGroupsMutation = useMutation({
    mutationFn: (target = 'ldap') => settingsAPI.getLDAPGroups(formData[target]),
    onSuccess: (response, target = 'ldap') => {
      if (response.data?.success) {
        const groups = response.data.groups || [];
        if (target === 'ldapBackup') {
          setLdapBackupGroups(groups);
        } else {
          setLdapGroups(groups);
        }
        toast.success(`${groups.length} groupe(s) trouvé(s)`);
      } else {
        toast.error(response.data?.message || 'Impossible de récupérer les groupes');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur de connexion LDAP');
    }
  });

  const copyLdapGroupDN = (dn) => {
    navigator.clipboard.writeText(dn);
    toast.success('DN copié');
  };

  // État pour stocker les dossiers IMAP disponibles
  const [imapFolders, setImapFolders] = useState([]);
  const [loadingImapFolders, setLoadingImapFolders] = useState(false);

  // Mutation pour charger les dossiers IMAP
  const loadImapFoldersMutation = useMutation({
    mutationFn: async () => {
      setLoadingImapFolders(true);
      return settingsAPI.testIMAP(formData.imap);
    },
    onSuccess: (response) => {
      setLoadingImapFolders(false);
      if (response.data?.success && response.data?.folders) {
        setImapFolders(response.data.folders);
        toast.success(`${response.data.folders.length} dossier(s) trouvé(s)`);
      } else {
        toast.error('Impossible de récupérer les dossiers');
      }
    },
    onError: (error) => {
      setLoadingImapFolders(false);
      toast.error(error.response?.data?.message || 'Erreur de connexion IMAP');
    }
  });

  // État pour basculer en mode saisie manuelle pour le dossier de destination
  const [manualProcessedFolder, setManualProcessedFolder] = useState(false);

  // États pour le test SMTP
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [smtpTestTemplate, setSmtpTestTemplate] = useState('');

  // Récupérer les templates pour le test SMTP
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates-select'],
    queryFn: async () => {
      const response = await emailTemplatesAPI.getAll();
      return response.data.data;
    },
    enabled: activeTab === 'smtp' || activeTab === 'email-templates'
  });

  // Récupérer les actions disponibles pour les templates
  const { data: templateActions } = useQuery({
    queryKey: ['email-template-actions'],
    queryFn: async () => {
      const response = await emailTemplatesAPI.getActions();
      return response.data.data;
    },
    enabled: activeTab === 'email-templates'
  });

  // États pour l'édition de template
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templatePreview, setTemplatePreview] = useState(null);

  // Mutation suppression template
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => emailTemplatesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates-select']);
      toast.success('Modèle supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  // Mutation toggle template
  const toggleTemplateMutation = useMutation({
    mutationFn: (id) => emailTemplatesAPI.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates-select']);
    }
  });

  // Preview template
  const handleTemplatePreview = async (template) => {
    try {
      const response = await emailTemplatesAPI.preview(template._id);
      setTemplatePreview({ template, content: response.data.data });
    } catch (error) {
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const getActionLabel = (actionId) => {
    return templateActions?.find(a => a.id === actionId)?.label || actionId;
  };

  // Grouper les templates par action
  const groupedTemplates = emailTemplates?.reduce((acc, template) => {
    if (!acc[template.action]) {
      acc[template.action] = [];
    }
    acc[template.action].push(template);
    return acc;
  }, {}) || {};

  // Mutation pour le test SMTP
  const smtpTestMutation = useMutation({
    mutationFn: (data) => settingsAPI.testSMTP(data),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Email de test envoyé !');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    }
  });

  // ============ WEBHOOKS ============
  // États pour les webhooks
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    description: '',
    events: [],
    authType: 'none',
    secret: '',
    authUsername: '',
    authPassword: '',
    isActive: true,
    retryOnFailure: true,
    maxRetries: 3,
    timeoutMs: 30000
  });

  // Query pour récupérer les webhooks
  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const response = await webhooksAPI.getAll();
      return response.data.data;
    },
    enabled: activeTab === 'webhooks'
  });

  // Query pour récupérer les événements disponibles
  const { data: webhookEvents } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const response = await webhooksAPI.getEvents();
      return response.data.data;
    },
    enabled: activeTab === 'webhooks'
  });

  // Mutation création webhook
  const createWebhookMutation = useMutation({
    mutationFn: (data) => webhooksAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setShowWebhookModal(false);
      resetWebhookForm();
      toast.success('Webhook créé');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  });

  // Mutation modification webhook
  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, data }) => webhooksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setShowWebhookModal(false);
      resetWebhookForm();
      toast.success('Webhook mis à jour');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification');
    }
  });

  // Mutation suppression webhook
  const deleteWebhookMutation = useMutation({
    mutationFn: (id) => webhooksAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      toast.success('Webhook supprimé');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });

  // Mutation toggle webhook
  const toggleWebhookMutation = useMutation({
    mutationFn: (id) => webhooksAPI.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  });

  // Mutation test webhook
  const testWebhookMutation = useMutation({
    mutationFn: (id) => webhooksAPI.test(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['webhooks']);
      toast.success(response.data.message || 'Test réussi !');
    },
    onError: (error) => {
      queryClient.invalidateQueries(['webhooks']);
      toast.error(error.response?.data?.message || 'Erreur lors du test');
    }
  });

  // Mutation reset stats webhook
  const resetWebhookStatsMutation = useMutation({
    mutationFn: (id) => webhooksAPI.resetStats(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      toast.success('Statistiques réinitialisées');
    }
  });

  const resetWebhookForm = () => {
    setWebhookForm({
      name: '',
      url: '',
      description: '',
      events: [],
      authType: 'none',
      secret: '',
      authUsername: '',
      authPassword: '',
      isActive: true,
      retryOnFailure: true,
      maxRetries: 3,
      timeoutMs: 30000
    });
    setEditingWebhook(null);
  };

  const handleEditWebhook = (webhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      description: webhook.description || '',
      events: webhook.events || [],
      authType: webhook.authType || 'none',
      secret: webhook.secret || '',
      authUsername: webhook.authUsername || '',
      authPassword: webhook.authPassword || '',
      isActive: webhook.isActive,
      retryOnFailure: webhook.retryOnFailure,
      maxRetries: webhook.maxRetries || 3,
      timeoutMs: webhook.timeoutMs || 30000
    });
    setShowWebhookModal(true);
  };

  const handleSaveWebhook = () => {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (editingWebhook) {
      updateWebhookMutation.mutate({ id: editingWebhook._id, data: webhookForm });
    } else {
      createWebhookMutation.mutate(webhookForm);
    }
  };

  const handleWebhookEventToggle = (eventValue) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const getEventCategoryLabel = (category) => {
    const labels = {
      mail: 'Courriers',
      user: 'Utilisateurs',
      pending_mail: 'Courriers en attente'
    };
    return labels[category] || category;
  };
  // ============ FIN WEBHOOKS ============

  const handleSmtpTest = () => {
    if (!smtpTestRecipient) {
      toast.error('Veuillez saisir une adresse email destinataire');
      return;
    }
    if (!formData.smtp?.host) {
      toast.error('Veuillez configurer le serveur SMTP');
      return;
    }
    smtpTestMutation.mutate({
      recipient: smtpTestRecipient,
      templateId: smtpTestTemplate || null,
      smtpConfig: formData.smtp
    });
  };

  const handleChange = (section, key, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  const handleBrandingChange = (key, value) => {
    setBrandingForm(prev => ({ ...prev, [key]: value }));
  };
  
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Upload
      logoUploadMutation.mutate(file);
    }
  };
  
  const handleSaveBranding = () => {
    brandingMutation.mutate(brandingForm);
  };

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-1">
            Configuration de l'application
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={mutation.isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {mutation.isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistrer
            </>
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {mutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Paramètres enregistrés avec succès
        </motion.div>
      )}

      {mutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-danger-50 text-danger-700 rounded-lg"
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          Erreur lors de l'enregistrement des paramètres
        </motion.div>
      )}

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Cog6ToothIcon className="w-5 h-5" />
                  Paramètres généraux
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom de l'application</label>
                    <input
                      type="text"
                      value={formData.general?.appName || 'GED - Gestion de Courrier'}
                      onChange={(e) => handleChange('general', 'appName', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">URL de l'application</label>
                    <input
                      type="url"
                      value={formData.general?.appUrl || ''}
                      onChange={(e) => handleChange('general', 'appUrl', e.target.value)}
                      className="input"
                      placeholder="https://ged.exemple.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Format de référence des courriers</label>
                  <input
                    type="text"
                    value={formData.general?.referenceFormat || 'GED-{YEAR}-{SERVICE}-{NUMBER}'}
                    onChange={(e) => handleChange('general', 'referenceFormat', e.target.value)}
                    className="input"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Variables disponibles: {'{YEAR}'}, {'{MONTH}'}, {'{DAY}'}, {'{SERVICE}'}, {'{NUMBER}'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Délai de traitement par défaut (jours)</label>
                    <input
                      type="number"
                      value={formData.general?.defaultProcessingDelay || 7}
                      onChange={(e) => handleChange('general', 'defaultProcessingDelay', parseInt(e.target.value))}
                      className="input"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="label">Taille max. des fichiers (MB)</label>
                    <input
                      type="number"
                      value={formData.general?.maxFileSize || 10}
                      onChange={(e) => handleChange('general', 'maxFileSize', parseInt(e.target.value))}
                      className="input"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <PaintBrushIcon className="w-5 h-5" />
                    Personnalisation de l'apparence
                  </h2>
                  <button
                    onClick={handleSaveBranding}
                    disabled={brandingMutation.isLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {brandingMutation.isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>

                {brandingMutation.isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Paramètres d'apparence enregistrés avec succès
                  </motion.div>
                )}

                {/* Logo */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="label mb-3">Logo de l'application</label>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <PhotoIcon className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploadMutation.isLoading}
                          className="btn-secondary btn-sm"
                        >
                          {logoUploadMutation.isLoading ? 'Envoi...' : 'Changer le logo'}
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={() => logoDeleteMutation.mutate()}
                            disabled={logoDeleteMutation.isLoading}
                            className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Formats acceptés : PNG, JPG, SVG, WebP. Max 2 Mo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nom et version */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom de l'application</label>
                    <input
                      type="text"
                      value={brandingForm.appName}
                      onChange={(e) => handleBrandingChange('appName', e.target.value)}
                      className="input"
                      placeholder="GED Courrier"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Affiché dans la sidebar et sur la page de connexion
                    </p>
                  </div>
                  <div>
                    <label className="label">Version</label>
                    <input
                      type="text"
                      value={brandingForm.appVersion}
                      onChange={(e) => handleBrandingChange('appVersion', e.target.value)}
                      className="input"
                      placeholder="v1.0.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Affiché sous le nom de l'application
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Pied de page</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="footerVisible"
                        checked={brandingForm.footerVisible}
                        onChange={(e) => handleBrandingChange('footerVisible', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="footerVisible" className="text-sm text-gray-700">
                        Afficher le pied de page
                      </label>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={brandingForm.footerText}
                      onChange={(e) => handleBrandingChange('footerText', e.target.value)}
                      className="input"
                      placeholder="Fait avec ❤️ par le Service Informatique de Pavilly"
                      disabled={!brandingForm.footerVisible}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Texte affiché en bas de page. Vous pouvez utiliser des emojis.
                    </p>
                  </div>
                </div>

                {/* Aperçu */}
                <div className="p-4 border rounded-lg">
                  <label className="label mb-3">Aperçu</label>
                  <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-10 h-10 rounded-xl object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="currentColor">
                          <rect x="10" y="15" width="80" height="70" rx="5" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{brandingForm.appName || 'GED Courrier'}</h3>
                      <p className="text-xs text-gray-500">{brandingForm.appVersion || 'v1.0.0'}</p>
                    </div>
                  </div>
                  {brandingForm.footerVisible && (
                    <div className="mt-3 pt-3 border-t text-center text-sm text-gray-500">
                      {brandingForm.footerText || 'Fait avec ❤️ par le Service Informatique de Pavilly'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OCR Settings */}
            {activeTab === 'ocr' && (
              <OCRSettings />
            )}

            {/* ChatBot Settings */}
            {activeTab === 'chatbot' && (
              <ChatBotSettings />
            )}

            {/* Notifications defaults */}
            {activeTab === 'notifications' && (
              <NotificationDefaultsSettings />
            )}

            {/* Email Templates */}
            {activeTab === 'email-templates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" />
                    Modèles de mail
                  </h2>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Nouveau modèle
                  </button>
                </div>

                {Object.keys(groupedTemplates).length === 0 ? (
                  <div className="text-center py-12">
                    <EnvelopeIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun modèle</h3>
                    <p className="text-gray-500 mb-4">Créez votre premier modèle de mail</p>
                    <button
                      onClick={() => {
                        setEditingTemplate(null);
                        setShowTemplateModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Créer un modèle
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedTemplates).map(([action, templates]) => (
                      <div key={action} className="border rounded-lg overflow-hidden">
                        <div className="p-3 bg-gray-50 border-b">
                          <h3 className="font-medium text-gray-900">
                            {getActionLabel(action)}
                          </h3>
                        </div>
                        <div className="divide-y">
                          {templates.map((template) => (
                            <div
                              key={template._id}
                              className="p-4 flex items-center justify-between hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    template.isActive ? 'bg-success-500' : 'bg-gray-300'
                                  }`}
                                />
                                <div>
                                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                                  <p className="text-sm text-gray-500">{template.subject}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleTemplateMutation.mutate(template._id)}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    template.isActive
                                      ? 'bg-success-100 text-success-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {template.isActive ? 'Actif' : 'Inactif'}
                                </button>
                                <button
                                  onClick={() => handleTemplatePreview(template)}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  title="Prévisualiser"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTemplate(template);
                                    setShowTemplateModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  title="Modifier"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Supprimer le modèle "${template.name}" ?`)) {
                                      deleteTemplateMutation.mutate(template._id);
                                    }
                                  }}
                                  className="p-1.5 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded"
                                  title="Supprimer"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Modal */}
                {templatePreview && (
                  <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setTemplatePreview(null)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                          <div>
                            <h3 className="font-semibold text-gray-900">Aperçu: {templatePreview.template.name}</h3>
                            <p className="text-sm text-gray-500">Sujet: {templatePreview.content.subject}</p>
                          </div>
                          <button onClick={() => setTemplatePreview(null)} className="btn-icon">
                            <XMarkIcon className="w-6 h-6" />
                          </button>
                        </div>
                        <div className="overflow-auto max-h-[70vh] bg-gray-100 p-4">
                          <div className="bg-white rounded-lg shadow-sm mx-auto max-w-2xl">
                            <iframe
                              srcDoc={templatePreview.content.html}
                              className="w-full h-[500px] border-0"
                              title="Aperçu"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Template Edit Modal */}
                {showTemplateModal && (
                  <TemplateEditModal
                    template={editingTemplate}
                    actions={templateActions}
                    onClose={() => {
                      setShowTemplateModal(false);
                      setEditingTemplate(null);
                    }}
                    onSuccess={() => {
                      queryClient.invalidateQueries(['email-templates-select']);
                      setShowTemplateModal(false);
                      setEditingTemplate(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* Webhooks */}
            {activeTab === 'webhooks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BoltIcon className="w-5 h-5" />
                    Webhooks
                  </h2>
                  <button
                    onClick={() => {
                      resetWebhookForm();
                      setShowWebhookModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Nouveau webhook
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Les webhooks permettent d'envoyer des notifications HTTP vers des URL externes lorsque certains événements se produisent dans l'application.
                </p>

                {webhooksLoading ? (
                  <LoadingSpinner />
                ) : !webhooks || webhooks.length === 0 ? (
                  <div className="text-center py-12">
                    <BoltIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun webhook</h3>
                    <p className="text-gray-500 mb-4">Créez votre premier webhook pour recevoir des notifications</p>
                    <button
                      onClick={() => {
                        resetWebhookForm();
                        setShowWebhookModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Créer un webhook
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <div
                        key={webhook._id}
                        className={`border rounded-lg overflow-hidden ${
                          webhook.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                                  webhook.isActive
                                    ? webhook.lastStatus === 'success'
                                      ? 'bg-success-500'
                                      : webhook.lastStatus === 'failed'
                                      ? 'bg-danger-500'
                                      : 'bg-primary-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{webhook.name}</h4>
                                <p className="text-sm text-gray-500 font-mono break-all">{webhook.url}</p>
                                {webhook.description && (
                                  <p className="text-sm text-gray-500 mt-1">{webhook.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleWebhookMutation.mutate(webhook._id)}
                                disabled={toggleWebhookMutation.isLoading}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  webhook.isActive
                                    ? 'bg-success-100 text-success-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {webhook.isActive ? 'Actif' : 'Inactif'}
                              </button>
                              <button
                                onClick={() => testWebhookMutation.mutate(webhook._id)}
                                disabled={testWebhookMutation.isLoading}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                title="Tester"
                              >
                                <PlayIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditWebhook(webhook)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="Modifier"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Supprimer le webhook "${webhook.name}" ?`)) {
                                    deleteWebhookMutation.mutate(webhook._id);
                                  }
                                }}
                                className="p-1.5 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded"
                                title="Supprimer"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Événements */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <span
                                key={event}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {event}
                              </span>
                            ))}
                          </div>

                          {/* Statistiques */}
                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <SignalIcon className="w-3 h-3" />
                              {webhook.totalCalls} appels
                            </span>
                            <span className="text-success-600">{webhook.successfulCalls} réussis</span>
                            <span className="text-danger-600">{webhook.failedCalls} échoués</span>
                            {webhook.lastTriggeredAt && (
                              <span>
                                Dernier appel: {new Date(webhook.lastTriggeredAt).toLocaleString('fr-FR')}
                              </span>
                            )}
                            {webhook.totalCalls > 0 && (
                              <button
                                onClick={() => resetWebhookStatsMutation.mutate(webhook._id)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Réinitialiser les statistiques"
                              >
                                <ArrowPathIcon className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Dernière erreur */}
                          {webhook.lastStatus === 'failed' && webhook.lastError && (
                            <div className="mt-2 p-2 bg-danger-50 rounded text-xs text-danger-700">
                              <span className="font-medium">Dernière erreur:</span> {webhook.lastError}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Webhook Edit Modal */}
                {showWebhookModal && (
                  <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWebhookModal(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                          <h3 className="font-semibold text-gray-900">
                            {editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}
                          </h3>
                          <button onClick={() => setShowWebhookModal(false)} className="btn-icon">
                            <XMarkIcon className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="p-6 overflow-auto max-h-[70vh] space-y-4">
                          <div>
                            <label className="label">Nom *</label>
                            <input
                              type="text"
                              value={webhookForm.name}
                              onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                              className="input"
                              placeholder="Mon webhook"
                            />
                          </div>

                          <div>
                            <label className="label">URL *</label>
                            <input
                              type="url"
                              value={webhookForm.url}
                              onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                              className="input font-mono text-sm"
                              placeholder="https://exemple.com/webhook"
                            />
                          </div>

                          <div>
                            <label className="label">Description</label>
                            <textarea
                              value={webhookForm.description}
                              onChange={(e) => setWebhookForm(prev => ({ ...prev, description: e.target.value }))}
                              className="input"
                              rows={2}
                              placeholder="Description optionnelle"
                            />
                          </div>

                          <div>
                            <label className="label">Authentification</label>
                            <select
                              value={webhookForm.authType}
                              onChange={(e) => setWebhookForm(prev => ({ ...prev, authType: e.target.value }))}
                              className="input"
                            >
                              <option value="none">Aucune</option>
                              <option value="hmac">Signature HMAC-SHA256</option>
                              <option value="basic">Basic Auth (utilisateur/mot de passe)</option>
                            </select>
                          </div>

                          {webhookForm.authType === 'hmac' && (
                            <div>
                              <label className="label">Secret (HMAC-SHA256)</label>
                              <input
                                type="text"
                                value={webhookForm.secret}
                                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                                className="input font-mono text-sm"
                                placeholder="Secret pour signer les requêtes"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Un header X-Webhook-Signature sera ajouté aux requêtes
                              </p>
                            </div>
                          )}

                          {webhookForm.authType === 'basic' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="label">Utilisateur</label>
                                <input
                                  type="text"
                                  value={webhookForm.authUsername}
                                  onChange={(e) => setWebhookForm(prev => ({ ...prev, authUsername: e.target.value }))}
                                  className="input"
                                  placeholder="Nom d'utilisateur"
                                />
                              </div>
                              <div>
                                <label className="label">Mot de passe</label>
                                <input
                                  type="password"
                                  value={webhookForm.authPassword}
                                  onChange={(e) => setWebhookForm(prev => ({ ...prev, authPassword: e.target.value }))}
                                  className="input"
                                  placeholder="Mot de passe"
                                />
                              </div>
                              <p className="col-span-2 text-xs text-gray-500">
                                Un header Authorization: Basic sera ajouté aux requêtes
                              </p>
                            </div>
                          )}

                          <div>
                            <label className="label">Événements *</label>
                            <div className="border rounded-lg divide-y max-h-60 overflow-auto">
                              {webhookEvents?.grouped && Object.entries(webhookEvents.grouped).map(([category, events]) => (
                                <div key={category} className="p-3">
                                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    {getEventCategoryLabel(category)}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const categoryEvents = events.map(e => e.value);
                                        const allSelected = categoryEvents.every(e => webhookForm.events.includes(e));
                                        if (allSelected) {
                                          setWebhookForm(prev => ({
                                            ...prev,
                                            events: prev.events.filter(e => !categoryEvents.includes(e))
                                          }));
                                        } else {
                                          setWebhookForm(prev => ({
                                            ...prev,
                                            events: [...new Set([...prev.events, ...categoryEvents])]
                                          }));
                                        }
                                      }}
                                      className="text-xs text-primary-600 hover:text-primary-700"
                                    >
                                      {events.map(e => e.value).every(e => webhookForm.events.includes(e))
                                        ? 'Désélectionner tout'
                                        : 'Sélectionner tout'}
                                    </button>
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {events.map((event) => (
                                      <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={webhookForm.events.includes(event.value)}
                                          onChange={() => handleWebhookEventToggle(event.value)}
                                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">{event.action}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="label">Timeout (ms)</label>
                              <input
                                type="number"
                                value={webhookForm.timeoutMs}
                                onChange={(e) => setWebhookForm(prev => ({ ...prev, timeoutMs: parseInt(e.target.value) }))}
                                className="input"
                                min={1000}
                                max={120000}
                              />
                            </div>
                            <div>
                              <label className="label">Max tentatives</label>
                              <input
                                type="number"
                                value={webhookForm.maxRetries}
                                onChange={(e) => setWebhookForm(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                                className="input"
                                min={0}
                                max={10}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={webhookForm.isActive}
                                onChange={(e) => setWebhookForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Actif</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={webhookForm.retryOnFailure}
                                onChange={(e) => setWebhookForm(prev => ({ ...prev, retryOnFailure: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Réessayer en cas d'échec</span>
                            </label>
                          </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                          <button
                            onClick={() => setShowWebhookModal(false)}
                            className="btn-secondary"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSaveWebhook}
                            disabled={createWebhookMutation.isLoading || updateWebhookMutation.isLoading}
                            className="btn-primary"
                          >
                            {createWebhookMutation.isLoading || updateWebhookMutation.isLoading
                              ? 'Enregistrement...'
                              : editingWebhook ? 'Mettre à jour' : 'Créer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Storage Settings - OneDrive */}
            {activeTab === 'storage' && (
              <StorageSettings />
            )}

            {/* LDAP Settings */}
            {activeTab === 'ldap' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" />
                    Configuration LDAP
                  </h2>
                  <button
                    onClick={() => testConnectionMutation.mutate('ldap')}
                    disabled={testConnectionMutation.isLoading}
                    className="btn-secondary btn-sm"
                  >
                    {testConnectionMutation.isLoading ? 'Test...' : 'Tester la connexion'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ldapEnabled"
                    checked={formData.ldap?.enabled || false}
                    onChange={(e) => handleChange('ldap', 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="ldapEnabled" className="text-gray-700">
                    Activer l'authentification LDAP
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Serveur LDAP</label>
                    <input
                      type="text"
                      value={formData.ldap?.server || ''}
                      onChange={(e) => handleChange('ldap', 'server', e.target.value)}
                      className="input"
                      placeholder="ldap.exemple.com"
                    />
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input
                      type="number"
                      value={formData.ldap?.port || 389}
                      onChange={(e) => handleChange('ldap', 'port', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Base DN</label>
                  <input
                    type="text"
                    value={formData.ldap?.baseDN || ''}
                    onChange={(e) => handleChange('ldap', 'baseDN', e.target.value)}
                    className="input"
                    placeholder="dc=exemple,dc=com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Bind DN</label>
                    <input
                      type="text"
                      value={formData.ldap?.bindDN || ''}
                      onChange={(e) => handleChange('ldap', 'bindDN', e.target.value)}
                      className="input"
                      placeholder="cn=admin,dc=exemple,dc=com"
                    />
                  </div>
                  <div>
                    <label className="label">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.ldapPassword ? 'text' : 'password'}
                        value={formData.ldap?.bindPassword || ''}
                        onChange={(e) => handleChange('ldap', 'bindPassword', e.target.value)}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('ldapPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.ldapPassword ? (
                          <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Filtre utilisateur</label>
                  <input
                    type="text"
                    value={formData.ldap?.userFilter || '(uid={{username}})'}
                    onChange={(e) => handleChange('ldap', 'userFilter', e.target.value)}
                    className="input"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ldapTLS"
                    checked={formData.ldap?.useTLS || false}
                    onChange={(e) => handleChange('ldap', 'useTLS', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="ldapTLS" className="text-gray-700">
                    Utiliser TLS/SSL
                  </label>
                </div>

                <div>
                  <label className="label">Groupe AD requis (DN)</label>
                  <input
                    type="text"
                    value={formData.ldap?.requiredGroupDN || ''}
                    onChange={(e) => handleChange('ldap', 'requiredGroupDN', e.target.value)}
                    className="input"
                    placeholder="Ex: CN=GED,OU=groups,DC=pavilly,DC=int"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si renseigné, seuls les utilisateurs membres de ce groupe AD pourront se connecter via LDAP. Laissez vide pour autoriser tous les utilisateurs.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Groupes AD/LDAP</h3>
                      <p className="text-sm text-gray-500">
                        Récupérez la liste des groupes de l'annuaire pour configurer les{' '}
                        <a href="/admin/correspondances-ldap" className="text-primary-600 hover:underline">
                          correspondances groupe AD → rôle GED
                        </a>.
                      </p>
                    </div>
                    <button
                      onClick={() => loadLdapGroupsMutation.mutate()}
                      disabled={loadLdapGroupsMutation.isLoading}
                      className="btn-secondary btn-sm whitespace-nowrap"
                    >
                      {loadLdapGroupsMutation.isLoading ? 'Recherche...' : 'Lister les groupes AD'}
                    </button>
                  </div>

                  {ldapGroups.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {ldapGroups.map((group) => (
                        <div key={group.dn} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-medium text-gray-900 truncate">{group.name || group.dn}</p>
                            <p className="text-gray-500 truncate">{group.dn}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyLdapGroupDN(group.dn)}
                            className="flex items-center gap-1 text-gray-500 hover:text-primary-600 shrink-0"
                            title="Copier le DN"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                            Copier le DN
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Configuration LDAP de secours (failover)</h3>
                      <p className="text-sm text-gray-500">
                        Utilisée automatiquement à chaque connexion si le serveur principal est inaccessible.
                        La configuration effective se fait via les variables <code className="text-xs bg-gray-100 px-1 rounded">LDAP_*_BACKUP</code> du
                        fichier <code className="text-xs bg-gray-100 px-1 rounded">.env</code> ; cette section permet
                        seulement de tester la connexion et lister les groupes du serveur de secours.
                      </p>
                    </div>
                    <button
                      onClick={() => testConnectionMutation.mutate('ldapBackup')}
                      disabled={testConnectionMutation.isLoading}
                      className="btn-secondary btn-sm whitespace-nowrap"
                    >
                      {testConnectionMutation.isLoading ? 'Test...' : 'Tester la connexion'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="label">Serveur LDAP de secours</label>
                      <input
                        type="text"
                        value={formData.ldapBackup?.server || ''}
                        onChange={(e) => handleChange('ldapBackup', 'server', e.target.value)}
                        className="input"
                        placeholder="ldap-secours.exemple.com"
                      />
                    </div>
                    <div>
                      <label className="label">Port</label>
                      <input
                        type="number"
                        value={formData.ldapBackup?.port || 389}
                        onChange={(e) => handleChange('ldapBackup', 'port', parseInt(e.target.value))}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="label">Base DN</label>
                    <input
                      type="text"
                      value={formData.ldapBackup?.baseDN || ''}
                      onChange={(e) => handleChange('ldapBackup', 'baseDN', e.target.value)}
                      className="input"
                      placeholder="dc=exemple,dc=com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="label">Bind DN</label>
                      <input
                        type="text"
                        value={formData.ldapBackup?.bindDN || ''}
                        onChange={(e) => handleChange('ldapBackup', 'bindDN', e.target.value)}
                        className="input"
                        placeholder="cn=admin,dc=exemple,dc=com"
                      />
                    </div>
                    <div>
                      <label className="label">Mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPasswords.ldapBackupPassword ? 'text' : 'password'}
                          value={formData.ldapBackup?.bindPassword || ''}
                          onChange={(e) => handleChange('ldapBackup', 'bindPassword', e.target.value)}
                          className="input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('ldapBackupPassword')}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showPasswords.ldapBackupPassword ? (
                            <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="ldapBackupTLS"
                      checked={formData.ldapBackup?.useTLS || false}
                      onChange={(e) => handleChange('ldapBackup', 'useTLS', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="ldapBackupTLS" className="text-gray-700">
                      Utiliser TLS/SSL
                    </label>
                  </div>

                  <div className="flex items-center justify-between mt-4 mb-3">
                    <p className="text-sm text-gray-500">Récupérer la liste des groupes de l'annuaire de secours</p>
                    <button
                      onClick={() => loadLdapGroupsMutation.mutate('ldapBackup')}
                      disabled={loadLdapGroupsMutation.isLoading}
                      className="btn-secondary btn-sm whitespace-nowrap"
                    >
                      {loadLdapGroupsMutation.isLoading ? 'Recherche...' : 'Lister les groupes AD'}
                    </button>
                  </div>

                  {ldapBackupGroups.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                      {ldapBackupGroups.map((group) => (
                        <div key={group.dn} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-medium text-gray-900 truncate">{group.name || group.dn}</p>
                            <p className="text-gray-500 truncate">{group.dn}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyLdapGroupDN(group.dn)}
                            className="flex items-center gap-1 text-gray-500 hover:text-primary-600 shrink-0"
                            title="Copier le DN"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                            Copier le DN
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kerberos Settings */}
            {activeTab === 'kerberos' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <KeyIcon className="w-5 h-5" />
                  Configuration Kerberos
                </h2>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="kerberosEnabled"
                    checked={formData.kerberos?.enabled || false}
                    onChange={(e) => handleChange('kerberos', 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="kerberosEnabled" className="text-gray-700">
                    Activer l'authentification Kerberos
                  </label>
                </div>

                <div>
                  <label className="label">Realm</label>
                  <input
                    type="text"
                    value={formData.kerberos?.realm || ''}
                    onChange={(e) => handleChange('kerberos', 'realm', e.target.value)}
                    className="input"
                    placeholder="EXEMPLE.COM"
                  />
                </div>

                <div>
                  <label className="label">KDC (Key Distribution Center)</label>
                  <input
                    type="text"
                    value={formData.kerberos?.kdc || ''}
                    onChange={(e) => handleChange('kerberos', 'kdc', e.target.value)}
                    className="input"
                    placeholder="kdc.exemple.com"
                  />
                </div>

                <div>
                  <label className="label">Service Principal</label>
                  <input
                    type="text"
                    value={formData.kerberos?.servicePrincipal || ''}
                    onChange={(e) => handleChange('kerberos', 'servicePrincipal', e.target.value)}
                    className="input"
                    placeholder="HTTP/ged.exemple.com"
                  />
                </div>
              </div>
            )}

            {/* IMAP Settings */}
            {activeTab === 'imap' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" />
                    Configuration IMAP
                  </h2>
                  <button
                    onClick={() => testConnectionMutation.mutate('imap')}
                    disabled={testConnectionMutation.isLoading}
                    className="btn-secondary btn-sm"
                  >
                    {testConnectionMutation.isLoading ? 'Test...' : 'Tester la connexion'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imapEnabled"
                    checked={formData.imap?.enabled || false}
                    onChange={(e) => handleChange('imap', 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="imapEnabled" className="text-gray-700">
                    Activer l'import IMAP
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Serveur IMAP</label>
                    <input
                      type="text"
                      value={formData.imap?.host || ''}
                      onChange={(e) => handleChange('imap', 'host', e.target.value)}
                      className="input"
                      placeholder="imap.exemple.com"
                    />
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input
                      type="number"
                      value={formData.imap?.port || 993}
                      onChange={(e) => handleChange('imap', 'port', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Utilisateur</label>
                    <input
                      type="text"
                      value={formData.imap?.user || ''}
                      onChange={(e) => handleChange('imap', 'user', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.imapPassword ? 'text' : 'password'}
                        value={formData.imap?.password || ''}
                        onChange={(e) => handleChange('imap', 'password', e.target.value)}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('imapPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.imapPassword ? (
                          <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Dossier à surveiller</label>
                  <div className="flex gap-2">
                    {imapFolders.length > 0 ? (
                      <select
                        value={formData.imap?.mailbox || 'INBOX'}
                        onChange={(e) => handleChange('imap', 'mailbox', e.target.value)}
                        className="input flex-1"
                      >
                        {!imapFolders.includes(formData.imap?.mailbox || 'INBOX') && (
                          <option value={formData.imap?.mailbox || 'INBOX'}>
                            {formData.imap?.mailbox || 'INBOX'}
                          </option>
                        )}
                        {imapFolders.map((folder) => (
                          <option key={folder} value={folder}>{folder}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.imap?.mailbox || 'INBOX'}
                        onChange={(e) => handleChange('imap', 'mailbox', e.target.value)}
                        className="input flex-1"
                        placeholder="INBOX"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => loadImapFoldersMutation.mutate()}
                      disabled={loadingImapFolders || !formData.imap?.host || !formData.imap?.user || !formData.imap?.password}
                      className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Charger les dossiers disponibles"
                    >
                      {loadingImapFolders ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-5 h-5" />
                      )}
                      <span className="text-sm">Charger</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {imapFolders.length > 0 
                      ? `${imapFolders.length} dossier(s) disponible(s)` 
                      : 'Cliquez sur "Charger" pour afficher les dossiers disponibles'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imapTLS"
                    checked={formData.imap?.tls ?? true}
                    onChange={(e) => handleChange('imap', 'tls', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="imapTLS" className="text-gray-700">
                    Utiliser TLS/SSL
                  </label>
                </div>

                <div>
                  <label className="label">Intervalle de vérification (minutes)</label>
                  <input
                    type="number"
                    value={formData.imap?.checkInterval || 5}
                    onChange={(e) => handleChange('imap', 'checkInterval', parseInt(e.target.value))}
                    className="input"
                    min="1"
                  />
                </div>

                {/* Section Filtrage des emails */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Filtrage des emails</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="imapAutoImport"
                        checked={formData.imap?.autoImport ?? true}
                        onChange={(e) => handleChange('imap', 'autoImport', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="imapAutoImport" className="text-gray-700">
                        Importer automatiquement tous les emails (sans filtrage)
                      </label>
                    </div>

                    {!formData.imap?.autoImport && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Les filtres ci-dessous sont combinés avec un opérateur <strong>OU</strong>. 
                          Un email sera importé s'il correspond à au moins un critère.
                        </p>

                        <div>
                          <label className="label">Filtrer par domaine d'expéditeur</label>
                          <input
                            type="text"
                            value={formData.imap?.filterDomains || ''}
                            onChange={(e) => handleChange('imap', 'filterDomains', e.target.value)}
                            className="input"
                            placeholder="@pavilly.fr, @villepavilly.fr, @exemple.com"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Domaines séparés par des virgules. Ex: @pavilly.fr, @villepavilly.fr
                          </p>
                        </div>

                        <div>
                          <label className="label">Filtrer par adresse email</label>
                          <input
                            type="text"
                            value={formData.imap?.filterEmails || ''}
                            onChange={(e) => handleChange('imap', 'filterEmails', e.target.value)}
                            className="input"
                            placeholder="contact@fournisseur.com, support@partenaire.fr"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Adresses exactes séparées par des virgules
                          </p>
                        </div>

                        <div>
                          <label className="label">Mots-clés dans le sujet</label>
                          <input
                            type="text"
                            value={formData.imap?.filterSubjectKeywords || ''}
                            onChange={(e) => handleChange('imap', 'filterSubjectKeywords', e.target.value)}
                            className="input"
                            placeholder="Facture, Devis, Urgent, Toshiba"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Mots-clés séparés par des virgules (insensible à la casse)
                          </p>
                        </div>

                        <div>
                          <label className="label">Mots-clés dans le corps du message</label>
                          <input
                            type="text"
                            value={formData.imap?.filterBodyKeywords || ''}
                            onChange={(e) => handleChange('imap', 'filterBodyKeywords', e.target.value)}
                            className="input"
                            placeholder="Imprimante, Contrat, Commande"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Mots-clés séparés par des virgules (insensible à la casse)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Dossier de destination après traitement */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Action après traitement</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="label">Dossier de destination des emails traités</label>
                      <div className="flex gap-2">
                        {imapFolders.length > 0 && !manualProcessedFolder ? (
                          <select
                            value={formData.imap?.processedFolder || 'Traités'}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setManualProcessedFolder(true);
                                handleChange('imap', 'processedFolder', '');
                              } else {
                                handleChange('imap', 'processedFolder', e.target.value);
                              }
                            }}
                            className="input flex-1"
                          >
                            {!imapFolders.includes(formData.imap?.processedFolder || 'Traités') && formData.imap?.processedFolder && (
                              <option value={formData.imap?.processedFolder}>
                                {formData.imap?.processedFolder} (nouveau dossier)
                              </option>
                            )}
                            {imapFolders.map((folder) => (
                              <option key={folder} value={folder}>{folder}</option>
                            ))}
                            <option value="__NEW__">➕ Créer un nouveau dossier...</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.imap?.processedFolder || ''}
                            onChange={(e) => handleChange('imap', 'processedFolder', e.target.value)}
                            className="input flex-1"
                            placeholder="Traités"
                            autoFocus={manualProcessedFolder}
                          />
                        )}
                        {imapFolders.length > 0 && manualProcessedFolder && (
                          <button
                            type="button"
                            onClick={() => setManualProcessedFolder(false)}
                            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                            title="Revenir à la liste"
                          >
                            Liste
                          </button>
                        )}
                        {imapFolders.length === 0 && !manualProcessedFolder && (
                          <button
                            type="button"
                            onClick={() => loadImapFoldersMutation.mutate()}
                            disabled={loadingImapFolders || !formData.imap?.host || !formData.imap?.user || !formData.imap?.password}
                            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Charger les dossiers disponibles"
                          >
                            {loadingImapFolders ? (
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowPathIcon className="w-5 h-5" />
                            )}
                            <span className="text-sm">Charger</span>
                          </button>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {imapFolders.length > 0 
                          ? (manualProcessedFolder 
                              ? 'Saisissez le nom du nouveau dossier (il sera créé automatiquement)'
                              : 'Sélectionnez un dossier existant ou créez-en un nouveau')
                          : 'Les emails importés seront déplacés dans ce dossier. Le dossier sera créé automatiquement s\'il n\'existe pas.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="imapMarkAsRead"
                        checked={formData.imap?.markAsRead ?? true}
                        onChange={(e) => handleChange('imap', 'markAsRead', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="imapMarkAsRead" className="text-gray-700">
                        Marquer les emails comme lus après traitement
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="imapProcessAllMails"
                        checked={formData.imap?.processAllMails || false}
                        onChange={(e) => handleChange('imap', 'processAllMails', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="imapProcessAllMails" className="text-gray-700">
                        Traiter tous les emails (y compris les emails déjà lus)
                      </label>
                    </div>

                    {formData.imap?.processAllMails && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-700">
                          ⚠️ <strong>Note :</strong> Cette option traitera tous les emails du dossier, 
                          pas seulement les nouveaux. Utile pour récupérer des emails déjà lus.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="imapDeleteAfterProcess"
                        checked={formData.imap?.deleteAfterProcess || false}
                        onChange={(e) => handleChange('imap', 'deleteAfterProcess', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="imapDeleteAfterProcess" className="text-gray-700 text-red-600">
                        Supprimer les emails après traitement (au lieu de les déplacer)
                      </label>
                    </div>

                    {formData.imap?.deleteAfterProcess && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">
                          ⚠️ <strong>Attention :</strong> Les emails seront définitivement supprimés après traitement. 
                          Cette action est irréversible.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* IMAP Email-PDF Settings */}
            {activeTab === 'imap-mail' && (
              <ImapMailSettings />
            )}

            {/* SMTP Settings */}
            {activeTab === 'smtp' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" />
                    Configuration SMTP
                  </h2>
                  <button
                    onClick={() => testConnectionMutation.mutate('smtp')}
                    disabled={testConnectionMutation.isLoading}
                    className="btn-secondary btn-sm"
                  >
                    {testConnectionMutation.isLoading ? 'Test...' : 'Tester'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Serveur SMTP</label>
                    <input
                      type="text"
                      value={formData.smtp?.host || ''}
                      onChange={(e) => handleChange('smtp', 'host', e.target.value)}
                      className="input"
                      placeholder="smtp.exemple.com"
                    />
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input
                      type="number"
                      value={formData.smtp?.port || 587}
                      onChange={(e) => handleChange('smtp', 'port', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Utilisateur</label>
                    <input
                      type="text"
                      value={formData.smtp?.user || ''}
                      onChange={(e) => handleChange('smtp', 'user', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.smtpPassword ? 'text' : 'password'}
                        value={formData.smtp?.password || ''}
                        onChange={(e) => handleChange('smtp', 'password', e.target.value)}
                        className="input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('smtpPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.smtpPassword ? (
                          <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Adresse expéditeur</label>
                    <input
                      type="email"
                      value={formData.smtp?.from || ''}
                      onChange={(e) => handleChange('smtp', 'from', e.target.value)}
                      className="input"
                      placeholder="noreply@exemple.com"
                    />
                  </div>
                  <div>
                    <label className="label">Nom expéditeur</label>
                    <input
                      type="text"
                      value={formData.smtp?.fromName || ''}
                      onChange={(e) => handleChange('smtp', 'fromName', e.target.value)}
                      className="input"
                      placeholder="GED - Gestion de Courrier"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={formData.smtp?.secure ?? true}
                    onChange={(e) => handleChange('smtp', 'secure', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="smtpSecure" className="text-gray-700">
                    Utiliser TLS/SSL
                  </label>
                </div>

                {/* Section Test SMTP */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <PaperAirplaneIcon className="w-5 h-5" />
                    Envoyer un email de test
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Adresse destinataire *</label>
                      <input
                        type="email"
                        value={smtpTestRecipient}
                        onChange={(e) => setSmtpTestRecipient(e.target.value)}
                        className="input"
                        placeholder="test@exemple.com"
                      />
                    </div>
                    <div>
                      <label className="label">Modèle de mail (optionnel)</label>
                      <select
                        value={smtpTestTemplate}
                        onChange={(e) => setSmtpTestTemplate(e.target.value)}
                        className="input"
                      >
                        <option value="">Email de test simple</option>
                        {emailTemplates?.map((template) => (
                          <option key={template._id} value={template._id}>
                            {template.name} ({template.action})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={handleSmtpTest}
                      disabled={smtpTestMutation.isLoading || !smtpTestRecipient}
                      className="btn-primary flex items-center gap-2"
                    >
                      {smtpTestMutation.isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-5 h-5" />
                          Envoyer le test
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    Assurez-vous d'avoir enregistré la configuration SMTP avant de tester.
                  </p>
                </div>
              </div>
            )}

            {/* Excel Register Settings */}
            {activeTab === 'excel' && (
              <ExcelRegisterSettings />
            )}

            {/* Database Settings */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ServerIcon className="w-5 h-5" />
                  Configuration Base de données
                </h2>

                <div className="p-4 bg-warning-50 text-warning-700 rounded-lg">
                  <p className="text-sm">
                    <strong>Attention :</strong> Modifier ces paramètres peut rendre l'application inaccessible.
                    Assurez-vous de sauvegarder vos données avant toute modification.
                  </p>
                </div>

                <div>
                  <label className="label">URI MongoDB</label>
                  <input
                    type="text"
                    value={formData.database?.uri || ''}
                    onChange={(e) => handleChange('database', 'uri', e.target.value)}
                    className="input font-mono text-sm"
                    placeholder="mongodb://localhost:27017/ged"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom de la base</label>
                    <input
                      type="text"
                      value={formData.database?.name || 'ged'}
                      onChange={(e) => handleChange('database', 'name', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Préfixe des collections</label>
                    <input
                      type="text"
                      value={formData.database?.prefix || ''}
                      onChange={(e) => handleChange('database', 'prefix', e.target.value)}
                      className="input"
                      placeholder="ged_"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Modal d'édition de template
function TemplateEditModal({ template, actions, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('editor');
  const [formData, setFormData] = useState({
    name: template?.name || '',
    action: template?.action || 'welcome',
    subject: template?.subject || '',
    htmlContent: template?.htmlContent || getDefaultTemplate(),
    description: template?.description || '',
    isActive: template?.isActive ?? true
  });

  const selectedAction = actions?.find(a => a.id === formData.action);
  const availableVariables = selectedAction?.variables || [];

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return emailTemplatesAPI.update(template._id, data);
      }
      return emailTemplatesAPI.create(data);
    },
    onSuccess: () => {
      toast.success(template ? 'Modèle mis à jour' : 'Modèle créé');
      onSuccess();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    mutation.mutate(formData);
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('html-editor-modal');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        formData.htmlContent.substring(0, start) +
        variable +
        formData.htmlContent.substring(end);
      setFormData({ ...formData, htmlContent: newContent });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setFormData({ ...formData, htmlContent: formData.htmlContent + variable });
    }
  };

  const copyVariable = (variable) => {
    navigator.clipboard.writeText(variable);
    toast.success('Variable copiée');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">
              {template ? 'Modifier le modèle' : 'Nouveau modèle'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Infos générales */}
            <div className="p-4 border-b bg-gray-50 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Nom du modèle *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Ex: Email de bienvenue"
                  />
                </div>
                <div>
                  <label className="label">Action *</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="input"
                  >
                    {actions?.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Sujet de l'email *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input"
                    placeholder="Ex: Bienvenue sur {{appName}}"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="label">Description (optionnelle)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    placeholder="Description du modèle"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActiveTemplate"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <label htmlFor="isActiveTemplate" className="text-sm text-gray-700">Activer ce modèle</label>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 flex overflow-hidden">
              {/* Variables disponibles */}
              <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Variables disponibles</h3>
                <p className="text-xs text-gray-500 mb-3">Cliquez pour insérer</p>
                <div className="space-y-1">
                  {availableVariables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      onDoubleClick={() => copyVariable(variable)}
                      className="w-full text-left px-2 py-1.5 text-xs font-mono bg-white border rounded hover:bg-primary-50 hover:border-primary-300 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{variable}</span>
                      <ClipboardDocumentIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Éditeur et aperçu */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'editor'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                    Code HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'preview'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <EyeIcon className="w-4 h-4" />
                    Aperçu
                  </button>
                </div>

                {/* Contenu tab */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'editor' ? (
                    <textarea
                      id="html-editor-modal"
                      value={formData.htmlContent}
                      onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                      className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                      placeholder="Saisissez votre code HTML ici..."
                    />
                  ) : (
                    <div className="h-full overflow-auto bg-gray-100 p-4">
                      <div className="bg-white rounded-lg shadow-sm mx-auto max-w-2xl">
                        <iframe
                          srcDoc={formData.htmlContent}
                          className="w-full h-[400px] border-0"
                          title="Aperçu du template"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                {mutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {template ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Template HTML par défaut
function getDefaultTemplate() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{appName}}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .content h2 {
      color: #6366f1;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{appName}}</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{userFirstName}},</h2>
      <p>Votre contenu ici...</p>
      <a href="{{appUrl}}" class="button">Accéder à l'application</a>
    </div>
    <div class="footer">
      <p>© {{currentYear}} {{appName}}. Tous droits réservés.</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;
}
