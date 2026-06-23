import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { contactsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import {
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSender, setEditingSender] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: async () => {
      const response = await contactsAPI.getAll({ page, limit: 20, search });
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contactsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingSender(null);
    setShowModal(true);
  };

  const openEditModal = (sender) => {
    setEditingSender(sender);
    setShowModal(true);
  };

  if (isLoading) return <LoadingSpinner />;

  const senders = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des contacts</h1>
          <p className="text-gray-600 mt-1">
            {pagination?.total || 0} contact(s) au total
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <UserPlusIcon className="w-5 h-5" />
          Nouveau contact
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un contact..."
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
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
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
              {senders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    Aucun contact trouvé
                  </td>
                </tr>
              ) : (
                senders.map((sender) => (
                  <tr key={sender._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">
                            {sender.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sender.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600">
                        <BuildingOfficeIcon className="w-4 h-4" />
                        <span>{sender.organization || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {sender.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>{sender.email}</span>
                          </div>
                        )}
                        {sender.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{sender.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${sender.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {sender.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(sender)}
                          className="btn-icon text-gray-500 hover:text-primary-600"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sender)}
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

      {/* Sender Modal */}
      <AnimatePresence>
        {showModal && (
          <ContactModal
            sender={editingSender}
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
                    Supprimer le contact ?
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

// Contact Modal Component
function ContactModal({ sender, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: sender?.name || '',
    organization: sender?.organization || '',
    email: sender?.email || '',
    phone: sender?.phone || '',
    address: sender?.address || '',
    isActive: sender?.isActive ?? true
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (sender) {
        return contactsAPI.update(sender._id, data);
      }
      return contactsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
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
              {sender ? 'Modifier le contact' : 'Nouveau contact'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`input ${errors.name ? 'border-danger-500' : ''}`}
                placeholder="Nom du contact"
              />
              {errors.name && <p className="text-sm text-danger-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Organisation</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                className="input"
                placeholder="Nom de l'organisation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="01 23 45 67 89"
                />
              </div>
            </div>

            <div>
              <label className="label">Adresse</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="input min-h-[80px]"
                placeholder="Adresse postale"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-gray-700">Contact actif</label>
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
                    {sender ? 'Mettre à jour' : 'Créer'}
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
