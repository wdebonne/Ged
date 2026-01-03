import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { delegationsAPI, usersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  NoSymbolIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'bg-success-100 text-success-700',
    icon: CheckCircleIcon
  },
  pending: {
    label: 'Programmée',
    color: 'bg-warning-100 text-warning-700',
    icon: ClockIcon
  },
  expired: {
    label: 'Expirée',
    color: 'bg-gray-100 text-gray-600',
    icon: ClockIcon
  },
  revoked: {
    label: 'Révoquée',
    color: 'bg-danger-100 text-danger-700',
    icon: NoSymbolIcon
  }
};

export default function DelegationsTab() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(null);
  const [activeSection, setActiveSection] = useState('given'); // 'given' ou 'received'

  // Récupérer les délégations
  const { data: delegationsData, isLoading } = useQuery({
    queryKey: ['delegations'],
    queryFn: () => delegationsAPI.getAll('all')
  });

  const delegations = delegationsData?.data?.data || { given: [], received: [] };

  // Mutation pour créer une délégation
  const createMutation = useMutation({
    mutationFn: delegationsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      setShowCreateModal(false);
      toast.success('Délégation créée avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  });

  // Mutation pour révoquer une délégation
  const revokeMutation = useMutation({
    mutationFn: ({ id, note }) => delegationsAPI.revoke(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      setShowRevokeModal(null);
      toast.success('Délégation révoquée');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la révocation');
    }
  });

  // Mutation pour supprimer une délégation
  const deleteMutation = useMutation({
    mutationFn: delegationsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      toast.success('Délégation supprimée');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });

  const formatDate = (date) => {
    if (!date) return 'Indéfinie';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const DelegationCard = ({ delegation, isGiven }) => {
    const statusConfig = STATUS_CONFIG[delegation.status];
    const StatusIcon = statusConfig.icon;
    const otherUser = isGiven ? delegation.delegate : delegation.delegator;
    const canRevoke = isGiven && ['active', 'pending'].includes(delegation.status);
    const canDelete = isGiven;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {otherUser?.avatar ? (
              <img
                src={`/uploads/${otherUser.avatar}`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <UserGroupIcon className="w-5 h-5 text-primary-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">
                {otherUser?.firstName} {otherUser?.lastName}
              </p>
              <p className="text-sm text-gray-500">{otherUser?.email}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Début</span>
            <p className="font-medium text-gray-900">{formatDate(delegation.startDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Fin</span>
            <p className="font-medium text-gray-900">{formatDate(delegation.endDate)}</p>
          </div>
        </div>

        {delegation.reason && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
            <span className="font-medium">Motif :</span> {delegation.reason}
          </div>
        )}

        {delegation.status === 'revoked' && (
          <div className="mt-3 p-2 bg-danger-50 rounded text-sm text-danger-700">
            <span className="font-medium">Révoquée le :</span> {formatDate(delegation.revokedAt)}
            {delegation.revocationNote && (
              <p className="mt-1">Note : {delegation.revocationNote}</p>
            )}
          </div>
        )}

        {(canRevoke || canDelete) && (
          <div className="mt-4 flex justify-end gap-2">
            {canRevoke && (
              <button
                onClick={() => setShowRevokeModal(delegation)}
                className="btn-secondary text-sm py-1.5 px-3 text-danger-600 hover:bg-danger-50"
              >
                <NoSymbolIcon className="w-4 h-4 mr-1" />
                Révoquer
              </button>
            )}
            {canDelete && delegation.status !== 'active' && (
              <button
                onClick={() => {
                  if (confirm('Supprimer cette délégation de l\'historique ?')) {
                    deleteMutation.mutate(delegation._id);
                  }
                }}
                className="btn-secondary text-sm py-1.5 px-3 text-gray-600 hover:bg-gray-100"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Délégations de courriers</h3>
          <p className="text-sm text-gray-500">
            Déléguez vos courriers à un collègue pendant votre absence
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvelle délégation
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveSection('given')}
          className={`pb-3 px-1 border-b-2 font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'given'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowRightIcon className="w-4 h-4" />
          Délégations données
          {delegations.given?.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
              {delegations.given.filter(d => ['active', 'pending'].includes(d.status)).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSection('received')}
          className={`pb-3 px-1 border-b-2 font-medium transition-colors flex items-center gap-2 ${
            activeSection === 'received'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Délégations reçues
          {delegations.received?.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
              {delegations.received.filter(d => d.status === 'active').length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeSection === 'given' && (
          <motion.div
            key="given"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {delegations.given?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {delegations.given.map((delegation) => (
                  <DelegationCard
                    key={delegation._id}
                    delegation={delegation}
                    isGiven={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-gray-900 font-medium">Aucune délégation donnée</h4>
                <p className="text-gray-500 text-sm mt-1">
                  Créez une délégation pour qu'un collègue puisse gérer vos courriers
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'received' && (
          <motion.div
            key="received"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {delegations.received?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {delegations.received.map((delegation) => (
                  <DelegationCard
                    key={delegation._id}
                    delegation={delegation}
                    isGiven={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-gray-900 font-medium">Aucune délégation reçue</h4>
                <p className="text-gray-500 text-sm mt-1">
                  Personne ne vous a délégué ses courriers pour le moment
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <CreateDelegationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isLoading}
      />

      {/* Revoke Modal */}
      {showRevokeModal && (
        <RevokeModal
          delegation={showRevokeModal}
          onClose={() => setShowRevokeModal(null)}
          onConfirm={(note) => revokeMutation.mutate({ id: showRevokeModal._id, note })}
          isLoading={revokeMutation.isLoading}
        />
      )}
    </div>
  );
}

// Modal de création de délégation
function CreateDelegationModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    delegateId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Recherche d'utilisateurs
  const { data: usersData } = useQuery({
    queryKey: ['users-recipients', searchQuery],
    queryFn: () => usersAPI.getRecipients({ search: searchQuery }),
    enabled: searchQuery.length > 1
  });

  const users = usersData?.data?.data || [];

  // Vérification de chevauchement
  const { data: overlapData } = useQuery({
    queryKey: ['delegation-overlap', formData.delegateId],
    queryFn: () => delegationsAPI.checkOverlap(formData.delegateId),
    enabled: !!formData.delegateId
  });

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, delegateId: user._id || user.id }));
    setSearchQuery('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.delegateId) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }
    onSubmit({
      ...formData,
      endDate: formData.endDate || null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Nouvelle délégation</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Sélection utilisateur */}
          <div>
            <label className="label">Déléguer à *</label>
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar ? (
                    <img
                      src={`/uploads/${selectedUser.avatar}`}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-sm font-medium">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData(prev => ({ ...prev, delegateId: '' }));
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
                {searchQuery.length > 1 && users.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                    {users.map((user) => (
                      <button
                        key={user._id || user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                      >
                        {user.avatar ? (
                          <img
                            src={`/uploads/${user.avatar}`}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avertissement chevauchement */}
          {overlapData?.data?.data?.overlap?.total > 0 && (
            <div className="p-3 bg-warning-50 text-warning-700 rounded-lg text-sm flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Attention</p>
                <p>
                  Cet utilisateur est déjà destinataire ou co-destinataire de certains de vos courriers.
                  Ces courriers ne seront pas dupliqués.
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date de début *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="input"
                min={formData.startDate}
              />
              <p className="text-xs text-gray-500 mt-1">Laissez vide pour une durée indéterminée</p>
            </div>
          </div>

          {/* Motif */}
          <div>
            <label className="label">Motif (optionnel)</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="input"
              rows={2}
              placeholder="Ex: Congés du 15 au 30 janvier..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.delegateId}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Créer la délégation
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Modal de révocation
function RevokeModal({ delegation, onClose, onConfirm, isLoading }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-danger-600">Révoquer la délégation</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-sm flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Attention</p>
              <p>
                En révoquant cette délégation, {delegation.delegate?.firstName} {delegation.delegate?.lastName} n'aura
                plus accès à vos courriers.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Note de révocation (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
              rows={2}
              placeholder="Ex: Retour de congés..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(note)}
              disabled={isLoading}
              className="btn-danger flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Révocation...
                </>
              ) : (
                <>
                  <NoSymbolIcon className="w-5 h-5" />
                  Révoquer
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
