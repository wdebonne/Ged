import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outgoingMailsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  TagIcon,
  LinkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  draft: { label: 'Brouillon', class: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Envoyé', class: 'bg-blue-100 text-blue-800' },
  archived: { label: 'Archivé', class: 'bg-green-100 text-green-800' }
};

const METHOD_LABELS = {
  courrier: 'Courrier postal',
  email: 'Email',
  fax: 'Fax',
  main_propre: 'Remise en main propre',
  autre: 'Autre'
};

const PRIORITY_LABELS = {
  low: { label: 'Basse', class: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Normale', class: 'bg-blue-100 text-blue-700' },
  high: { label: 'Haute', class: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', class: 'bg-red-100 text-red-700' }
};

export default function OutgoingMailDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userPermissions = user?.group?.permissions || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['outgoing-mail', id],
    queryFn: async () => {
      const res = await outgoingMailsAPI.getOne(id);
      return res.data?.data;
    }
  });

  const sendMutation = useMutation({
    mutationFn: () => outgoingMailsAPI.markAsSent(id),
    onSuccess: () => queryClient.invalidateQueries(['outgoing-mail', id])
  });

  const archiveMutation = useMutation({
    mutationFn: () => outgoingMailsAPI.archive(id),
    onSuccess: () => queryClient.invalidateQueries(['outgoing-mail', id])
  });

  const deleteMutation = useMutation({
    mutationFn: () => outgoingMailsAPI.delete(id),
    onSuccess: () => navigate('/courriers/depart/brouillons')
  });

  const handleDownloadPDF = async () => {
    try {
      const response = await outgoingMailsAPI.getPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', mail.fileName || 'courrier-depart.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Courrier départ non trouvé</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">Retour</button>
      </div>
    );
  }

  const mail = data;
  const statusInfo = STATUS_LABELS[mail.status] || STATUS_LABELS.draft;
  const priorityInfo = PRIORITY_LABELS[mail.priority] || PRIORITY_LABELS.normal;

  const pdfUrl = `/uploads/${mail.filePath}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{mail.subject}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.class}`}>
                {statusInfo.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.class}`}>
                {priorityInfo.label}
              </span>
            </div>
            <p className="text-gray-500 mt-1 font-mono text-sm">{mail.reference}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mail.status === 'draft' && userPermissions.includes('send_outgoing') && (
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isLoading}
              className="btn-primary flex items-center gap-2"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              {sendMutation.isLoading ? 'Envoi...' : 'Envoyer'}
            </button>
          )}
          {mail.status === 'sent' && userPermissions.includes('archive_outgoing') && (
            <button
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isLoading}
              className="btn-primary flex items-center gap-2"
            >
              <ArchiveBoxIcon className="w-5 h-5" />
              {archiveMutation.isLoading ? 'Archivage...' : 'Archiver'}
            </button>
          )}
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5" />
            Télécharger
          </button>
          {user?.group?.name === 'Administrateur' && (
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-icon text-danger-600">
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden" style={{ height: '75vh' }}>
            <iframe
              src={pdfUrl}
              title="PDF Viewer"
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Informations</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Destinataire</p>
                  <p className="font-medium text-gray-900">{mail.destination?.name || mail.destinationName}</p>
                  {mail.destination?.organization && (
                    <p className="text-sm text-gray-500">{mail.destination.organization}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <TagIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Service expéditeur</p>
                  <p className="font-medium text-gray-900">{mail.service?.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Méthode d'envoi</p>
                  <p className="font-medium text-gray-900">{METHOD_LABELS[mail.sendingMethod] || mail.sendingMethod}</p>
                </div>
              </div>

              {mail.trackingNumber && (
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">N° de suivi</p>
                    <p className="font-medium text-gray-900">{mail.trackingNumber}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="text-sm text-gray-700">
                    Créé le {new Date(mail.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  {mail.sentDate && (
                    <p className="text-sm text-gray-700">
                      Envoyé le {new Date(mail.sentDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {mail.archivedDate && (
                    <p className="text-sm text-gray-700">
                      Archivé le {new Date(mail.archivedDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>

              {mail.sender && (
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Créé par</p>
                    <p className="font-medium text-gray-900">
                      {mail.sender.firstName} {mail.sender.lastName}
                    </p>
                  </div>
                </div>
              )}

              {mail.linkedIncomingMail && (
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Courrier entrant lié</p>
                    <Link
                      to={`/courriers/${mail.linkedIncomingMail._id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {mail.linkedIncomingMail.reference} - {mail.linkedIncomingMail.subject}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {mail.content && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{mail.content}</p>
            </div>
          )}

          {mail.notes && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{mail.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-danger-100 mx-auto mb-4 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer ce courrier ?</h3>
              <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Annuler</button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isLoading}
                  className="btn-danger"
                >
                  {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
