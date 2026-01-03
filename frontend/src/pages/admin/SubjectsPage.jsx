import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { subjectsAPI } from '../../services/api';
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
  TagIcon
} from '@heroicons/react/24/outline';

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', page, search],
    queryFn: async () => {
      const response = await subjectsAPI.getAll({ page, limit: 20, search });
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingSubject(null);
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setShowModal(true);
  };

  if (isLoading) return <LoadingSpinner />;

  const subjects = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des objets</h1>
          <p className="text-gray-600 mt-1">
            {pagination?.total || 0} objet(s) au total
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouvel objet
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un objet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Objet
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    Aucun objet trouvé
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: subject.color ? `${subject.color}20` : '#E0E7FF' }}
                        >
                          <TagIcon 
                            className="w-5 h-5" 
                            style={{ color: subject.color || '#4F46E5' }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{subject.name}</p>
                          {subject.code && (
                            <p className="text-sm text-gray-500">{subject.code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 text-sm truncate max-w-xs">
                        {subject.description || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subject.category ? (
                        <span className="badge badge-primary">{subject.category}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${subject.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {subject.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(subject)}
                          className="btn-icon text-gray-500 hover:text-primary-600"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(subject)}
                          className="btn-icon text-gray-500 hover:text-danger-600"
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

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* Subject Modal */}
      <AnimatePresence>
        {showModal && (
          <SubjectModal
            subject={editingSubject}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-danger-100 mx-auto mb-4 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-danger-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Supprimer l'objet ?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.name}</strong> ?
                    Cette action est irréversible.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(deleteConfirm._id)}
                      disabled={deleteMutation.isLoading}
                      className="btn-danger"
                    >
                      {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
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

// Subject Modal Component
function SubjectModal({ subject, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: subject?.name || '',
    code: subject?.code || '',
    description: subject?.description || '',
    category: subject?.category || '',
    color: subject?.color || '#4F46E5',
    isActive: subject?.isActive ?? true
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (subject) {
        return subjectsAPI.update(subject._id, data);
      }
      return subjectsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name) newErrors.name = 'Le nom est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  const predefinedColors = [
    '#4F46E5', // Indigo
    '#0EA5E9', // Sky
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Purple
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  const categories = [
    'Facture',
    'Contrat',
    'Courrier administratif',
    'Demande',
    'Information',
    'Réclamation',
    'Autre'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {subject ? 'Modifier l\'objet' : 'Nouvel objet'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`input ${errors.name ? 'border-danger-500' : ''}`}
                  placeholder="Nom de l'objet"
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
                  placeholder="CODE"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[80px]"
                placeholder="Description de l'objet"
              />
            </div>

            <div>
              <label className="label">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="input"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-gray-700">Objet actif</label>
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
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
                    {subject ? 'Mettre à jour' : 'Créer'}
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
