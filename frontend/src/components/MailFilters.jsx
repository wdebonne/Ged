import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { servicesAPI, sendersAPI } from '../services/api';

export default function MailFilters({ filters, onChange }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data.data;
    }
  });

  const { data: senders } = useQuery({
    queryKey: ['senders'],
    queryFn: async () => {
      const response = await sendersAPI.getAll();
      return response.data.data;
    }
  });

  // Synchroniser quand les filtres sont modifiés depuis l'extérieur (ex: clic sur un tag)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(localFilters);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localFilters]);

  const handleChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (value) => {
    // L'échéance se trie de la plus proche à la plus lointaine
    setLocalFilters(prev => ({
      ...prev,
      sortBy: value,
      sortOrder: value === 'dueDate' ? 'asc' : ''
    }));
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      sender: '',
      service: '',
      dateFrom: '',
      dateTo: '',
      priority: '',
      tag: '',
      overdue: '',
      sortBy: '',
      sortOrder: ''
    };
    setLocalFilters(cleared);
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v !== '' && v !== undefined);

  return (
    <div className="card p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Rechercher par référence, objet, expéditeur..."
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn-secondary flex items-center gap-2 ${showAdvanced ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
        >
          <FunnelIcon className="w-5 h-5" />
          Filtres
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary-600" />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-secondary flex items-center gap-2 text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"
          >
            <XMarkIcon className="w-5 h-5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t dark:border-gray-700">
          <div>
            <label className="label">Service</label>
            <select
              value={localFilters.service}
              onChange={(e) => handleChange('service', e.target.value)}
              className="input"
            >
              <option value="">Tous les services</option>
              {services?.map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Expéditeur</label>
            <select
              value={localFilters.sender}
              onChange={(e) => handleChange('sender', e.target.value)}
              className="input"
            >
              <option value="">Tous les expéditeurs</option>
              {senders?.map((sender) => (
                <option key={sender._id} value={sender._id}>
                  {sender.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date de début</label>
            <input
              type="date"
              value={localFilters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Date de fin</label>
            <input
              type="date"
              value={localFilters.dateTo}
              onChange={(e) => handleChange('dateTo', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Priorité</label>
            <select
              value={localFilters.priority || ''}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="input"
            >
              <option value="">Toutes les priorités</option>
              <option value="urgent">Urgente</option>
              <option value="high">Haute (et urgente)</option>
              <option value="normal">Normale</option>
              <option value="low">Basse</option>
            </select>
          </div>
          <div>
            <label className="label">Tag</label>
            <input
              type="text"
              value={localFilters.tag || ''}
              onChange={(e) => handleChange('tag', e.target.value)}
              placeholder="ex : subvention"
              className="input"
            />
          </div>
          <div>
            <label className="label">Trier par</label>
            <select
              value={localFilters.sortBy || ''}
              onChange={(e) => handleSortChange(e.target.value)}
              className="input"
            >
              <option value="">Date de réception (récent d'abord)</option>
              <option value="dueDate">Échéance (proche d'abord)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-danger-50 dark:border-gray-700 dark:hover:bg-danger-900/20 w-full">
              <input
                type="checkbox"
                checked={localFilters.overdue === 'true'}
                onChange={(e) => handleChange('overdue', e.target.checked ? 'true' : '')}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-danger-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">⚠ En retard uniquement</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
