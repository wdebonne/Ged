import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { mailsAPI, usersAPI, servicesAPI } from '../services/api';
import TagInput from './TagInput';
import {
  ArchiveBoxIcon,
  UserPlusIcon,
  TagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Barre d'actions groupées affichée quand des courriers sont sélectionnés dans une liste.
// actions : sous-ensemble de ['archive', 'reassign', 'tag'] selon la page.
export default function BulkActionsBar({ selectedIds, onClear, actions = [] }) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // 'reassign' | 'tag' | null
  const [recipientId, setRecipientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [tags, setTags] = useState([]);
  const [tagMode, setTagMode] = useState('add');

  const { data: recipients } = useQuery({
    queryKey: ['recipients-all'],
    queryFn: async () => {
      const res = await usersAPI.getRecipients({ limit: 500 });
      return res.data.data || [];
    },
    enabled: modal === 'reassign'
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await servicesAPI.getAll();
      return res.data.data || [];
    },
    enabled: modal === 'reassign'
  });

  const closeModal = () => {
    setModal(null);
    setRecipientId('');
    setServiceId('');
    setTags([]);
    setTagMode('add');
  };

  const bulkMutation = useMutation({
    mutationFn: (payload) => mailsAPI.bulkAction(payload),
    onSuccess: (response) => {
      const { done = [], skipped = [] } = response.data.data || {};
      if (done.length > 0) {
        toast.success(`${done.length} courrier(s) traité(s)`);
      }
      if (skipped.length > 0) {
        toast.error(`${skipped.length} ignoré(s) — ${skipped[0].reason}`, { duration: 5000 });
      }
      queryClient.invalidateQueries(['mails']);
      closeModal();
      onClear();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'action groupée');
    }
  });

  const handleArchive = () => {
    if (window.confirm(`Archiver les ${selectedIds.length} courrier(s) sélectionné(s) ?`)) {
      bulkMutation.mutate({ ids: selectedIds, action: 'archive' });
    }
  };

  const handleReassign = (e) => {
    e.preventDefault();
    if (!recipientId) {
      toast.error('Sélectionnez un destinataire');
      return;
    }
    bulkMutation.mutate({
      ids: selectedIds,
      action: 'reassign',
      recipientId,
      serviceId: serviceId || undefined
    });
  };

  const handleTag = (e) => {
    e.preventDefault();
    if (tags.length === 0) {
      toast.error('Ajoutez au moins un tag');
      return;
    }
    bulkMutation.mutate({ ids: selectedIds, action: 'tag', tags, tagMode });
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Barre flottante */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3"
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.length} sélectionné(s)
          </span>
          <div className="w-px h-6 bg-gray-700" />
          {actions.includes('archive') && (
            <button
              onClick={handleArchive}
              disabled={bulkMutation.isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              Archiver
            </button>
          )}
          {actions.includes('reassign') && (
            <button
              onClick={() => setModal('reassign')}
              disabled={bulkMutation.isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <UserPlusIcon className="w-4 h-4" />
              Réattribuer
            </button>
          )}
          {actions.includes('tag') && (
            <button
              onClick={() => setModal('tag')}
              disabled={bulkMutation.isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <TagIcon className="w-4 h-4" />
              Taguer
            </button>
          )}
          <div className="w-px h-6 bg-gray-700" />
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Annuler la sélection"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Modal réattribution */}
      {modal === 'reassign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserPlusIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Réattribuer</h2>
                  <p className="text-sm text-gray-500">{selectedIds.length} courrier(s) sélectionné(s)</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleReassign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau destinataire *
                </label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Sélectionner un destinataire…</option>
                  {(recipients || []).map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.lastName?.toUpperCase()} {u.firstName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau service <span className="text-gray-400">(optionnel)</span>
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Conserver le service actuel</option>
                  {(services || []).map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={bulkMutation.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {bulkMutation.isLoading ? 'Réattribution…' : 'Réattribuer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal tags */}
      {modal === 'tag' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <TagIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Taguer</h2>
                  <p className="text-sm text-gray-500">{selectedIds.length} courrier(s) sélectionné(s)</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleTag} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <TagInput value={tags} onChange={setTags} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagMode === 'add'}
                    onChange={() => setTagMode('add')}
                  />
                  Ajouter
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="tagMode"
                    checked={tagMode === 'remove'}
                    onChange={() => setTagMode('remove')}
                  />
                  Retirer
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={bulkMutation.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {bulkMutation.isLoading ? 'Application…' : 'Appliquer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}

// Case à cocher de sélection insérée dans une carte de liste (dans un <Link>) :
// stoppe la navigation et bascule la sélection.
export function SelectCheckbox({ checked, onToggle }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => {}}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0"
    />
  );
}

// Ligne « tout sélectionner » affichée au-dessus d'une liste
export function SelectAllRow({ pageIds, selectedIds, onChange }) {
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={() => {
          if (allSelected) {
            onChange(selectedIds.filter(id => !pageIds.includes(id)));
          } else {
            onChange([...new Set([...selectedIds, ...pageIds])]);
          }
        }}
        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      Tout sélectionner sur cette page
      {selectedIds.length > 0 && (
        <span className="text-primary-600 font-medium">({selectedIds.length})</span>
      )}
    </label>
  );
}
