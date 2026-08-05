import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { rgpdAPI, categoriesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import {
  ScaleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TrashIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  expired: 'À supprimer',
  upcoming: 'Échéance à venir',
  exempted: 'Dérogation',
  deleted: 'Supprimés',
  resolved: 'Clôturées',
  all: 'Tous'
};

const STATUS_BADGES = {
  expired: 'badge-danger',
  upcoming: 'badge-warning',
  exempted: 'badge-primary',
  deleted: 'badge-gray',
  resolved: 'badge-gray'
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : '—');

export default function RgpdPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('expired');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [exemptTarget, setExemptTarget] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [flash, setFlash] = useState(null);

  const { data: overview } = useQuery({
    queryKey: ['rgpd-overview'],
    queryFn: async () => (await rgpdAPI.getOverview()).data.data
  });

  const { data: categories } = useQuery({
    queryKey: ['category-options'],
    queryFn: async () => (await categoriesAPI.getOptions()).data.data
  });

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['rgpd-alerts', status, categoryFilter, search, page],
    queryFn: async () => (await rgpdAPI.getAlerts({
      status,
      category: categoryFilter,
      search,
      page,
      limit: 20
    })).data
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['rgpd-alerts']);
    queryClient.invalidateQueries(['rgpd-overview']);
    queryClient.invalidateQueries(['categories']);
    queryClient.invalidateQueries(['stats']);
  };

  const scanMutation = useMutation({
    mutationFn: () => rgpdAPI.scan(),
    onSuccess: (response) => {
      const data = response.data.data;
      setFlash(`Contrôle terminé — ${data.scannedDocuments} document(s) analysé(s), ${data.expired} à supprimer, ${data.autoDeleted} supprimé(s) automatiquement.`);
      refreshAll();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rgpdAPI.deleteDocument(id),
    onSuccess: () => { refreshAll(); setSelected([]); }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload) => rgpdAPI.bulkDelete(payload),
    onSuccess: (response) => {
      setFlash(response.data.message);
      setConfirmBulk(false);
      setSelected([]);
      refreshAll();
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => rgpdAPI.acknowledge(id),
    onSuccess: refreshAll
  });

  const alerts = alertsData?.data || [];
  const pagination = alertsData?.pagination;

  const toggleSelect = (id) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelected(prev => (prev.length === alerts.length ? [] : alerts.map(a => a._id)));
  };

  const kpis = [
    {
      label: 'Documents à supprimer',
      value: overview?.expired ?? 0,
      hint: 'Durée légale dépassée',
      icon: ExclamationTriangleIcon,
      tone: 'text-danger-600 bg-danger-100 dark:bg-danger-900/40'
    },
    {
      label: 'Échéances sous 30 jours',
      value: overview?.upcoming30 ?? 0,
      hint: `${overview?.upcoming ?? 0} échéance(s) suivie(s) au total`,
      icon: ClockIcon,
      tone: 'text-warning-600 bg-warning-100 dark:bg-warning-900/40'
    },
    {
      label: 'Dérogations en cours',
      value: overview?.exempted ?? 0,
      hint: 'Conservation prolongée',
      icon: ShieldCheckIcon,
      tone: 'text-primary-600 bg-primary-100 dark:bg-primary-900/40'
    },
    {
      label: 'Documents supprimés',
      value: overview?.deleted ?? 0,
      hint: 'Mis en corbeille au titre du RGPD',
      icon: TrashIcon,
      tone: 'text-gray-600 bg-gray-100 dark:bg-gray-700'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ScaleIcon className="w-7 h-7 text-primary-600" />
            Conformité RGPD
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {overview?.categoriesWithRetention ?? 0} catégorie(s) sur {overview?.totalCategories ?? 0} portent une durée légale de conservation
            {overview?.lastScanAt && ` · dernier contrôle le ${new Date(overview.lastScanAt).toLocaleString('fr-FR')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowPathIcon className={`w-5 h-5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            {scanMutation.isPending ? 'Contrôle en cours...' : 'Contrôler maintenant'}
          </button>
          <button onClick={() => setShowSettings(true)} className="btn-primary flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5" />
            Rappels
          </button>
        </div>
      </div>

      {flash && (
        <div className="card p-4 border-l-4 border-primary-500 flex items-start gap-3">
          <CheckCircleIcon className="w-6 h-6 text-primary-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{flash}</div>
          <button onClick={() => setFlash(null)} className="btn-icon"><XMarkIcon className="w-5 h-5" /></button>
        </div>
      )}

      {/* Indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.tone}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpi.value}</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{kpi.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.hint}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Répartition par catégorie */}
      {overview?.byCategory?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Par catégorie</h2>
          <div className="flex flex-wrap gap-2">
            {overview.byCategory.map((row) => (
              <button
                key={String(row.categoryId)}
                onClick={() => { setCategoryFilter(String(row.categoryId)); setPage(1); }}
                className="px-3 py-2 rounded-lg border dark:border-gray-700 hover:border-primary-500 text-left"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {row.expired || 0} à supprimer · {row.upcoming || 0} à venir
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {['expired', 'upcoming', 'exempted', 'deleted', 'all'].map((value) => (
            <button
              key={value}
              onClick={() => { setStatus(value); setPage(1); setSelected([]); }}
              className={status === value ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Référence, objet, correspondant..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">Toutes les catégories</option>
            {(categories || []).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        {status === 'expired' && (overview?.expired ?? 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selected.length > 0
                ? `${selected.length} document(s) sélectionné(s)`
                : `${overview.expired} document(s) dépassent la durée légale de conservation`}
            </p>
            <div className="flex gap-2">
              {selected.length > 0 && (
                <button
                  onClick={() => bulkDeleteMutation.mutate({ ids: selected })}
                  disabled={bulkDeleteMutation.isPending}
                  className="btn-danger btn-sm flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Supprimer la sélection
                </button>
              )}
              <button onClick={() => setConfirmBulk(true)} className="btn-secondary btn-sm">
                Tout supprimer ({overview.expired})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 w-10">
                  {status === 'expired' && alerts.length > 0 && (
                    <input
                      type="checkbox"
                      checked={selected.length === alerts.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Conservation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Échéance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="7" className="px-6 py-12"><LoadingSpinner /></td></tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucun document dans cette catégorie de suivi
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      {alert.status === 'expired' && (
                        <input
                          type="checkbox"
                          checked={selected.includes(alert._id)}
                          onChange={() => toggleSelect(alert._id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {alert.documentSubject || 'Sans objet'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {alert.chronoNumber || alert.reference}
                            {alert.correspondent && ` · ${alert.correspondent}`}
                            {alert.docType === 'outgoing' && ' · courrier départ'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="badge badge-primary">{alert.categoryName}</span>
                      {alert.retentionSnapshot?.legalBasis && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[16rem]">
                          {alert.retentionSnapshot.legalBasis}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {alert.retentionSnapshot?.duration} {alert.retentionSnapshot?.unit === 'years' ? 'an(s)' : alert.retentionSnapshot?.unit === 'months' ? 'mois' : 'jour(s)'}
                      <p className="text-xs">depuis le {formatDate(alert.startDate)}</p>
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      <p className="text-gray-900 dark:text-gray-100">{formatDate(alert.expiryDate)}</p>
                      <p className={`text-xs ${alert.daysOverdue > 0 ? 'text-danger-600' : 'text-gray-500 dark:text-gray-400'}`}>
                        {alert.daysOverdue > 0
                          ? `dépassée de ${alert.daysOverdue} jour(s)`
                          : `dans ${Math.abs(alert.daysOverdue)} jour(s)`}
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`badge ${STATUS_BADGES[alert.status] || 'badge-gray'}`}>
                        {STATUS_LABELS[alert.status] || alert.status}
                      </span>
                      {alert.status === 'exempted' && alert.exemptedUntil && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          jusqu'au {formatDate(alert.exemptedUntil)}
                        </p>
                      )}
                      {alert.acknowledgedAt && alert.status !== 'deleted' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vu</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {alert.status !== 'deleted' && alert.status !== 'resolved' && (
                        <div className="flex items-center justify-end gap-1">
                          {!alert.acknowledgedAt && (
                            <button
                              onClick={() => acknowledgeMutation.mutate(alert._id)}
                              className="btn-icon text-gray-500 hover:text-primary-600"
                              title="Marquer comme vu"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setExemptTarget(alert)}
                            className="btn-icon text-gray-500 hover:text-warning-600"
                            title="Accorder une dérogation"
                          >
                            <ShieldCheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(alert._id)}
                            className="btn-icon text-gray-500 hover:text-danger-600"
                            title="Mettre en corbeille"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      {alert.status === 'deleted' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {alert.deletionMode === 'auto' ? 'auto' : 'manuel'} · {formatDate(alert.documentDeletedAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
      )}

      <AnimatePresence>
        {showSettings && <RgpdSettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {exemptTarget && (
          <ExemptModal
            alert={exemptTarget}
            onClose={() => setExemptTarget(null)}
            onDone={() => { setExemptTarget(null); refreshAll(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBulk && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmBulk(false)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/40 mx-auto mb-4 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-danger-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Supprimer {overview?.expired} document(s) ?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Tous les documents ayant dépassé leur durée légale de conservation seront mis en corbeille.
                  Ils y restent récupérables jusqu'à la purge automatique.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setConfirmBulk(false)} className="btn-secondary">Annuler</button>
                  <button
                    onClick={() => bulkDeleteMutation.mutate({ allExpired: true })}
                    disabled={bulkDeleteMutation.isPending}
                    className="btn-danger"
                  >
                    {bulkDeleteMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dérogation temporaire
// ---------------------------------------------------------------------------

function ExemptModal({ alert, onClose, onDone }) {
  const [days, setDays] = useState(365);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => rgpdAPI.exempt(alert._id, { days, reason }),
    onSuccess: onDone,
    onError: (e) => setError(e.response?.data?.message || 'Erreur')
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Prolonger la conservation</h2>
            <button onClick={onClose} className="btn-icon"><XMarkIcon className="w-6 h-6" /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alert.documentSubject} — {alert.chronoNumber || alert.reference}
            </p>
            <div>
              <label className="label">Prolongation (jours)</label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Motif</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Ex : contentieux en cours, obligation légale concurrente"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary">Annuler</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Enregistrement...' : 'Accorder la dérogation'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paramètres des rappels RGPD
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function RgpdSettingsModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ['rgpd-settings'],
    queryFn: async () => {
      const data = (await rgpdAPI.getSettings()).data.data;
      setForm({ ...data, alertBeforeDays: (data.alertBeforeDays || []).join(', ') });
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: () => rgpdAPI.updateSettings(form),
    onSuccess: () => {
      queryClient.invalidateQueries(['rgpd-settings']);
      queryClient.invalidateQueries(['rgpd-overview']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.message || 'Erreur lors de l\'enregistrement')
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rappels et suppressions RGPD</h2>
            <button onClick={onClose} className="btn-icon"><XMarkIcon className="w-6 h-6" /></button>
          </div>

          {isLoading || !form ? (
            <div className="p-10"><LoadingSpinner /></div>
          ) : (
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => update('enabled', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Activer le contrôle automatique des durées de conservation
                  <span className="block text-gray-500 dark:text-gray-400">
                    Les échéances sont recalculées à chaque contrôle à partir des durées définies sur les catégories.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Fréquence</label>
                  <select
                    value={form.scanFrequency}
                    onChange={(e) => update('scanFrequency', e.target.value)}
                    className="input"
                  >
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>
                <div>
                  <label className="label">Heure</label>
                  <select
                    value={form.scanHour}
                    onChange={(e) => update('scanHour', parseInt(e.target.value, 10))}
                    className="input"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                {form.scanFrequency === 'weekly' && (
                  <div>
                    <label className="label">Jour</label>
                    <select
                      value={form.scanWeekday}
                      onChange={(e) => update('scanWeekday', parseInt(e.target.value, 10))}
                      className="input"
                    >
                      {WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}
                {form.scanFrequency === 'monthly' && (
                  <div>
                    <label className="label">Jour du mois</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={form.scanDayOfMonth}
                      onChange={(e) => update('scanDayOfMonth', parseInt(e.target.value, 10))}
                      className="input"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Rappels avant échéance (jours, séparés par des virgules)</label>
                <input
                  type="text"
                  value={form.alertBeforeDays}
                  onChange={(e) => update('alertBeforeDays', e.target.value)}
                  className="input"
                  placeholder="90, 30, 7"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Valeurs par défaut, utilisées par les catégories qui ne définissent pas leurs propres seuils.
                </p>
              </div>

              <div>
                <label className="label">Relance des documents à supprimer (jours)</label>
                <input
                  type="number"
                  min="0"
                  value={form.repeatExpiredDays}
                  onChange={(e) => update('repeatExpiredDays', parseInt(e.target.value, 10))}
                  className="input"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Fréquence des relances tant qu'un document en dépassement n'a pas été traité (0 = une seule alerte).
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoDeleteEnabled}
                  onChange={(e) => update('autoDeleteEnabled', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Autoriser la mise en corbeille automatique
                  <span className="block text-gray-500 dark:text-gray-400">
                    Ne s'applique qu'aux catégories dont l'action à échéance est « Mettre en corbeille automatiquement ».
                    Les documents restent récupérables depuis la corbeille.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emailEnabled}
                  onChange={(e) => update('emailEnabled', e.target.checked)}
                  className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Envoyer une synthèse par email aux administrateurs
                </span>
              </label>

              <div>
                <label className="label">Destinataires supplémentaires</label>
                <input
                  type="text"
                  value={form.extraEmails}
                  onChange={(e) => update('extraEmails', e.target.value)}
                  className="input"
                  placeholder="dpo@collectivite.fr, archives@collectivite.fr"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button onClick={onClose} className="btn-secondary">Annuler</button>
                <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary">
                  {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
