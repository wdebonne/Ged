import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { servicesAPI, usersAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => servicesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingService(null);
    setShowModal(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setShowModal(true);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des services</h1>
          <p className="text-gray-600 mt-1">
            {services?.length || 0} service(s) configuré(s)
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouveau service
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service, index) => (
          <motion.div
            key={service._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${service.color}20` }}
                >
                  <BuildingOfficeIcon
                    className="w-6 h-6"
                    style={{ color: service.color }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500">{service.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(service)}
                  className="btn-icon text-gray-500 hover:text-primary-600"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(service)}
                  className="btn-icon text-gray-500 hover:text-danger-600"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {service.description && (
              <p className="text-sm text-gray-600 mb-4">{service.description}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {service.usersCount || 0} utilisateur(s)
              </span>
              <span className="text-gray-500">
                {service.mailsCount || 0} courrier(s)
              </span>
            </div>

            {service.supervisors?.length > 0 && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">
                  Responsable(s) : {service.supervisors.map(s => `${s.firstName} ${s.lastName}`).join(', ')}
                </span>
                {service.notifySupervisor && (
                  <BellIcon className="w-4 h-4 text-green-500 flex-shrink-0" title="Notifications activées" />
                )}
              </div>
            )}

            {service.email && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500">Email: {service.email}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Service Modal */}
      <AnimatePresence>
        {showModal && (
          <ServiceModal
            service={editingService}
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
                  Supprimer le service ?
                </h3>
                <p className="text-gray-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer le service <strong>{deleteConfirm.name}</strong> ?
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

// Service Modal Component
function ServiceModal({ service, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: service?.name || '',
    code: service?.code || '',
    description: service?.description || '',
    email: service?.email || '',
    color: service?.color || '#6366f1',
    isActive: service?.isActive ?? true,
    supervisors: service?.supervisors?.map(s => s._id) || [],
    notifySupervisor: service?.notifySupervisor ?? true
  });
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    usersAPI.getAll({ isActive: true })
      .then(response => {
        // La structure est response.data.data.users
        const usersList = response.data?.data?.users || response.data?.data || [];
        setUsers(Array.isArray(usersList) ? usersList : []);
      })
      .catch(err => {
        console.error('Erreur chargement utilisateurs:', err);
        setUsers([]);
      })
      .finally(() => {
        setIsLoadingUsers(false);
      });
  }, []);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = { ...data };
      if (!cleanData.supervisors?.length) {
        cleanData.supervisors = [];
      }
      if (service) {
        return servicesAPI.update(service._id, cleanData);
      }
      return servicesAPI.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
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
    if (!formData.code) newErrors.code = 'Le code est requis';

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
            {service ? 'Modifier le service' : 'Nouveau service'}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Nom du service *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`input ${errors.name ? 'border-danger-500' : ''}`}
                placeholder="Ex: Direction Générale"
              />
              {errors.name && <p className="text-sm text-danger-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className={`input ${errors.code ? 'border-danger-500' : ''}`}
                placeholder="DG"
              />
              {errors.code && <p className="text-sm text-danger-600 mt-1">{errors.code}</p>}
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="Description du service..."
            />
          </div>

          <div>
            <label className="label">Email du service</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input"
              placeholder="service@exemple.com"
            />
          </div>

          <div>
            <label className="label">Couleur</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-10 rounded-lg border cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="input flex-1"
              />
              <div 
                className="w-10 h-10 rounded-lg"
                style={{ backgroundColor: formData.color }}
              />
            </div>
          </div>

          {/* Responsable(s) */}
          <div>
            <label className="label">Responsable(s)</label>
            {isLoadingUsers ? (
              <p className="text-sm text-gray-500 p-3">Chargement...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto border border-gray-200">
                {Array.isArray(users) && users.map(u => (
                  <label key={u._id} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={formData.supervisors.includes(u._id)}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        supervisors: prev.supervisors.includes(u._id)
                          ? prev.supervisors.filter(id => id !== u._id)
                          : [...prev.supervisors, u._id]
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 truncate">
                      {u.firstName} {u.lastName}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Les responsables recevront un email lors de l'arrivée d'un nouveau courrier pour ce service
            </p>
          </div>

          {/* Notification responsables */}
          {formData.supervisors.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifySupervisor"
                checked={formData.notifySupervisor}
                onChange={(e) => setFormData(prev => ({ ...prev, notifySupervisor: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="notifySupervisor" className="text-gray-700 flex items-center gap-2">
                <BellIcon className="w-4 h-4" />
                Notifier les responsables par email
              </label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-gray-700">Service actif</label>
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
                  {service ? 'Mettre à jour' : 'Créer'}
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
