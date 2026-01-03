import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  Cog6ToothIcon,
  CheckIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

const EXPORT_OPTIONS = [
  { key: 'creation', label: 'Courrier créé/importé', icon: DocumentTextIcon, description: 'Date et auteur de l\'import' },
  { key: 'service', label: 'Attribué au service', icon: BuildingOfficeIcon, description: 'Service destinataire' },
  { key: 'recipient', label: 'Destinataire', icon: UserIcon, description: 'Utilisateur destinataire' },
  { key: 'readLogs', label: 'Lectures', icon: ClockIcon, description: 'Qui a lu le courrier et quand' },
  { key: 'processed', label: 'Traitement', icon: CheckIcon, description: 'Date et auteur du traitement' },
  { key: 'responses', label: 'Réponses', icon: ChatBubbleLeftRightIcon, description: 'Historique des réponses' },
  { key: 'archived', label: 'Archivage', icon: ArchiveBoxIcon, description: 'Date et auteur de l\'archivage' }
];

export default function ExportOptionsModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [options, setOptions] = useState({
    creation: true,
    service: true,
    recipient: true,
    readLogs: true,
    processed: true,
    responses: true,
    archived: true
  });

  // Récupérer les options actuelles
  const { data: currentOptions, isLoading } = useQuery({
    queryKey: ['export-options'],
    queryFn: async () => {
      const response = await settingsAPI.getExportOptions();
      return response.data.data || options;
    },
    enabled: isOpen
  });

  // Mettre à jour les options quand on les récupère
  useEffect(() => {
    if (currentOptions && typeof currentOptions === 'object') {
      setOptions(prev => ({ ...prev, ...currentOptions }));
    }
  }, [currentOptions]);

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async () => {
      return settingsAPI.updateMany([
        {
          key: 'export_history_options',
          value: options,
          category: 'general',
          description: 'Options d\'export de l\'historique des courriers'
        }
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['export-options']);
      queryClient.invalidateQueries(['export-options-public']);
      toast.success('Options d\'export sauvegardées');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Options d'export</h2>
                <p className="text-sm text-gray-500">Configurer l'historique PDF</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Sélectionnez les éléments à inclure dans l'export de l'historique pour tous les utilisateurs :
                </p>
                {EXPORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isEnabled = options[option.key];
                  return (
                    <div
                      key={option.key}
                      onClick={() => toggleOption(option.key)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isEnabled ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${isEnabled ? 'text-blue-900' : 'text-gray-700'}`}>
                          {option.label}
                        </div>
                        <div className={`text-xs ${isEnabled ? 'text-blue-600' : 'text-gray-500'}`}>
                          {option.description}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isEnabled ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isEnabled && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {saveMutation.isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
