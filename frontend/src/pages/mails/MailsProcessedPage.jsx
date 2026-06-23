import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { mailsAPI } from '../../services/api';
import Pagination from '../../components/Pagination';
import MailFilters from '../../components/MailFilters';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import {
  CheckCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import ExcelExportModal from '../../components/modals/ExcelExportModal';

export default function MailsProcessedPage() {
  const [showExcelExport, setShowExcelExport] = useState(false);
  const { hasPermission } = useAuthStore();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope') || 'mine';
  
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    sender: '',
    service: '',
    dateFrom: '',
    dateTo: ''
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['mails', 'processed', page, filters, scope],
    queryFn: async () => {
      const response = await mailsAPI.getAll({
        page,
        limit: 20,
        status: 'processed',
        scope,
        ...filters
      });
      return response.data.data;
    }
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600">Erreur lors du chargement des courriers</p>
      </div>
    );
  }

  const pageTitle = scope === 'service' 
    ? 'Courriers Service(s) traités' 
    : scope === 'delegated' 
      ? 'Courriers Délégués traités' 
      : 'Mes courriers traités';
  const emptyTitle = scope === 'service' 
    ? 'Aucun courrier service traité' 
    : scope === 'delegated' 
      ? 'Aucun courrier délégué traité' 
      : 'Aucun courrier traité';
  const emptyDescription = scope === 'service' 
    ? 'Aucun courrier traité pour vos services'
    : scope === 'delegated'
      ? 'Aucun courrier délégué traité'
      : 'Vous n\'avez pas encore de courrier traité';

  return (
    <div className="space-y-6">
      {/* Titre + Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        {hasPermission('export_mails') && (
          <button
            onClick={() => setShowExcelExport(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <TableCellsIcon className="w-5 h-5" />
            Registre Excel
          </button>
        )}
      </div>
      
      {/* Filtres */}
      <MailFilters filters={filters} onChange={handleFilterChange} />

      {/* Liste des courriers */}
      {data?.mails?.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            {data?.mails?.map((mail, index) => (
              <motion.div
                key={mail._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/courriers/${mail._id}`}>
                  <div className="card-hover p-4 border-l-4 border-success-500">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">
                            {mail.reference}
                          </span>
                          <span className="badge-success">Traité</span>
                          {mail.responses?.length > 0 && (
                            <span className="badge-primary">
                              {mail.responses.length} réponse(s)
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {mail.subject}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            {mail.sender?.name || mail.senderName}
                          </span>
                          <span>
                            Traité le {format(new Date(mail.processedDate), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          {mail.service && (
                            <span 
                              className="badge"
                              style={{ 
                                backgroundColor: `${mail.service.color}20`,
                                color: mail.service.color 
                              }}
                            >
                              {mail.service.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {mail.processedBy && (
                          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                            <span>Par {mail.processedBy.firstName} {mail.processedBy.lastName}</span>
                          </div>
                        )}
                        <button className="btn-icon">
                          <EyeIcon className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {data?.pagination && (
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      <ExcelExportModal isOpen={showExcelExport} onClose={() => setShowExcelExport(false)} />
    </div>
  );
}
