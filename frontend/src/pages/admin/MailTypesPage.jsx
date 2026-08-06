import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { mailTypesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  InboxStackIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

export default function MailTypesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ['mail-types', search],
    queryFn: async () => {
      const response = await mailTypesAPI.getAll({ search });
      return response.data.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => mailTypesAPI.delete(id, { force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-types'] });
      queryClient.invalidateQueries({ queryKey: ['mail-type-options'] });
      queryClient.invalidateQueries({ queryKey: ['mails'] });
      setDeleteConfirm(null);
      toast.success('Type supprimé');
    },
    onError: (error) => {
      // 409 : des courriers utilisent encore ce type, on propose de forcer
      if (error.response?.status === 409) {
        setDeleteConfirm(prev => prev && {
          ...prev,
          linkedMails: error.response.data?.data?.linkedMails || 0,
          needsForce: true
        });
        return;
      }
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });

  const openCreateModal = () => {
    setEditingType(null);
    setShowModal(true);
  };

  const openEditModal = (type) => {
    setEditingType(type);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Types de document</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {types?.length || 0} type(s) — proposés à l'enregistrement d'un courrier et dans les filtres de recherche
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouveau type
        </button>
      </div>

      {/* Recherche */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un type..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <LoadingSpinner />
      ) : types?.length === 0 ? (
        <EmptyState
          icon={InboxStackIcon}
          title="Aucun type"
          description="Créez un premier type de document (Courrier, Email, Note interne…)."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types?.map((type, index) => (
            <motion.div
              key={type._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.4) }}
              className={`card p-6 ${type.isActive ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${type.color}20` }}
                  >
                    <InboxStackIcon className="w-6 h-6" style={{ color: type.color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{type.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{type.code || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(type)}
                    className="btn-icon text-gray-500 dark:text-gray-400 hover:text-primary-600"
                    title="Modifier"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(type)}
                    className="btn-icon text-gray-500 dark:text-gray-400 hover:text-danger-600"
                    title="Supprimer"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {type.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{type.description}</p>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {type.mailCount || 0} courrier(s)
                </span>
                <div className="flex items-center gap-2">
                  {type.isDefault && (
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                      <StarSolidIcon className="w-3.5 h-3.5" />
                      Par défaut
                    </span>
                  )}
                  {!type.isActive && (
                    <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Inactif
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modale création / modification */}
      <AnimatePresence>
        {showModal && (
          <MailTypeModal
            mailType={editingType}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Confirmation de suppression */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-danger-900/40 mx-auto mb-4 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-danger-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Supprimer le type ?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {deleteConfirm.needsForce ? (
                      <>
                        <strong>{deleteConfirm.linkedMails}</strong> courrier(s) utilisent le type{' '}
                        <strong>{deleteConfirm.name}</strong>. Ils ne seront pas supprimés mais perdront leur type.
                      </>
                    ) : (
                      <>
                        Êtes-vous sûr de vouloir supprimer le type <strong>{deleteConfirm.name}</strong> ?
                        Cette action est irréversible.
                      </>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                      Annuler
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate({
                        id: deleteConfirm._id,
                        force: !!deleteConfirm.needsForce
                      })}
                      disabled={deleteMutation.isLoading}
                      className="btn-danger"
                    >
                      {deleteMutation.isLoading
                        ? 'Suppression...'
                        : deleteConfirm.needsForce ? 'Supprimer quand même' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const COLOR_PRESETS = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#64748B', '#6B7280'];

function MailTypeModal({ mailType, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: mailType?.name || '',
    code: mailType?.code || '',
    description: mailType?.description || '',
    color: mailType?.color || '#4F46E5',
    order: mailType?.order ?? 0,
    isActive: mailType?.isActive ?? true,
    isDefault: mailType?.isDefault ?? false
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) => mailType
      ? mailTypesAPI.update(mailType._id, data)
      : mailTypesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-types'] });
      queryClient.invalidateQueries({ queryKey: ['mail-type-options'] });
      toast.success(mailType ? 'Type mis à jour' : 'Type créé');
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Le nom est requis' });
      return;
    }
    mutation.mutate({ ...formData, order: parseInt(formData.order, 10) || 0 });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mailType ? 'Modifier le type' : 'Nouveau type'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Nom du type *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`input ${errors.name ? 'border-danger-500' : ''}`}
                  placeholder="Ex : Note interne"
                />
                {errors.name && <p className="text-sm text-danger-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="label">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="input"
                  placeholder="NOTE"
                />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[70px]"
                placeholder="À quoi correspond ce type de document..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 rounded-lg border cursor-pointer"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-6 h-6 rounded-full border-2 ${formData.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Ordre d'affichage</label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-2 font-medium">
                  <StarIcon className="w-4 h-4" />
                  Type proposé par défaut
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Présélectionné à l'enregistrement d'un courrier. Un seul type peut l'être : l'ancien perdra ce statut.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Type actif (proposé dans les listes déroulantes)
              </span>
            </label>

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
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
                    {mailType ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
