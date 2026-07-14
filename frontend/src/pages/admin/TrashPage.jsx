import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { trashAPI, settingsAPI } from '../../services/api';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  TrashIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Modal de confirmation pour les actions destructives (même pattern que BackupPage)
function ConfirmModal({ title, message, onConfirm, onCancel, isLoading = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
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
            className="btn bg-red-600 hover:bg-red-700 text-white border-transparent"
          >
            Confirmer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const TABS = [
  { type: 'mail', label: 'Courriers entrants' },
  { type: 'outgoing', label: 'Courriers sortants' },
];

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState('mail');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { kind: 'purge'|'empty', id? }
  const [retentionDraft, setRetentionDraft] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trash', type, page, search],
    queryFn: async () => {
      const res = await trashAPI.getAll({ type, page, limit: 20, search });
      return res.data.data;
    }
  });

  const savedRetentionDays = data?.retentionDays ?? 30;
  const retentionDays = retentionDraft ?? savedRetentionDays;

  const invalidate = () => {
    queryClient.invalidateQueries(['trash']);
  };

  const restoreMutation = useMutation({
    mutationFn: (id) => (type === 'outgoing' ? trashAPI.restoreOutgoing(id) : trashAPI.restoreMail(id)),
    onSuccess: () => {
      toast.success('Courrier restauré');
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la restauration'),
  });

  const purgeMutation = useMutation({
    mutationFn: (id) => (type === 'outgoing' ? trashAPI.purgeOutgoing(id) : trashAPI.purgeMail(id)),
    onSuccess: () => {
      toast.success('Élément supprimé définitivement');
      invalidate();
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
      setConfirmAction(null);
    },
  });

  const emptyMutation = useMutation({
    mutationFn: () => trashAPI.emptyTrash(type),
    onSuccess: () => {
      toast.success('Corbeille vidée');
      invalidate();
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Erreur lors du vidage');
      setConfirmAction(null);
    },
  });

  const saveRetentionMutation = useMutation({
    mutationFn: (value) => settingsAPI.update('trash_retention_days', { value, category: 'general' }),
    onSuccess: () => {
      toast.success('Durée de rétention mise à jour');
      setRetentionDraft(null);
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrashIcon className="w-6 h-6 text-gray-500" />
          Corbeille
        </h1>
        {data?.items?.length > 0 && (
          <button
            onClick={() => setConfirmAction({ kind: 'empty' })}
            className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm"
          >
            <TrashIcon className="w-4 h-4" />
            Vider cette corbeille
          </button>
        )}
      </div>

      {/* Réglage de rétention */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <ClockIcon className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-700">
          Les éléments sont supprimés définitivement après
        </span>
        <input
          type="number"
          min={0}
          value={retentionDays}
          onChange={(e) => setRetentionDraft(e.target.value)}
          onBlur={() => {
            if (retentionDraft !== null && retentionDraft !== '' && Number(retentionDraft) !== savedRetentionDays) {
              saveRetentionMutation.mutate(Number(retentionDraft));
            }
          }}
          className="input w-20 text-center"
        />
        <span className="text-sm text-gray-700">jours (0 = purge désactivée)</span>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => { setType(tab.type); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              type === tab.type
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par référence, objet..."
          className="input pl-10 w-full"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data?.items?.length === 0 ? (
        <EmptyState
          icon={TrashIcon}
          title="Corbeille vide"
          description={`Aucun courrier ${type === 'outgoing' ? 'sortant' : 'entrant'} en corbeille`}
        />
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
            {data?.items?.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="card p-4 border-l-4 border-red-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {item.chronoNumber || item.reference}
                        </span>
                        {item.daysRemaining !== null && (
                          <span className="badge bg-red-100 text-red-700">
                            {item.daysRemaining === 0 ? 'Purge imminente' : `${item.daysRemaining}j restants`}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{item.subject}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                        <span>{item.senderName || item.destinationName}</span>
                        <span>
                          Supprimé le {format(new Date(item.deletedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          {item.deletedBy && ` par ${item.deletedBy.firstName} ${item.deletedBy.lastName}`}
                        </span>
                        {item.service && (
                          <span
                            className="badge"
                            style={{ backgroundColor: `${item.service.color}20`, color: item.service.color }}
                          >
                            {item.service.name}
                          </span>
                        )}
                      </div>
                      {item.deleteReason && (
                        <p className="text-sm text-gray-500 mt-1 italic">Motif : {item.deleteReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreMutation.mutate(item._id)}
                        disabled={restoreMutation.isPending}
                        className="btn-icon"
                        title="Restaurer"
                      >
                        <ArrowUturnLeftIcon className="w-5 h-5 text-primary-600" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ kind: 'purge', id: item._id, label: item.subject })}
                        className="btn-icon"
                        title="Supprimer définitivement"
                      >
                        <TrashIcon className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {data?.pagination && (
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <AnimatePresence>
        {confirmAction?.kind === 'purge' && (
          <ConfirmModal
            title="Supprimer définitivement"
            message={`« ${confirmAction.label} » et son fichier seront supprimés définitivement. Cette action est irréversible.`}
            isLoading={purgeMutation.isPending}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => purgeMutation.mutate(confirmAction.id)}
          />
        )}
        {confirmAction?.kind === 'empty' && (
          <ConfirmModal
            title="Vider la corbeille"
            message={`Tous les courriers ${type === 'outgoing' ? 'sortants' : 'entrants'} actuellement en corbeille seront supprimés définitivement. Cette action est irréversible.`}
            isLoading={emptyMutation.isPending}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => emptyMutation.mutate()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
