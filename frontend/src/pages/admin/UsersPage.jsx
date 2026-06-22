import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI, groupsAPI, servicesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import {
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const response = await usersAPI.getAll({ page, limit: 20, search });
      return response.data.data;
    }
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupsAPI.getAll();
      return response.data.data;
    }
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const roleColors = {
    admin: 'bg-danger-100 text-danger-700',
    supervisor: 'bg-primary-100 text-primary-700',
    archiviste: 'bg-warning-100 text-warning-700',
    utilisateur: 'bg-gray-100 text-gray-700',
    observateur: 'bg-cyan-100 text-cyan-700'
  };

  const roleLabels = {
    admin: 'Administrateur',
    supervisor: 'Superviseur',
    archiviste: 'Archiviste',
    utilisateur: 'Utilisateur',
    observateur: 'Observateur'
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-600 mt-1">
            {data?.pagination?.total || 0} utilisateur(s) au total
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <UserPlusIcon className="w-5 h-5" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un utilisateur..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Groupe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.users?.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={`/uploads/${user.avatar}`}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-semibold">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.group ? (
                      <span 
                        className="badge"
                        style={{
                          backgroundColor: user.group.color ? `${user.group.color}20` : '#e5e7eb',
                          color: user.group.color || '#374151'
                        }}
                      >
                        {user.group.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.services?.slice(0, 2).map((service) => (
                        <span
                          key={service._id}
                          className="badge"
                          style={{
                            backgroundColor: `${service.color}20`,
                            color: service.color
                          }}
                        >
                          {service.name}
                        </span>
                      ))}
                      {user.services?.length > 2 && (
                        <span className="badge bg-gray-100 text-gray-600">
                          +{user.services.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="btn-icon text-gray-500 hover:text-primary-600"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user)}
                        className="btn-icon text-gray-500 hover:text-danger-600"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* User Modal */}
      <AnimatePresence>
        {showModal && (
          <UserModal
            user={editingUser}
            groups={groups}
            services={services}
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
                  Supprimer l'utilisateur ?
                </h3>
                <p className="text-gray-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong> ?
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

// User Modal Component
function UserModal({ user, groups, services, onClose }) {
  const queryClient = useQueryClient();
  
  // Trouver le groupe par défaut (Utilisateur ou le premier disponible)
  const defaultGroupId = user?.group?._id || 
    groups?.find(g => g.name === 'Utilisateur')?._id || 
    groups?.[0]?._id || '';

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    password: '',
    role: user?.role || 'utilisateur',
    group: defaultGroupId,
    services: user?.services?.map(s => s._id) || [],
    isActive: user?.isActive ?? true
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (user) {
        return usersAPI.update(user._id, data);
      }
      return usersAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.username) newErrors.username = 'Le nom d\'utilisateur est requis';
    if (!formData.email) newErrors.email = 'L\'email est requis';
    if (!formData.firstName) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName) newErrors.lastName = 'Le nom est requis';
    if (!user && !formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (!user && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    } else if (user && formData.password && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (!formData.group) newErrors.group = 'Le groupe est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Remove empty password if editing
    const dataToSend = { ...formData };
    if (!dataToSend.password) delete dataToSend.password;

    mutation.mutate(dataToSend);
  };

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className={`input ${errors.firstName ? 'border-danger-500' : ''}`}
              />
              {errors.firstName && <p className="text-sm text-danger-600 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className={`input ${errors.lastName ? 'border-danger-500' : ''}`}
              />
              {errors.lastName && <p className="text-sm text-danger-600 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="label">Nom d'utilisateur *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className={`input ${errors.username ? 'border-danger-500' : ''}`}
            />
            {errors.username && <p className="text-sm text-danger-600 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`input ${errors.email ? 'border-danger-500' : ''}`}
            />
            {errors.email && <p className="text-sm text-danger-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label">
              Mot de passe {user ? '(laisser vide pour ne pas modifier)' : '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={`input ${errors.password ? 'border-danger-500' : ''}`}
            />
            {errors.password && <p className="text-sm text-danger-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="label">Groupe *</label>
            <select
              value={formData.group}
              onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
              className={`input ${errors.group ? 'border-danger-500' : ''}`}
            >
              <option value="">Sélectionner un groupe</option>
              {groups?.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
            {errors.group && <p className="text-sm text-danger-600 mt-1">{errors.group}</p>}
          </div>

          <div>
            <label className="label">Services</label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
              {services?.map((service) => (
                <button
                  key={service._id}
                  type="button"
                  onClick={() => toggleService(service._id)}
                  className={`badge transition-all ${
                    formData.services.includes(service._id)
                      ? ''
                      : 'opacity-50'
                  }`}
                  style={{
                    backgroundColor: formData.services.includes(service._id) 
                      ? `${service.color}30` 
                      : '#f3f4f6',
                    color: formData.services.includes(service._id) 
                      ? service.color 
                      : '#6b7280',
                    borderColor: formData.services.includes(service._id) 
                      ? service.color 
                      : 'transparent'
                  }}
                >
                  {service.name}
                </button>
              ))}
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
            <label htmlFor="isActive" className="text-gray-700">Utilisateur actif</label>
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
                  {user ? 'Mettre à jour' : 'Créer'}
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
