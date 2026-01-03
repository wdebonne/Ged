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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(localFilters);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localFilters]);

  const handleChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      sender: '',
      service: '',
      dateFrom: '',
      dateTo: ''
    };
    setLocalFilters(cleared);
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v !== '');

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
          className={`btn-secondary flex items-center gap-2 ${showAdvanced ? 'bg-primary-50 text-primary-600' : ''}`}
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
            className="btn-secondary flex items-center gap-2 text-danger-600 hover:bg-danger-50"
          >
            <XMarkIcon className="w-5 h-5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
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
        </div>
      )}
    </div>
  );
}
