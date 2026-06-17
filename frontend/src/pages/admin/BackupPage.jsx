import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { backupAPI, nextcloudAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  PlayIcon,
  ClockIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  FolderIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const CRON_PRESETS = [
  { label: 'Tous les jours à 2h', value: '0 2 * * *' },
  { label: 'Tous les jours à 0h', value: '0 0 * * *' },
  { label: 'Toutes les 6 heures', value: '0 */6 * * *' },
  { label: 'Toutes les 12 heures', value: '0 */12 * * *' },
  { label: 'Chaque semaine (lundi à 2h)', value: '0 2 * * 1' },
  { label: 'Chaque mois (1er à 2h)', value: '0 2 1 * *' },
];

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR');
}

// Modal de confirmation pour les actions destructives
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true, isLoading = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
            {danger
              ? <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              : <InformationCircleIcon className="w-5 h-5 text-blue-600" />
            }
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} className="btn-secondary" disabled={isLoading}>Annuler</button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn ${danger ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : 'btn-primary'} flex items-center gap-2`}
          >
            {isLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            Confirmer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Panel de résultat de vérification
function VerifyResult({ result, onClose }) {
  const { manifest, missingCollections, fileCount, entryCount, sizeFormatted } = result;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sauvegarde valide</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{formatDate(manifest?.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="font-medium">{manifest?.appVersion || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Taille</span><span className="font-medium">{sizeFormatted}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fichiers joints</span><span className="font-medium">{manifest?.includesFiles ? `Oui (${fileCount})` : 'Non'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Entrées ZIP</span><span className="font-medium">{entryCount}</span></div>
          </div>

          {manifest?.stats && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Données contenues</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(manifest.stats).map(([k, v]) => (
                  <div key={k} className="bg-primary-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-primary-700">{v}</div>
                    <div className="text-xs text-primary-600 capitalize">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {missingCollections?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium">Collections manquantes :</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                {missingCollections.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            ✅ L'archive est intègre et contient un manifest valide.
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-primary">Fermer</button>
        </div>
      </motion.div>
    </div>
  );
}

// Section : Créer une sauvegarde
function CreateBackupSection({ onCreated }) {
  const [includeFiles, setIncludeFiles] = useState(true);
  const [label, setLabel] = useState('');

  const createMutation = useMutation({
    mutationFn: () => backupAPI.create({ includeFiles, label }),
    onSuccess: (res) => {
      toast.success(`Sauvegarde créée : ${res.data.data.filename}`);
      setLabel('');
      onCreated();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la création'),
  });

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CircleStackIcon className="w-5 h-5 text-primary-600" />
        Créer une sauvegarde maintenant
      </h2>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label (optionnel)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Ex : avant-migration"
            className="input w-full"
            maxLength={30}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="includeFiles"
            checked={includeFiles}
            onChange={e => setIncludeFiles(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <label htmlFor="includeFiles" className="text-sm text-gray-700">
            Inclure les fichiers PDF (courriers, réponses, avatars)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {createMutation.isPending
            ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
            : <PlayIcon className="w-4 h-4" />
          }
          {createMutation.isPending ? 'Sauvegarde en cours…' : 'Lancer la sauvegarde'}
        </button>
        {!includeFiles && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            Sans les fichiers, seule la base de données sera restaurable
          </p>
        )}
      </div>
    </div>
  );
}

// Section : Liste des sauvegardes
function BackupListSection({ nextcloudEnabled }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await backupAPI.list();
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename) => backupAPI.delete(filename),
    onSuccess: () => {
      toast.success('Sauvegarde supprimée');
      setConfirmDelete(null);
      queryClient.invalidateQueries(['backups']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
      setConfirmDelete(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (filename) => backupAPI.restore(filename),
    onSuccess: (res) => {
      const d = res.data.data;
      const colCount = Object.values(d.collections).reduce((a, b) => a + b, 0);
      toast.success(`Restauration réussie : ${colCount} documents, ${d.filesRestored} fichiers`);
      setConfirmRestore(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la restauration');
      setConfirmRestore(null);
    },
  });

  const handleVerify = async (filename) => {
    setLoadingAction(p => ({ ...p, [filename + '_verify']: true }));
    try {
      const res = await backupAPI.verify(filename);
      setVerifyResult(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vérification échouée');
    } finally {
      setLoadingAction(p => ({ ...p, [filename + '_verify']: false }));
    }
  };

  const handleUploadNC = async (filename) => {
    setLoadingAction(p => ({ ...p, [filename + '_nc']: true }));
    try {
      await backupAPI.uploadNextCloud(filename);
      toast.success('Sauvegarde envoyée vers NextCloud');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur upload NextCloud');
    } finally {
      setLoadingAction(p => ({ ...p, [filename + '_nc']: false }));
    }
  };

  const handleDownload = (filename) => {
    const url = backupAPI.downloadUrl(filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) return <div className="card p-6"><LoadingSpinner /></div>;

  const backups = data || [];

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-primary-600" />
            Sauvegardes disponibles
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{backups.length}</span>
          </h2>
          <button onClick={() => refetch()} className="btn-secondary text-xs flex items-center gap-1">
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Rafraîchir
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CircleStackIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune sauvegarde disponible</p>
            <p className="text-xs mt-1">Créez votre première sauvegarde ci-dessus</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Fichier</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Taille</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-gray-700">{b.filename}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{formatDate(b.createdAt)}</td>
                    <td className="px-6 py-3 text-gray-600">{formatBytes(b.size)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Vérifier */}
                        <button
                          onClick={() => handleVerify(b.filename)}
                          disabled={loadingAction[b.filename + '_verify']}
                          title="Vérifier l'intégrité"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingAction[b.filename + '_verify']
                            ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            : <ShieldCheckIcon className="w-4 h-4" />
                          }
                        </button>

                        {/* Télécharger */}
                        <button
                          onClick={() => handleDownload(b.filename)}
                          title="Télécharger"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>

                        {/* Envoyer vers NextCloud */}
                        {nextcloudEnabled && (
                          <button
                            onClick={() => handleUploadNC(b.filename)}
                            disabled={loadingAction[b.filename + '_nc']}
                            title="Envoyer vers NextCloud"
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {loadingAction[b.filename + '_nc']
                              ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              : <CloudArrowUpIcon className="w-4 h-4" />
                            }
                          </button>
                        )}

                        {/* Restaurer */}
                        <button
                          onClick={() => setConfirmRestore(b.filename)}
                          title="Restaurer"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>

                        {/* Supprimer */}
                        <button
                          onClick={() => setConfirmDelete(b.filename)}
                          title="Supprimer"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Légende des actions */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1"><ShieldCheckIcon className="w-3.5 h-3.5 text-green-600" />Vérifier l'intégrité</span>
        <span className="flex items-center gap-1"><ArrowDownTrayIcon className="w-3.5 h-3.5 text-blue-600" />Télécharger</span>
        {nextcloudEnabled && <span className="flex items-center gap-1"><CloudArrowUpIcon className="w-3.5 h-3.5 text-purple-600" />Envoyer vers NextCloud</span>}
        <span className="flex items-center gap-1"><ArrowPathIcon className="w-3.5 h-3.5 text-amber-600" />Restaurer</span>
        <span className="flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5 text-red-500" />Supprimer</span>
      </div>

      {/* Modales */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            title="Supprimer la sauvegarde"
            message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete}" ? Cette action est irréversible.`}
            onConfirm={() => deleteMutation.mutate(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
            isLoading={deleteMutation.isPending}
            danger
          />
        )}
        {confirmRestore && (
          <ConfirmModal
            title="Restaurer la sauvegarde"
            message={`Attention ! La restauration de "${confirmRestore}" va écraser toutes les données actuelles de la base de données. Cette action est irréversible. Assurez-vous d'avoir créé une sauvegarde de l'état actuel avant de continuer.`}
            onConfirm={() => restoreMutation.mutate(confirmRestore)}
            onCancel={() => setConfirmRestore(null)}
            isLoading={restoreMutation.isPending}
            danger
          />
        )}
        {verifyResult && (
          <VerifyResult result={verifyResult} onClose={() => setVerifyResult(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// Section : Configuration automatique
function AutoBackupConfig() {
  const queryClient = useQueryClient();
  const [showCronHelp, setShowCronHelp] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['backup-config'],
    queryFn: async () => {
      const res = await backupAPI.getConfig();
      return res.data.data;
    },
  });

  const { data: ncStatus } = useQuery({
    queryKey: ['nextcloud-status'],
    queryFn: async () => {
      try {
        const res = await nextcloudAPI.getStatus();
        return res.data.data;
      } catch {
        return { connected: false };
      }
    },
  });

  const [form, setForm] = useState(null);

  // Initialiser le formulaire avec les données chargées
  if (config && !form) {
    setForm({ ...config });
  }

  const saveMutation = useMutation({
    mutationFn: (data) => backupAPI.saveConfig(data),
    onSuccess: () => {
      toast.success('Configuration sauvegardée');
      queryClient.invalidateQueries(['backup-config']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde'),
  });

  if (isLoading || !form) return <div className="card p-6"><LoadingSpinner /></div>;

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <ClockIcon className="w-5 h-5 text-primary-600" />
        Sauvegarde automatique
      </h2>

      <div className="space-y-6">
        {/* Activer */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-gray-900">Activer la sauvegarde automatique</p>
            <p className="text-xs text-gray-500 mt-0.5">Lance automatiquement une sauvegarde selon le planning défini</p>
          </div>
          <button
            onClick={() => set('auto_enabled', !form.auto_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.auto_enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.auto_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Planning cron */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            Planning (expression cron)
            <button
              onClick={() => setShowCronHelp(!showCronHelp)}
              className="text-gray-400 hover:text-gray-600"
            >
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </label>
          <div className="flex gap-2 flex-wrap mb-2">
            {CRON_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => set('schedule', p.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.schedule === p.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.schedule}
            onChange={e => set('schedule', e.target.value)}
            placeholder="0 2 * * *"
            className="input w-full font-mono"
          />
          {showCronHelp && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">Format : minute heure jour-mois mois jour-semaine</p>
              <p>Exemples : <code className="bg-gray-100 px-1 rounded">0 2 * * *</code> = tous les jours à 2h00 | <code className="bg-gray-100 px-1 rounded">0 2 * * 1</code> = chaque lundi à 2h</p>
            </div>
          )}
        </div>

        {/* Nombre max de sauvegardes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre maximum de sauvegardes locales conservées
          </label>
          <input
            type="number"
            value={form.max_local}
            onChange={e => set('max_local', parseInt(e.target.value) || 5)}
            min={1}
            max={100}
            className="input w-32"
          />
          <p className="text-xs text-gray-500 mt-1">Les plus anciennes seront supprimées automatiquement</p>
        </div>

        {/* Inclure les fichiers */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoIncludeFiles"
            checked={form.include_files}
            onChange={e => set('include_files', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <label htmlFor="autoIncludeFiles" className="text-sm text-gray-700">
            Inclure les fichiers PDF dans la sauvegarde automatique
          </label>
        </div>

        {/* NextCloud */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <CloudArrowUpIcon className="w-4 h-4 text-purple-600" />
                Envoyer vers NextCloud après chaque sauvegarde
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ncStatus?.connected
                  ? '✅ NextCloud connecté'
                  : '⚠️ NextCloud non connecté — configurez-le dans Paramètres > Stockage externe'
                }
              </p>
            </div>
            <button
              onClick={() => set('nextcloud_enabled', !form.nextcloud_enabled)}
              disabled={!ncStatus?.connected}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.nextcloud_enabled && ncStatus?.connected ? 'bg-purple-600' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.nextcloud_enabled && ncStatus?.connected ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {form.nextcloud_enabled && ncStatus?.connected && (
            <p className="text-xs text-purple-700 bg-purple-50 rounded-lg p-2">
              Les sauvegardes seront déposées dans le dossier <strong>GED-Courrier/Sauvegardes</strong> sur votre serveur NextCloud.
            </p>
          )}
        </div>

        {/* Rapport email */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                Envoyer un rapport par email
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Un email récapitulatif est envoyé après chaque sauvegarde (succès ou échec)</p>
            </div>
            <button
              onClick={() => set('email_report', !form.email_report)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.email_report ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.email_report ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {form.email_report && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinataires (séparés par des virgules)</label>
              <input
                type="text"
                value={form.email_recipients}
                onChange={e => set('email_recipients', e.target.value)}
                placeholder="admin@mairie.fr, it@mairie.fr"
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Le serveur SMTP doit être configuré dans Paramètres > SMTP</p>
            </div>
          )}
        </div>

        {/* Bouton sauvegarder */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {saveMutation.isPending && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            Enregistrer la configuration
          </button>
        </div>
      </div>
    </div>
  );
}

// Page principale
export default function BackupPage() {
  const queryClient = useQueryClient();

  const { data: ncStatus } = useQuery({
    queryKey: ['nextcloud-status'],
    queryFn: async () => {
      try {
        const res = await nextcloudAPI.getStatus();
        return res.data.data;
      } catch {
        return { connected: false };
      }
    },
    staleTime: 30000,
  });

  const handleCreated = () => {
    queryClient.invalidateQueries(['backups']);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CircleStackIcon className="w-7 h-7 text-primary-600" />
          Sauvegardes
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Créez et restaurez des sauvegardes complètes de votre application (base de données + fichiers).
        </p>
      </div>

      {/* Avertissement restauration */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Avant toute restauration</p>
          <p className="mt-0.5">Créez impérativement une sauvegarde de l'état actuel. La restauration écrase intégralement la base de données et les fichiers.</p>
        </div>
      </div>

      {/* Créer une sauvegarde */}
      <CreateBackupSection onCreated={handleCreated} />

      {/* Liste des sauvegardes */}
      <BackupListSection nextcloudEnabled={ncStatus?.connected} />

      {/* Configuration automatique */}
      <AutoBackupConfig />
    </div>
  );
}
