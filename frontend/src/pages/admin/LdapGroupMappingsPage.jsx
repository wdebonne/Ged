import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ldapMappingsAPI, groupsAPI, servicesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

export default function LdapGroupMappingsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ldap-group-mappings'],
    queryFn: async () => {
      const response = await ldapMappingsAPI.getAll();
      return response.data;
    }
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupsAPI.getAll();
      return response.data;
    }
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ldapMappingsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ldap-group-mappings']);
      setDeleteConfirm(null);
    }
  });

  const openCreateModal = () => {
    setEditingMapping(null);
    setShowModal(true);
  };

  const openEditModal = (mapping) => {
    setEditingMapping(mapping);
    setShowModal(true);
  };

  if (isLoading) return <LoadingSpinner />;

  const mappings = data?.data || [];
  const groups = groupsData?.data || [];
  const services = servicesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correspondances LDAP</h1>
          <p className="text-gray-600 mt-1">
            Attribuez automatiquement un rôle et des services GED en fonction des groupes AD/LDAP de l'utilisateur
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouvelle correspondance
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Groupe AD
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rôle GED
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Services accessibles
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Superviseur de
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actif
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Aucune correspondance définie
                  </td>
                </tr>
              ) : (
                mappings.map((mapping) => (
                  <tr key={mapping._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <LinkIcon className="w-5 h-5 text-primary-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {mapping.ldapGroupName || mapping.ldapGroupDN}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{mapping.ldapGroupDN}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mapping.gedGroup ? (
                        <span
                          className="badge"
                          style={{ backgroundColor: `${mapping.gedGroup.color}20`, color: mapping.gedGroup.color }}
                        >
                          {mapping.gedGroup.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {mapping.services?.length > 0 ? (
                          mapping.services.map((service) => (
                            <span
                              key={service._id}
                              className="badge"
                              style={{ backgroundColor: `${service.color}20`, color: service.color }}
                            >
                              {service.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {mapping.supervisorServices?.length > 0 ? (
                          mapping.supervisorServices.map((service) => (
                            <span
                              key={service._id}
                              className="badge"
                              style={{ backgroundColor: `${service.color}20`, color: service.color }}
                            >
                              {service.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {mapping.priority}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {mapping.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(mapping)}
                          className="btn-icon text-gray-500 hover:text-primary-600"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(mapping)}
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

      {/* Mapping Modal */}
      <AnimatePresence>
        {showModal && (
          <MappingModal
            mapping={editingMapping}
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
                    Supprimer cette correspondance ?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Êtes-vous sûr de vouloir supprimer la correspondance pour{' '}
                    <strong>{deleteConfirm.ldapGroupName || deleteConfirm.ldapGroupDN}</strong> ?
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

// Mapping Modal Component
function MappingModal({ mapping, groups, services, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    ldapGroupDN: mapping?.ldapGroupDN || '',
    ldapGroupName: mapping?.ldapGroupName || '',
    description: mapping?.description || '',
    gedGroup: mapping?.gedGroup?._id || '',
    services: mapping?.services?.map((s) => s._id) || [],
    supervisorServices: mapping?.supervisorServices?.map((s) => s._id) || [],
    priority: mapping?.priority ?? 0,
    isActive: mapping?.isActive ?? true
  });
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (mapping) {
        return ldapMappingsAPI.update(mapping._id, data);
      }
      return ldapMappingsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ldap-group-mappings']);
      onClose();
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    }
  });

  const toggleService = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((id) => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const toggleSupervisorService = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      supervisorServices: prev.supervisorServices.includes(serviceId)
        ? prev.supervisorServices.filter((id) => id !== serviceId)
        : [...prev.supervisorServices, serviceId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.ldapGroupDN.trim()) newErrors.ldapGroupDN = 'Le DN du groupe LDAP est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate({
      ...formData,
      gedGroup: formData.gedGroup || null,
      priority: parseInt(formData.priority) || 0
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {mapping ? 'Modifier la correspondance' : 'Nouvelle correspondance'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="label">DN du groupe LDAP *</label>
              <input
                type="text"
                value={formData.ldapGroupDN}
                onChange={(e) => setFormData((prev) => ({ ...prev, ldapGroupDN: e.target.value }))}
                className={`input ${errors.ldapGroupDN ? 'border-danger-500' : ''}`}
                placeholder="cn=Compta,ou=group,dc=exemple,dc=com"
              />
              {errors.ldapGroupDN && <p className="text-sm text-danger-600 mt-1">{errors.ldapGroupDN}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Récupérez le DN via Paramètres &gt; LDAP &gt; "Lister les groupes AD"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nom (optionnel)</label>
                <input
                  type="text"
                  value={formData.ldapGroupName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ldapGroupName: e.target.value }))}
                  className="input"
                  placeholder="Compta"
                />
              </div>
              <div>
                <label className="label">Priorité</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  En cas de conflit entre correspondances, la priorité la plus élevée définit le rôle
                </p>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="input"
                placeholder="Ex: Responsables du service Comptabilité"
              />
            </div>

            <div>
              <label className="label">Rôle GED à attribuer</label>
              <select
                value={formData.gedGroup}
                onChange={(e) => setFormData((prev) => ({ ...prev, gedGroup: e.target.value }))}
                className="input"
              >
                <option value="">-- Aucun --</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Services accessibles</label>
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                {services.length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-2">Aucun service disponible</p>
                ) : (
                  services.map((service) => (
                    <label key={service._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service._id)}
                        onChange={() => toggleService(service._id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{service.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="label">Devient superviseur de</label>
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                {services.length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-2">Aucun service disponible</p>
                ) : (
                  services.map((service) => (
                    <label key={service._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supervisorServices.includes(service._id)}
                        onChange={() => toggleSupervisorService(service._id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{service.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mappingActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="mappingActive" className="text-gray-700">Correspondance active</label>
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
                    {mapping ? 'Mettre à jour' : 'Créer'}
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
