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
  EnvelopeIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function MailsPendingPage() {
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope') || 'mine'; // 'mine' ou 'service'
  
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    sender: '',
    service: '',
    dateFrom: '',
    dateTo: ''
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['mails', 'pending', page, filters, scope],
    queryFn: async () => {
      const response = await mailsAPI.getAll({
        page,
        limit: 20,
        status: 'pending',
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
    ? 'Courriers Service(s) à traiter' 
    : scope === 'delegated' 
      ? 'Courriers Délégués à traiter' 
      : 'Mes courriers à traiter';
  const emptyTitle = scope === 'service' 
    ? 'Aucun courrier service à traiter' 
    : scope === 'delegated' 
      ? 'Aucun courrier délégué à traiter' 
      : 'Aucun courrier à traiter';
  const emptyDescription = scope === 'service' 
    ? 'Aucun courrier en attente pour vos services'
    : scope === 'delegated'
      ? 'Aucun courrier délégué en attente de traitement'
      : 'Vous n\'avez pas de courrier en attente de traitement';

  return (
    <div className="space-y-6">
      {/* Titre */}
      <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
      
      {/* Filtres */}
      <MailFilters filters={filters} onChange={handleFilterChange} />

      {/* Liste des courriers */}
      {data?.mails?.length === 0 ? (
        <EmptyState
          icon={EnvelopeIcon}
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
                  <div className={`card-hover p-4 border-l-4 ${mail.isRead ? 'border-gray-200' : 'border-warning-500 bg-warning-50'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!mail.isRead && (
                            <span className="w-2 h-2 bg-warning-500 rounded-full" />
                          )}
                          <span className="text-xs font-mono text-gray-500">
                            {mail.reference}
                          </span>
                          <span className="badge-warning">À traiter</span>
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
                            Reçu le {format(new Date(mail.receivedDate), 'dd MMMM yyyy', { locale: fr })}
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
                        {mail.recipient && (
                          <div className="hidden md:flex items-center gap-2">
                            {mail.recipient.avatar ? (
                              <img
                                src={`/uploads/${mail.recipient.avatar}`}
                                alt={`${mail.recipient.firstName} ${mail.recipient.lastName}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary-700">
                                  {mail.recipient.firstName?.[0]}{mail.recipient.lastName?.[0]}
                                </span>
                              </div>
                            )}
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
    </div>
  );
}
