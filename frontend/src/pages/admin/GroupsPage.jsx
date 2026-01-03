import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { groupsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  UserGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PERMISSIONS = {
  // Courriers
  view_own_mails: 'Voir ses courriers',
  view_service_mails: 'Voir les courriers du service',
  view_all_mails: 'Voir tous les courriers',
  process_mails: 'Traiter des courriers',
  archive_mails: 'Archiver des courriers',
  import_mails: 'Importer des courriers',
  delete_mails: 'Supprimer des courriers',
  export_mails: 'Exporter des courriers',
  silent_view: 'Consulter sans marquer comme lu',
  
  // Utilisateurs
  view_users: 'Voir les utilisateurs',
  create_users: 'Créer des utilisateurs',
  edit_users: 'Modifier des utilisateurs',
  delete_users: 'Supprimer des utilisateurs',
  
  // Groupes
  view_groups: 'Voir les groupes',
  create_groups: 'Créer des groupes',
  edit_groups: 'Modifier des groupes',
  delete_groups: 'Supprimer des groupes',
  
  // Services
  view_services: 'Voir les services',
  create_services: 'Créer des services',
  edit_services: 'Modifier des services',
  delete_services: 'Supprimer des services',
  
  // Expéditeurs
  view_senders: 'Voir les expéditeurs',
  create_senders: 'Créer des expéditeurs',
  edit_senders: 'Modifier des expéditeurs',
  delete_senders: 'Supprimer des expéditeurs',
  
  // Paramètres
  view_settings: 'Voir les paramètres',
  edit_settings: 'Modifier les paramètres',
  manage_settings: 'Gérer les paramètres',
  
  // LDAP/Kerberos/IMAP
  manage_ldap: 'Gérer LDAP',
  manage_kerberos: 'Gérer Kerberos',
  manage_imap: 'Gérer IMAP',
  
  // Statistiques
  view_stats: 'Voir les statistiques',
  view_all_stats: 'Voir toutes les statistiques'
};

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupsAPI.getAll();
      return response.data.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => groupsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des groupes</h1>
          <p className="text-gray-600 mt-1">
            Gérez les rôles et permissions des utilisateurs
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouveau groupe
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups?.map((group, index) => (
          <motion.div
            key={group._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${group.color || '#6366f1'}20` }}
                  >
                    <UserGroupIcon
                      className="w-6 h-6"
                      style={{ color: group.color || '#6366f1' }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.usersCount || 0} utilisateur(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(group)}
                    className="btn-icon text-gray-500 hover:text-primary-600"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  {!group.isDefault && (
                    <button
                      onClick={() => setDeleteConfirm(group)}
                      className="btn-icon text-gray-500 hover:text-danger-600"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {group.description && (
                <p className="text-sm text-gray-600 mb-4">{group.description}</p>
              )}

              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Permissions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(group.permissions || {})
                    .filter(([, value]) => value)
                    .map(([key]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 rounded-full bg-success-50 text-success-700"
                      >
                        {PERMISSIONS[key] || key}
                      </span>
                    ))
                  }
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Group Modal */}
      <AnimatePresence>
        {showModal && (
          <GroupModal
            group={editingGroup}
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
                  Supprimer le groupe ?
                </h3>
                <p className="text-gray-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer le groupe <strong>{deleteConfirm.name}</strong> ?
                  Les utilisateurs de ce groupe seront déplacés vers le groupe par défaut.
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

// Group Modal Component
function GroupModal({ group, onClose }) {
  const queryClient = useQueryClient();
  
  // Convertir le tableau de permissions en objet pour l'affichage
  const permissionsToObject = (permsArray) => {
    if (!permsArray || !Array.isArray(permsArray)) return {};
    return permsArray.reduce((acc, perm) => {
      acc[perm] = true;
      return acc;
    }, {});
  };
  
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    color: group?.color || '#6366f1',
    permissions: permissionsToObject(group?.permissions)
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (group) {
        return groupsAPI.update(group._id, data);
      }
      return groupsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      setErrors({ name: 'Le nom est requis' });
      return;
    }
    // Convertir l'objet permissions en tableau pour le backend
    const permissionsArray = Object.entries(formData.permissions)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
    
    mutation.mutate({
      ...formData,
      permissions: permissionsArray
    });
  };

  const togglePermission = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
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
            {group ? 'Modifier le groupe' : 'Nouveau groupe'}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Nom du groupe *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`input ${errors.name ? 'border-danger-500' : ''}`}
                placeholder="Ex: Superviseur"
              />
              {errors.name && <p className="text-sm text-danger-600 mt-1">{errors.name}</p>}
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
              </div>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="Description du groupe..."
            />
          </div>

          <div>
            <label className="label">Permissions</label>
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              {Object.entries(PERMISSIONS).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions[key] || false}
                    onChange={() => togglePermission(key)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
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
                  {group ? 'Mettre à jour' : 'Créer'}
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
