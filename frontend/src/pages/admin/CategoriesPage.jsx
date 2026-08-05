import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { categoriesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ClockIcon,
  ScaleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const UNIT_LABELS = {
  days: 'jour(s)',
  months: 'mois',
  years: 'an(s)'
};

const START_POINT_LABELS = {
  receivedDate: 'Date de réception',
  processedDate: 'Date de traitement',
  archivedDate: "Date d'archivage",
  createdAt: "Date d'enregistrement"
};

const EXPIRY_ACTION_LABELS = {
  notify: 'Alerter seulement',
  auto_trash: 'Mettre en corbeille automatiquement'
};

const retentionLabel = (category) => {
  if (!category?.retentionEnabled || !category?.retentionDuration) return 'Illimitée';
  return `${category.retentionDuration} ${UNIT_LABELS[category.retentionUnit] || category.retentionUnit}`;
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [flash, setFlash] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', page, search],
    queryFn: async () => {
      const response = await categoriesAPI.getAll({ page, limit: 20, search });
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => categoriesAPI.delete(id, { force }),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['subjects']);
      setDeleteConfirm(null);
      setDeleteError(null);
    },
    onError: (error) => {
      const response = error.response?.data;
      // 409 : des objets utilisent encore la catégorie, on propose le détachement
      if (error.response?.status === 409) {
        setDeleteError({ linkedSubjects: response?.data?.linkedSubjects || 0, message: response?.message });
      } else {
        setDeleteError({ message: response?.message || 'Erreur lors de la suppression' });
      }
    }
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const categories = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestion des catégories</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {pagination?.total || 0} catégorie(s) — chaque catégorie porte la durée légale de conservation RGPD de ses documents
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouvelle catégorie
        </button>
      </div>

      {flash && (
        <div className="card p-4 border-l-4 border-warning-500 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-warning-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{flash}</div>
          <button onClick={() => setFlash(null)} className="btn-icon">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher une catégorie, un code, une base légale..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Conservation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Base légale</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Utilisation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Aucune catégorie trouvée
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: category.color ? `${category.color}20` : '#E0E7FF' }}
                        >
                          <Squares2X2Icon className="w-5 h-5" style={{ color: category.color || '#4F46E5' }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                          {category.code && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{category.code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {category.retentionEnabled && category.retentionDuration ? (
                        <div>
                          <span className="badge badge-primary">{retentionLabel(category)}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            à partir de : {START_POINT_LABELS[category.retentionStartFrom] || category.retentionStartFrom}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {EXPIRY_ACTION_LABELS[category.expiryAction]}
                          </p>
                        </div>
                      ) : (
                        <span className="badge badge-gray">Illimitée</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                        {category.legalBasis || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <p className="text-gray-700 dark:text-gray-300">{category.subjectCount} objet(s)</p>
                      <p className="text-gray-500 dark:text-gray-400">{category.documentCount} document(s)</p>
                      {category.expiredCount > 0 && (
                        <span className="badge badge-danger mt-1 inline-block">
                          {category.expiredCount} à supprimer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${category.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="btn-icon text-gray-500 dark:text-gray-400 hover:text-primary-600"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(category); setDeleteError(null); }}
                          className="btn-icon text-gray-500 dark:text-gray-400 hover:text-danger-600"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      <AnimatePresence>
        {showModal && (
          <CategoryModal
            category={editingCategory}
            onClose={() => setShowModal(false)}
            onSaved={(message) => setFlash(message)}
          />
        )}
      </AnimatePresence>

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
                    Supprimer la catégorie ?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    <strong>{deleteConfirm.name}</strong> sera supprimée. Les documents ne seront pas supprimés,
                    mais ils ne seront plus soumis à une durée de conservation.
                  </p>

                  {deleteError?.linkedSubjects > 0 && (
                    <div className="text-left text-sm p-3 mb-4 rounded-lg bg-warning-50 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200">
                      {deleteError.linkedSubjects} objet(s) utilisent cette catégorie. Confirmez pour les détacher.
                    </div>
                  )}
                  {deleteError && !deleteError.linkedSubjects && (
                    <div className="text-left text-sm p-3 mb-4 rounded-lg bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300">
                      {deleteError.message}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                      Annuler
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate({
                        id: deleteConfirm._id,
                        force: Boolean(deleteError?.linkedSubjects)
                      })}
                      disabled={deleteMutation.isPending}
                      className="btn-danger"
                    >
                      {deleteMutation.isPending
                        ? 'Suppression...'
                        : deleteError?.linkedSubjects
                          ? 'Détacher et supprimer'
                          : 'Supprimer'}
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

// ---------------------------------------------------------------------------
// Modal de création / modification
// ---------------------------------------------------------------------------

function CategoryModal({ category, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
    color: category?.color || '#4F46E5',
    isActive: category?.isActive ?? true,
    retentionEnabled: category?.retentionEnabled ?? false,
    retentionDuration: category?.retentionDuration ?? '',
    retentionUnit: category?.retentionUnit || 'years',
    retentionStartFrom: category?.retentionStartFrom || 'receivedDate',
    legalBasis: category?.legalBasis || '',
    expiryAction: category?.expiryAction || 'notify',
    alertBeforeDays: (category?.alertBeforeDays || []).join(', '),
    changeReason: ''
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const retentionChanged = category && (
    formData.retentionEnabled !== category.retentionEnabled
    || String(formData.retentionDuration) !== String(category.retentionDuration ?? '')
    || formData.retentionUnit !== category.retentionUnit
    || formData.retentionStartFrom !== category.retentionStartFrom
  );

  // Simulation d'impact : combien de documents déjà enregistrés dépasseraient la
  // nouvelle durée. Débounce court pour ne pas interroger l'API à chaque frappe.
  useEffect(() => {
    if (!category || !formData.retentionEnabled || !formData.retentionDuration || !retentionChanged) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const response = await categoriesAPI.previewRetention(category._id, {
          retentionDuration: formData.retentionDuration,
          retentionUnit: formData.retentionUnit,
          retentionStartFrom: formData.retentionStartFrom
        });
        setPreview(response.data.data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [category, formData.retentionDuration, formData.retentionUnit, formData.retentionStartFrom, formData.retentionEnabled, retentionChanged]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        retentionDuration: data.retentionDuration === '' ? null : parseInt(data.retentionDuration, 10),
        alertBeforeDays: data.alertBeforeDays
      };
      if (category) return categoriesAPI.update(category._id, payload);
      return categoriesAPI.create(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['rgpd-overview']);
      queryClient.invalidateQueries(['rgpd-alerts']);
      queryClient.invalidateQueries(['stats']);
      const impact = response.data?.impact;
      if (impact?.newlyExpired > 0) {
        onSaved?.(`${impact.newlyExpired} document(s) dépassent désormais la durée légale de conservation. Retrouvez-les dans « Conformité RGPD ».`);
      }
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (formData.retentionEnabled) {
      const duration = parseInt(formData.retentionDuration, 10);
      if (!Number.isFinite(duration) || duration <= 0) {
        newErrors.retentionDuration = 'Indiquez une durée de conservation valide';
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    mutation.mutate(formData);
  };

  const predefinedColors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316'];

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`input ${errors.name ? 'border-danger-500' : ''}`}
                  placeholder="Ex : Facture"
                />
                {errors.name && <p className="text-sm text-danger-600 mt-1">{errors.name}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="label">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="input"
                  placeholder="FACT"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[70px]"
                placeholder="Description de la catégorie"
              />
            </div>

            <div>
              <label className="label">Couleur</label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
              </div>
            </div>

            {/* ---- Conservation RGPD ---- */}
            <div className="border-t dark:border-gray-700 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <ScaleIcon className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Durée légale de conservation (RGPD)</h3>
              </div>

              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.retentionEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, retentionEnabled: e.target.checked }))}
                  className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Appliquer une durée de conservation aux documents de cette catégorie
                  <span className="block text-gray-500 dark:text-gray-400">
                    Toute modification est rétroactive : les échéances des documents déjà enregistrés sont recalculées immédiatement.
                  </span>
                </span>
              </label>

              {formData.retentionEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Durée *</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.retentionDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, retentionDuration: e.target.value }))}
                        className={`input ${errors.retentionDuration ? 'border-danger-500' : ''}`}
                        placeholder="3"
                      />
                      {errors.retentionDuration && <p className="text-sm text-danger-600 mt-1">{errors.retentionDuration}</p>}
                    </div>
                    <div>
                      <label className="label">Unité</label>
                      <select
                        value={formData.retentionUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, retentionUnit: e.target.value }))}
                        className="input"
                      >
                        <option value="days">Jours</option>
                        <option value="months">Mois</option>
                        <option value="years">Années</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Point de départ du décompte</label>
                    <select
                      value={formData.retentionStartFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, retentionStartFrom: e.target.value }))}
                      className="input"
                    >
                      {Object.entries(START_POINT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Base légale</label>
                    <input
                      type="text"
                      value={formData.legalBasis}
                      onChange={(e) => setFormData(prev => ({ ...prev, legalBasis: e.target.value }))}
                      className="input"
                      placeholder="Ex : Art. L123-22 Code de commerce — 10 ans"
                    />
                  </div>

                  <div>
                    <label className="label">À l'échéance</label>
                    <select
                      value={formData.expiryAction}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryAction: e.target.value }))}
                      className="input"
                    >
                      {Object.entries(EXPIRY_ACTION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {formData.expiryAction === 'auto_trash' && (
                      <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                        La suppression automatique nécessite aussi d'être activée globalement dans « Conformité RGPD ».
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label">Rappels avant échéance (en jours)</label>
                    <input
                      type="text"
                      value={formData.alertBeforeDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, alertBeforeDays: e.target.value }))}
                      className="input"
                      placeholder="90, 30, 7"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Laissez vide pour utiliser les seuils globaux définis dans « Conformité RGPD ».
                    </p>
                  </div>

                  {category && retentionChanged && (
                    <div>
                      <label className="label">Motif du changement</label>
                      <input
                        type="text"
                        value={formData.changeReason}
                        onChange={(e) => setFormData(prev => ({ ...prev, changeReason: e.target.value }))}
                        className="input"
                        placeholder="Ex : mise à jour de la durée légale (3 ans → 2 ans)"
                      />
                    </div>
                  )}

                  {/* Impact rétroactif du changement de durée */}
                  {previewLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Calcul de l'impact sur les documents existants...
                    </div>
                  )}
                  {preview && !previewLoading && (
                    <div className={`p-4 rounded-lg text-sm ${
                      preview.newlyExpiredCount > 0
                        ? 'bg-warning-50 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        <ClockIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">
                            {preview.newlyExpiredCount > 0
                              ? `${preview.newlyExpiredCount} document(s) dépasseront immédiatement la durée légale`
                              : 'Aucun document existant ne devient immédiatement supprimable'}
                          </p>
                          <p className="mt-1">
                            {preview.totalDocuments} document(s) dans cette catégorie · {preview.expiredCount} au total au-delà de la nouvelle durée
                            {preview.currentExpiredCount > 0 && ` (${preview.currentExpiredCount} l'étaient déjà)`}
                          </p>
                          {preview.sample?.length > 0 && (
                            <ul className="mt-2 space-y-0.5 text-xs">
                              {preview.sample.map((doc) => (
                                <li key={doc.id}>
                                  {doc.reference || doc.chronoNumber} — {doc.subject}
                                  {' · échéance '}
                                  {new Date(doc.expiryDate).toLocaleDateString('fr-FR')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t dark:border-gray-700 pt-4">
              <input
                type="checkbox"
                id="categoryActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="categoryActive" className="text-gray-700 dark:text-gray-300">Catégorie active</label>
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/40 text-danger-700 dark:text-danger-300 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
                {mutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {category ? 'Mettre à jour' : 'Créer'}
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
