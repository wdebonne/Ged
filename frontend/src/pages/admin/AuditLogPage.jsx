import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auditAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { ClipboardDocumentListIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const CATEGORY_LABELS = {
  deletion: 'Suppression',
  permission: 'Permission',
  settings: 'Paramètre',
  export: 'Export',
};

const CATEGORY_BADGES = {
  deletion: 'bg-red-100 text-red-700',
  permission: 'bg-purple-100 text-purple-700',
  settings: 'bg-blue-100 text-blue-700',
  export: 'bg-green-100 text-green-700',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, category, entityType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await auditAPI.getAll({ page, limit: 25, category, entityType, dateFrom, dateTo });
      return res.data.data;
    }
  });

  const { data: entityTypes } = useQuery({
    queryKey: ['audit-logs', 'entity-types'],
    queryFn: async () => {
      const res = await auditAPI.getEntityTypes();
      return res.data.data;
    }
  });

  const resetFilters = () => {
    setCategory('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ClipboardDocumentListIcon className="w-6 h-6 text-gray-500" />
        Journal d'audit
      </h1>

      {/* Filtres */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input"
        >
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="input"
        >
          <option value="">Toutes les entités</option>
          {entityTypes?.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="input"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="input"
        />
        <button onClick={resetFilters} className="btn-secondary text-sm">
          Réinitialiser
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data?.logs?.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="Aucune entrée"
          description="Aucune action ne correspond à ces filtres"
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.logs?.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition-colors align-top">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          {log.isSystemAction && <CpuChipIcon className="w-4 h-4 text-gray-400" title="Action automatique" />}
                          {log.performedByLabel || 'Système'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${CATEGORY_BADGES[log.category] || 'bg-gray-100 text-gray-700'}`}>
                          {CATEGORY_LABELS[log.category] || log.category}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 font-mono">{log.action}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.entityType || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <div className="truncate">{log.entityLabel || '—'}</div>
                        {log.changes && (
                          <details className="mt-1">
                            <summary className="text-xs text-primary-600 cursor-pointer">Détails</summary>
                            <pre className="text-xs bg-gray-50 rounded p-2 mt-1 whitespace-pre-wrap break-words max-w-xs">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data?.pagination && (
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
