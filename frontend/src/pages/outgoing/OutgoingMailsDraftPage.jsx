import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { outgoingMailsAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function OutgoingMailsDraftPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['outgoing-mails', 'draft', page, search],
    queryFn: async () => {
      const response = await outgoingMailsAPI.getAll({
        page, limit: 20, status: 'draft', search
      });
      return response.data;
    }
  });

  if (isLoading) return <LoadingSpinner />;

  const mails = data?.data?.mails || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brouillons</h1>
          <p className="text-gray-600 mt-1">
            {pagination?.total || 0} brouillon(s)
          </p>
        </div>
        <Link to="/courriers/depart/nouveau" className="btn-primary flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          Nouveau courrier
        </Link>
      </div>

      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ref</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Objet</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destinataire</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mails.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Aucun brouillon
                  </td>
                </tr>
              ) : (
                mails.map((mail) => (
                  <tr key={mail._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-700">{mail.reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{mail.subject}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-700">{mail.destination?.name || mail.destinationName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mail.service && (
                        <span className="badge" style={{ backgroundColor: mail.service.color + '20', color: mail.service.color }}>
                          {mail.service.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(mail.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/courriers/depart/${mail._id}`} className="btn-icon text-gray-500 hover:text-primary-600">
                          <EyeIcon className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.pages > 1 && (
        <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
      )}
    </div>
  );
}
