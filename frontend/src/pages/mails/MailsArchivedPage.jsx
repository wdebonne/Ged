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
  ArchiveBoxIcon,
  EyeIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function MailsArchivedPage() {
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
    queryKey: ['mails', 'archived', page, filters, scope],
    queryFn: async () => {
      const response = await mailsAPI.getAll({
        page,
        limit: 20,
        status: 'archived',
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

  const handleExportPDF = async (mail) => {
    try {
      const response = await mailsAPI.exportPDF(mail._id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `courrier-${mail.reference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export PDF:', error);
    }
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
    ? 'Courriers Service(s) archivés' 
    : scope === 'delegated' 
      ? 'Courriers Délégués archivés' 
      : 'Mes courriers archivés';
  const emptyTitle = scope === 'service' 
    ? 'Aucun courrier service archivé' 
    : scope === 'delegated' 
      ? 'Aucun courrier délégué archivé' 
      : 'Aucun courrier archivé';
  const emptyDescription = scope === 'service' 
    ? 'Aucun courrier archivé pour vos services'
    : scope === 'delegated'
      ? 'Aucun courrier délégué archivé'
      : 'Vous n\'avez pas encore de courrier archivé';

  return (
    <div className="space-y-6">
      {/* Titre */}
      <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
      
      {/* Filtres */}
      <MailFilters filters={filters} onChange={handleFilterChange} />

      {/* Liste des courriers */}
      {data?.mails?.length === 0 ? (
        <EmptyState
          icon={ArchiveBoxIcon}
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
                <div className="card-hover p-4 border-l-4 border-gray-400">
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/courriers/${mail._id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {mail.reference}
                        </span>
                        <span className="badge bg-gray-100 text-gray-700">Archivé</span>
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
                          Archivé le {format(new Date(mail.archivedDate), 'dd MMMM yyyy', { locale: fr })}
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
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportPDF(mail)}
                        className="btn-icon"
                        title="Exporter en PDF"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 text-gray-500" />
                      </button>
                      <Link to={`/courriers/${mail._id}`} className="btn-icon">
                        <EyeIcon className="w-5 h-5 text-gray-500" />
                      </Link>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}
