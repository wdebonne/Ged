import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { excelAPI, servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function ExcelExportModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('current');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    service: '',
    includeIncoming: true,
    includeOutgoing: true
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesAPI.getAll(),
    enabled: isOpen
  });

  const { data: statusData } = useQuery({
    queryKey: ['excel-status'],
    queryFn: () => excelAPI.getStatus(),
    enabled: isOpen
  });

  const services = servicesData?.data?.data || [];
  const status = statusData?.data?.data || {};

  const downloadMutation = useMutation({
    mutationFn: () => excelAPI.download(),
    onSuccess: (response) => {
      downloadBlob(response.data, `registre-courrier-${new Date().getFullYear()}.xlsx`);
      toast.success('Registre téléchargé');
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.status === 404
        ? 'Aucun registre disponible. Créez des courriers pour générer le registre.'
        : 'Erreur lors du téléchargement';
      toast.error(msg);
    }
  });

  const generateMutation = useMutation({
    mutationFn: (data) => excelAPI.generate(data),
    onSuccess: (response) => {
      downloadBlob(response.data, `registre-courrier-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Registre Excel généré');
      onClose();
    },
    onError: () => toast.error('Erreur lors de la génération du registre')
  });

  const downloadBlob = (data, fileName) => {
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (mode === 'current') {
      downloadMutation.mutate();
    } else {
      generateMutation.mutate(filters);
    }
  };

  const isLoading = downloadMutation.isPending || generateMutation.isPending;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TableCellsIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Registre Excel</h2>
                <p className="text-sm text-gray-500">Télécharger ou générer le registre</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('current')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'current'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DocumentArrowDownIcon className={`w-6 h-6 mb-2 ${mode === 'current' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className={`font-medium text-sm ${mode === 'current' ? 'text-green-900' : 'text-gray-700'}`}>
                  Registre courant
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Télécharger le fichier auto-généré
                </div>
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'custom'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FunnelIcon className={`w-6 h-6 mb-2 ${mode === 'custom' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className={`font-medium text-sm ${mode === 'custom' ? 'text-green-900' : 'text-gray-700'}`}>
                  Export personnalisé
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Filtrer par date, statut, service
                </div>
              </button>
            </div>

            {/* Current register info */}
            {mode === 'current' && status.fileExists && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p>Dernière mise à jour : {status.lastUpdateDate ? new Date(status.lastUpdateDate).toLocaleString('fr-FR') : 'jamais'}</p>
                {status.pendingUpdates > 0 && (
                  <p className="text-amber-600 mt-1">{status.pendingUpdates} courrier(s) en attente de traitement</p>
                )}
              </div>
            )}

            {mode === 'current' && !status.fileExists && (
              <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                Aucun registre auto-généré disponible. Utilisez l'export personnalisé ou créez un courrier.
              </div>
            )}

            {/* Custom filters */}
            {mode === 'custom' && (
              <div className="space-y-4">
                {/* Type checkboxes */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeIncoming}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeIncoming: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Courrier arrivé</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeOutgoing}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeOutgoing: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">Courrier départ</span>
                  </label>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                      Du
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="processed">Traité</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                {/* Service Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <select
                    value={filters.service}
                    onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Tous les services</option>
                    {services.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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
              disabled={isLoading || (mode === 'custom' && !filters.includeIncoming && !filters.includeOutgoing)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  {mode === 'current' ? 'Télécharger' : 'Générer'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
