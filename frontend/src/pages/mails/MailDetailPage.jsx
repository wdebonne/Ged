import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Document, Page, pdfjs } from 'react-pdf';
import { mailsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExportOptionsModal from '../../components/modals/ExportOptionsModal';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  PrinterIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentIcon,
  ClockIcon,
  FolderArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function MailDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  // Permission pour consulter sans marquer comme lu (définie tôt pour être accessible partout)
  const canSilentView = user?.group?.permissions?.includes('silent_view') || false;
  
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseType, setResponseType] = useState('courrier');
  const [responseFile, setResponseFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);
  const [showExportOptionsModal, setShowExportOptionsModal] = useState(false);
  const exportMenuRef = useRef(null);
  
  // États pour l'aperçu des documents joints des réponses
  const [responsePreview, setResponsePreview] = useState(null); // ID de la réponse dont on affiche l'aperçu
  const [responseNumPages, setResponseNumPages] = useState(null);
  const [responsePageNumber, setResponsePageNumber] = useState(1);
  const [responseScale, setResponseScale] = useState(1.0);
  const [showResponseFullscreen, setShowResponseFullscreen] = useState(false);
  const [fullscreenResponsePath, setFullscreenResponsePath] = useState(null);

  // Fermer le menu export quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fonction pour imprimer le PDF
  const handlePrint = () => {
    const pdfUrl = `/uploads/${mail.filePath}`;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const { data: mail, isLoading, error } = useQuery({
    queryKey: ['mail', id],
    queryFn: async () => {
      const response = await mailsAPI.getById(id);
      return response.data.data;
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => mailsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
      queryClient.invalidateQueries(['mails']);
    }
  });

  const processMutation = useMutation({
    mutationFn: () => mailsAPI.process(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
      queryClient.invalidateQueries(['mails']);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => mailsAPI.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
      queryClient.invalidateQueries(['mails']);
      navigate('/courriers/archives');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => mailsAPI.reopen(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
      queryClient.invalidateQueries(['mails']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => mailsAPI.delete(id),
    onSuccess: () => {
      // Supprimer la query du cache pour éviter le refetch
      queryClient.removeQueries(['mail', id]);
      queryClient.invalidateQueries(['mails']);
      toast.success('Courrier supprimé');
      // Récupérer le scope depuis l'URL actuelle pour rediriger vers la bonne section
      const urlParams = new URLSearchParams(window.location.search);
      const scope = urlParams.get('scope') || 'mine';
      // Rediriger vers la page appropriée selon le statut du courrier
      const statusPath = mail?.status === 'archived' 
        ? '/courriers/archives' 
        : mail?.status === 'processed' 
          ? '/courriers/traites' 
          : '/courriers/a-traiter';
      navigate(`${statusPath}?scope=${scope}`);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const deleteResponseMutation = useMutation({
    mutationFn: (responseId) => mailsAPI.deleteResponse(id, responseId),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
    }
  });

  const addResponseMutation = useMutation({
    mutationFn: async (formData) => {
      return mailsAPI.addResponse(id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', id]);
      setShowResponseModal(false);
      setResponseText('');
      setResponseType('courrier');
      setResponseFile(null);
    }
  });

  const handleAddResponse = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('type', responseType);
    formData.append('content', responseText);
    if (responseFile) {
      formData.append('file', responseFile);
    }
    addResponseMutation.mutate(formData);
  };

  // Export du courrier uniquement
  const handleExportCourrier = async () => {
    setExportLoading('courrier');
    try {
      const response = await mailsAPI.exportPDF(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${mail.reference || 'courrier'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
      toast.success('Courrier exporté');
    } catch (error) {
      console.error('Erreur export courrier:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExportLoading(null);
    }
  };

  // Export de l'historique uniquement
  const handleExportHistorique = async () => {
    setExportLoading('historique');
    try {
      const response = await mailsAPI.exportHistoryPDF(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `historique-${mail.reference || mail._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
      toast.success('Historique exporté');
    } catch (error) {
      console.error('Erreur export historique:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExportLoading(null);
    }
  };

  // Export complet (ZIP)
  const handleExportTout = async () => {
    setExportLoading('tout');
    try {
      const response = await mailsAPI.exportAllZIP(id);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${mail.reference || mail._id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
      toast.success('Export complet téléchargé');
    } catch (error) {
      console.error('Erreur export complet:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExportLoading(null);
    }
  };

  // Ancien export (garde la compatibilité)
  const handleExportPDF = async () => {
    try {
      const response = await mailsAPI.exportPDF(id);
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
        <p className="text-danger-600">Erreur lors du chargement du courrier</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Retour
        </button>
      </div>
    );
  }

  // Vérifier les permissions via le groupe
  const userPermissions = user?.group?.permissions || [];
  const hasPermission = (perm) => userPermissions.includes(perm);

  // Vérifier si l'utilisateur est dans le service du courrier
  const userServiceIds = user?.services?.map(s => s.id || s._id) || [];
  const isInMailService = mail.service && userServiceIds.includes(mail.service._id);

  const canProcess = mail.status === 'pending' && (
    hasPermission('process_mails') && (
      hasPermission('view_all_mails') ||
      isInMailService ||
      mail.recipient?._id === user.id ||
      mail.assignedTo?._id === user.id
    )
  );

  // Permettre l'archivage si:
  // - Le courrier est traité ET
  // - L'utilisateur a la permission archive_mails OU
  // - L'utilisateur peut traiter les courriers ET est dans le service du courrier
  const canArchive = mail.status === 'processed' && (
    hasPermission('archive_mails') ||
    (hasPermission('process_mails') && (
      hasPermission('view_all_mails') ||
      isInMailService ||
      mail.recipient?._id === user.id ||
      mail.assignedTo?._id === user.id
    ))
  );

  const canRespond = mail.status !== 'archived' && (
    hasPermission('process_mails') && (
      hasPermission('view_all_mails') ||
      isInMailService ||
      mail.recipient?._id === user.id ||
      mail.assignedTo?._id === user.id
    )
  );

  // Admin peut rouvrir un courrier traité/archivé et supprimer des réponses
  const isAdmin = hasPermission('delete_mails');
  const canReopen = isAdmin && mail.status !== 'pending';

  return (
    <div className="space-y-6">
      {/* Modal Options d'export */}
      <ExportOptionsModal
        isOpen={showExportOptionsModal}
        onClose={() => setShowExportOptionsModal(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-2">
          {/* Bouton Options Export (Admin uniquement) */}
          {isAdmin && (
            <button
              onClick={() => setShowExportOptionsModal(true)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Options d'export de l'historique"
            >
              <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}
          
          {/* Menu Export PDF */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exporter PDF
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleExportCourrier}
                  disabled={exportLoading === 'courrier'}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                >
                  <DocumentIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Courrier uniquement</div>
                    <div className="text-xs text-gray-500">Télécharge le PDF du courrier</div>
                  </div>
                  {exportLoading === 'courrier' && (
                    <div className="ml-auto animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  )}
                </button>
                
                <button
                  onClick={handleExportHistorique}
                  disabled={exportLoading === 'historique'}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                >
                  <ClockIcon className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium text-gray-900">Historique uniquement</div>
                    <div className="text-xs text-gray-500">PDF avec infos et timeline</div>
                  </div>
                  {exportLoading === 'historique' && (
                    <div className="ml-auto animate-spin w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                  )}
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <button
                  onClick={handleExportTout}
                  disabled={exportLoading === 'tout'}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                >
                  <FolderArrowDownIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Export complet (ZIP)</div>
                    <div className="text-xs text-gray-500">Courrier + historique + réponses</div>
                  </div>
                  {exportLoading === 'tout' && (
                    <div className="ml-auto animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {canProcess && (
            <button
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isLoading}
              className="btn-success flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Marquer comme traité
            </button>
          )}
          {canArchive && (
            <button
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              Archiver
            </button>
          )}
          {canReopen && (
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment rouvrir ce courrier ? Il sera remis à traiter.')) {
                  reopenMutation.mutate();
                }
              }}
              disabled={reopenMutation.isLoading}
              className="btn-warning flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Rouvrir
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment supprimer définitivement ce courrier ? Cette action est irréversible.')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isLoading}
              className="btn-danger flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Aperçu PDF - Colonne gauche */}
        <AnimatePresence>
          {showPreview && mail.filePath && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0"
              style={{ width: '450px' }}
            >
              <div className="card overflow-hidden sticky top-4">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5" />
                    Aperçu
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Zoom arrière"
                    >
                      <MagnifyingGlassMinusIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                    <button
                      onClick={() => setScale(s => Math.min(2, s + 0.25))}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Zoom avant"
                    >
                      <MagnifyingGlassPlusIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                      onClick={handlePrint}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Imprimer"
                    >
                      <PrinterIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowFullscreen(true)}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Plein écran"
                    >
                      <ArrowsPointingOutIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Fermer"
                    >
                      <EyeSlashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-100 flex items-center justify-center p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <Document
                    file={`/uploads/${mail.filePath}`}
                    onLoadSuccess={({ numPages }) => {
                      setNumPages(numPages);
                      // Marquer comme lu lors de l'aperçu (sauf si permission silent_view)
                      if (!canSilentView) {
                        markAsReadMutation.mutate();
                      }
                    }}
                    loading={<LoadingSpinner />}
                    error={<p className="text-danger-600">Erreur de chargement du PDF</p>}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                </div>
                {numPages && (
                  <div className="p-2 border-t bg-gray-50 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations du courrier */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-sm font-mono text-gray-500">{mail.reference}</span>
                      <h1 className="text-2xl font-bold text-gray-900 mt-1">
                        {mail.subject}
                      </h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`btn-sm flex items-center gap-1 ${showPreview ? 'bg-primary-100 text-primary-700 border-primary-300' : 'btn-secondary'}`}
                        title={showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}
                      >
                        {showPreview ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        <span className="hidden sm:inline">{showPreview ? 'Masquer' : 'Aperçu'}</span>
                      </button>
                      <span className={`badge ${
                        mail.status === 'pending' ? 'badge-warning' :
                        mail.status === 'processed' ? 'badge-success' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {mail.status === 'pending' ? 'À traiter' :
                         mail.status === 'processed' ? 'Traité' : 'Archivé'}
                      </span>
                    </div>
                  </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <UserIcon className="w-4 h-4" />
                  <span>Expéditeur: <strong>{mail.sender?.name || mail.senderName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Reçu le: <strong>{format(new Date(mail.receivedDate), 'dd MMMM yyyy', { locale: fr })}</strong></span>
                </div>
                {mail.service && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span>Service: 
                      <span 
                        className="ml-2 badge"
                        style={{ 
                          backgroundColor: `${mail.service.color}20`,
                          color: mail.service.color 
                        }}
                      >
                        {mail.service.name}
                      </span>
                    </span>
                  </div>
                )}
                {mail.assignedTo && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <UserIcon className="w-4 h-4" />
                    <span>Assigné à: <strong>{mail.assignedTo.firstName} {mail.assignedTo.lastName}</strong></span>
                  </div>
                )}
              </div>

              {mail.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                  <p className="text-gray-600">{mail.notes}</p>
                </div>
              )}

              {mail.ocrText && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">
                    Contenu extrait (OCR)
                  </h3>
                  <p className="text-blue-600 text-sm whitespace-pre-wrap">{mail.ocrText}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Document PDF */}
          {mail.documentPath && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  Document
                </h2>
              </div>
              <div className="p-4">
                <iframe
                  src={`/uploads/${mail.documentPath}`}
                  className="w-full h-[600px] rounded-lg border"
                  title="Document PDF"
                />
              </div>
            </motion.div>
          )}

          {/* Réponses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                Réponses ({mail.responses?.length || 0})
              </h2>
              {canRespond && (
                <button
                  onClick={() => setShowResponseModal(true)}
                  className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Ajouter une réponse
                </button>
              )}
            </div>
            <div className="p-4">
              {mail.responses?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucune réponse pour ce courrier
                </p>
              ) : (
                <div className="space-y-4">
                  {mail.responses?.map((response, index) => (
                    <div key={response._id || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {response.respondedBy?.avatar ? (
                            <img
                              src={`/uploads/${response.respondedBy.avatar}`}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 text-sm font-semibold">
                                {response.respondedBy?.firstName?.[0]}{response.respondedBy?.lastName?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {response.respondedBy?.firstName} {response.respondedBy?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(response.date || response.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-gray text-xs">
                            {response.type === 'courrier' && 'Courrier'}
                            {response.type === 'email' && 'Email'}
                            {response.type === 'telephone' && 'Téléphone'}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (window.confirm('Voulez-vous vraiment supprimer cette réponse ?')) {
                                  deleteResponseMutation.mutate(response._id);
                                }
                              }}
                              disabled={deleteResponseMutation.isLoading}
                              className="text-danger-600 hover:text-danger-700 p-1"
                              title="Supprimer la réponse"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {response.content && (
                        <p className="text-gray-700 whitespace-pre-wrap mt-2">{response.content}</p>
                      )}
                      {response.filePath && (
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              if (responsePreview === response._id) {
                                setResponsePreview(null);
                              } else {
                                setResponsePreview(response._id);
                                setResponsePageNumber(1);
                                setResponseNumPages(null);
                                setResponseScale(1.0);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-primary-600 text-sm hover:underline"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            {responsePreview === response._id ? 'Masquer le document' : 'Voir le document joint'}
                          </button>
                          
                          {/* Aperçu du document PDF */}
                          {responsePreview === response._id && (
                            <div className="mt-3 border rounded-lg overflow-hidden bg-gray-100">
                              {/* Barre d'outils */}
                              <div className="p-2 bg-gray-50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setResponseScale(s => Math.max(0.5, s - 0.25))}
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                    title="Zoom arrière"
                                  >
                                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                                  </button>
                                  <span className="text-xs text-gray-600 min-w-[40px] text-center">{Math.round(responseScale * 100)}%</span>
                                  <button
                                    onClick={() => setResponseScale(s => Math.min(2, s + 0.25))}
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                    title="Zoom avant"
                                  >
                                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                  </button>
                                  
                                  {responseNumPages > 1 && (
                                    <>
                                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                      <button
                                        onClick={() => setResponsePageNumber(p => Math.max(1, p - 1))}
                                        disabled={responsePageNumber <= 1}
                                        className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
                                      >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                      </button>
                                      <span className="text-xs text-gray-600">
                                        {responsePageNumber} / {responseNumPages}
                                      </span>
                                      <button
                                        onClick={() => setResponsePageNumber(p => Math.min(responseNumPages, p + 1))}
                                        disabled={responsePageNumber >= responseNumPages}
                                        className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
                                      >
                                        <ChevronRightIcon className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setFullscreenResponsePath(`/uploads/${response.filePath}`);
                                      setShowResponseFullscreen(true);
                                    }}
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                    title="Plein écran"
                                  >
                                    <ArrowsPointingOutIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const printWindow = window.open(`/uploads/${response.filePath}`, '_blank');
                                      if (printWindow) {
                                        printWindow.addEventListener('load', () => printWindow.print());
                                      }
                                    }}
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                    title="Imprimer"
                                  >
                                    <PrinterIcon className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={`/uploads/${response.filePath}`}
                                    download
                                    className="p-1.5 hover:bg-gray-200 rounded"
                                    title="Télécharger"
                                  >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                              
                              {/* Contenu PDF */}
                              <div className="overflow-auto max-h-[400px] flex justify-center p-2">
                                <Document
                                  file={`/uploads/${response.filePath}`}
                                  onLoadSuccess={({ numPages }) => setResponseNumPages(numPages)}
                                  loading={
                                    <div className="flex items-center justify-center p-8">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                    </div>
                                  }
                                  error={
                                    <div className="text-center p-4 text-gray-500">
                                      <p>Impossible de charger le document</p>
                                      <a
                                        href={`/uploads/${response.filePath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:underline text-sm mt-2 inline-block"
                                      >
                                        Ouvrir dans un nouvel onglet
                                      </a>
                                    </div>
                                  }
                                >
                                  <Page
                                    pageNumber={responsePageNumber}
                                    scale={responseScale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                  />
                                </Document>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar - Historique */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Historique</h2>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <DocumentIcon className="w-3 h-3 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Courrier créé</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(mail.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                    {mail.importedBy && (
                      <p className="text-xs text-gray-500">
                        Par {mail.importedBy.firstName} {mail.importedBy.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Attribution au service */}
                {mail.service && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <BuildingOfficeIcon className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">Attribué au service</p>
                      <p className="text-xs text-gray-600 font-medium">
                        {mail.service.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Destinataire principal */}
                {mail.recipient && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">Destinataire</p>
                      <p className="text-xs text-gray-600 font-medium">
                        {mail.recipient.firstName} {mail.recipient.lastName}
                      </p>
                      {mail.recipient.email && (
                        <p className="text-xs text-gray-500">{mail.recipient.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Destinataires en copie */}
                {mail.recipientsCopy?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center">
                      <UserIcon className="w-3 h-3 text-cyan-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        En copie ({mail.recipientsCopy.length})
                      </p>
                      <div className="space-y-1 mt-1">
                        {mail.recipientsCopy.map((copyRecipient, index) => (
                          <div key={index} className="text-xs">
                            <span className="text-gray-600 font-medium">
                              {copyRecipient.firstName} {copyRecipient.lastName}
                            </span>
                            {copyRecipient.email && (
                              <span className="text-gray-500 ml-1">({copyRecipient.email})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lectures par utilisateurs */}
                {mail.readLogs?.length > 0 && mail.readLogs
                  .slice()
                  .sort((a, b) => new Date(a.readAt) - new Date(b.readAt))
                  .map((readLog, index) => (
                    <div key={`read-${index}`} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <EyeIcon className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">Lu</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(readLog.readAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                        {readLog.user && (
                          <p className="text-xs text-gray-500">
                            Par {readLog.user.firstName} {readLog.user.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                }

                {mail.processedDate && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success-100 flex items-center justify-center">
                      <CheckCircleIcon className="w-3 h-3 text-success-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">Traité</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(mail.processedDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                      {mail.processedBy && (
                        <p className="text-xs text-gray-500">
                          Par {mail.processedBy.firstName} {mail.processedBy.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Réponses dans l'historique */}
                {mail.responses?.length > 0 && mail.responses
                  .slice()
                  .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
                  .map((response, index) => (
                    <div key={`response-${index}`} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <ChatBubbleLeftRightIcon className="w-3 h-3 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Réponse ({response.type === 'courrier' ? 'Courrier' : response.type === 'email' ? 'Email' : 'Téléphone'})
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(response.date || response.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                        {response.respondedBy && (
                          <p className="text-xs text-gray-500">
                            Par {response.respondedBy.firstName} {response.respondedBy.lastName}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                          "{response.content}"
                        </p>
                      </div>
                    </div>
                  ))
                }

                {mail.archivedDate && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <ArchiveBoxIcon className="w-3 h-3 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">Archivé</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(mail.archivedDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                      {mail.archivedBy && (
                        <p className="text-xs text-gray-500">
                          Par {mail.archivedBy.firstName} {mail.archivedBy.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Pièces jointes */}
          {mail.attachments?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">
                  Pièces jointes ({mail.attachments.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {mail.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={`/uploads/${attachment.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {attachment.name}
                    </span>
                    <ArrowDownTrayIcon className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* Modal Plein écran PDF */}
      <AnimatePresence>
        {showFullscreen && mail.filePath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900"
          >
            {/* Header plein écran */}
            <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white p-3 flex items-center justify-between z-10">
              <h2 className="font-semibold flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                {mail.reference} - {mail.subject}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Zoom arrière"
                >
                  <MagnifyingGlassMinusIcon className="w-5 h-5" />
                </button>
                <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale(s => Math.min(3, s + 0.25))}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Zoom avant"
                >
                  <MagnifyingGlassPlusIcon className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-600 mx-2"></div>
                <button
                  onClick={handlePrint}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Imprimer"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowFullscreen(false)}
                  className="p-2 hover:bg-gray-700 rounded ml-2"
                  title="Fermer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu PDF plein écran */}
            <div className="absolute inset-0 top-14 bottom-14 overflow-auto flex items-start justify-center p-4 bg-gray-800">
              <Document
                file={`/uploads/${mail.filePath}`}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<LoadingSpinner />}
                error={<p className="text-danger-400">Erreur de chargement du PDF</p>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>

            {/* Footer plein écran - Navigation */}
            {numPages && (
              <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-white p-3 flex items-center justify-center gap-4 z-10">
                <button
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  Page {pageNumber} / {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Plein écran PDF Réponse */}
      <AnimatePresence>
        {showResponseFullscreen && fullscreenResponsePath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900"
          >
            {/* Header plein écran */}
            <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white p-3 flex items-center justify-between z-10">
              <h2 className="font-semibold flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Document de réponse
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResponseScale(s => Math.max(0.5, s - 0.25))}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Zoom arrière"
                >
                  <MagnifyingGlassMinusIcon className="w-5 h-5" />
                </button>
                <span className="text-sm min-w-[50px] text-center">{Math.round(responseScale * 100)}%</span>
                <button
                  onClick={() => setResponseScale(s => Math.min(3, s + 0.25))}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Zoom avant"
                >
                  <MagnifyingGlassPlusIcon className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-600 mx-2"></div>
                <button
                  onClick={() => {
                    const printWindow = window.open(fullscreenResponsePath, '_blank');
                    if (printWindow) {
                      printWindow.addEventListener('load', () => printWindow.print());
                    }
                  }}
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Imprimer"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>
                <a
                  href={fullscreenResponsePath}
                  download
                  className="p-2 hover:bg-gray-700 rounded"
                  title="Télécharger"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </a>
                <button
                  onClick={() => {
                    setShowResponseFullscreen(false);
                    setFullscreenResponsePath(null);
                  }}
                  className="p-2 hover:bg-gray-700 rounded ml-2"
                  title="Fermer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu PDF plein écran */}
            <div className="absolute inset-0 top-14 bottom-14 overflow-auto flex items-start justify-center p-4 bg-gray-800">
              <Document
                file={fullscreenResponsePath}
                onLoadSuccess={({ numPages }) => setResponseNumPages(numPages)}
                loading={<LoadingSpinner />}
                error={<p className="text-danger-400">Erreur de chargement du PDF</p>}
              >
                <Page
                  pageNumber={responsePageNumber}
                  scale={responseScale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>

            {/* Footer plein écran - Navigation */}
            {responseNumPages && responseNumPages > 1 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-white p-3 flex items-center justify-center gap-4 z-10">
                <button
                  onClick={() => setResponsePageNumber(p => Math.max(1, p - 1))}
                  disabled={responsePageNumber <= 1}
                  className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  Page {responsePageNumber} / {responseNumPages}
                </span>
                <button
                  onClick={() => setResponsePageNumber(p => Math.min(responseNumPages, p + 1))}
                  disabled={responsePageNumber >= responseNumPages}
                  className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Ajouter une réponse */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResponseModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Ajouter une réponse
                </h2>
                <form onSubmit={handleAddResponse}>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Type de réponse *</label>
                      <select
                        value={responseType}
                        onChange={(e) => setResponseType(e.target.value)}
                        className="input"
                        required
                      >
                        <option value="courrier">Courrier</option>
                        <option value="email">Email</option>
                        <option value="telephone">Téléphone</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Contenu de la réponse</label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="input min-h-[120px]"
                        placeholder="Saisissez votre réponse..."
                      />
                    </div>
                    <div>
                      <label className="label">Document joint (optionnel)</label>
                      <input
                        type="file"
                        onChange={(e) => setResponseFile(e.target.files[0])}
                        accept=".pdf,.doc,.docx"
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowResponseModal(false)}
                      className="btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={addResponseMutation.isLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      {addResponseMutation.isLoading ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
