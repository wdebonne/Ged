import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  TrophyIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const STATS_EXPORT_OPTIONS = [
  { key: 'summaryCards', label: 'Cartes résumé', icon: DocumentTextIcon, description: 'Total, à traiter, traités, archivés' },
  { key: 'timeCards', label: 'Temps de traitement', icon: ClockIcon, description: 'Temps moyen, min et max' },
  { key: 'statusChart', label: 'Répartition par statut', icon: ChartBarIcon, description: 'Graphique en anneau' },
  { key: 'priorityChart', label: 'Répartition par priorité', icon: ExclamationCircleIcon, description: 'Graphique en camembert' },
  { key: 'monthlyChart', label: 'Évolution mensuelle', icon: CalendarDaysIcon, description: 'Graphique en barres' },
  { key: 'importChart', label: 'Statistiques d\'import', icon: ArrowDownTrayIcon, description: 'Manuel vs IMAP par mois' },
  { key: 'myPerformance', label: 'Mes performances', icon: TrophyIcon, description: 'Votre activité personnelle' },
  { key: 'userStats', label: 'Performance par utilisateur', icon: UserGroupIcon, description: 'Classement des utilisateurs' },
  { key: 'serviceStats', label: 'Répartition par service', icon: BuildingOfficeIcon, description: 'Statistiques par service' },
  { key: 'senderStats', label: 'Top expéditeurs', icon: SparklesIcon, description: 'Top 10 expéditeurs' }
];

const DEFAULT_OPTIONS = {
  summaryCards: true,
  timeCards: true,
  statusChart: true,
  priorityChart: true,
  monthlyChart: true,
  importChart: true,
  myPerformance: true,
  userStats: true,
  serviceStats: true,
  senderStats: true
};

export default function StatsExportOptionsModal({ isOpen, onClose, onExport, options: initialOptions }) {
  const [options, setOptions] = useState(initialOptions || DEFAULT_OPTIONS);

  useEffect(() => {
    if (initialOptions) {
      setOptions(prev => ({ ...prev, ...initialOptions }));
    }
  }, [initialOptions]);

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (value) => {
    const newOptions = {};
    STATS_EXPORT_OPTIONS.forEach(opt => {
      newOptions[opt.key] = value;
    });
    setOptions(newOptions);
  };

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  const selectedCount = Object.values(options).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Cog6ToothIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Export PDF</h2>
                <p className="text-sm text-gray-500">Sélectionnez les sections à inclure</p>
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
          <div className="p-6 overflow-y-auto flex-1">
            {/* Quick actions */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">
                {selectedCount} / {STATS_EXPORT_OPTIONS.length} sections sélectionnées
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {STATS_EXPORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isEnabled = options[option.key];
                return (
                  <div
                    key={option.key}
                    onClick={() => toggleOption(option.key)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isEnabled
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEnabled ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${isEnabled ? 'text-indigo-900' : 'text-gray-700'}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isEnabled ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                    }`}>
                      {isEnabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exporter ({selectedCount})
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
