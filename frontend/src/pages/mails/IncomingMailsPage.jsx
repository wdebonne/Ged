import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Document, Page, pdfjs } from 'react-pdf';
import { mailsAPI, sendersAPI, servicesAPI, subjectsAPI, usersAPI, imapAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function IncomingMailsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFileId = searchParams.get('file');

  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [formData, setFormData] = useState({
    senderName: '',
    subject: '',
    service: '',
    assignedTo: '',
    copyTo: [],
    priority: 'normal',
    notes: ''
  });
  const [senderSearch, setSenderSearch] = useState('');
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null); // null, 'checking', 'processing', 'done'
  const ocrTimeoutRefs = useRef([]);

  // Mutation pour vérifier IMAP
  const checkImapMutation = useMutation({
    mutationFn: () => {
      setOcrStatus('checking');
      return imapAPI.check();
    },
    onSuccess: (response) => {
      // Vérifier si IMAP est configuré et activé
      if (!response.data.success) {
        setOcrStatus(null);
        // Toujours rafraîchir la liste au cas où
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        toast.error(response.data.message || 'Erreur lors de la vérification IMAP');
        return;
      }
      
      const data = response.data.data;
      
      // Si pas de données, rafraîchir quand même et afficher message
      if (!data) {
        setOcrStatus(null);
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        toast('Aucun mail à traiter', { icon: 'ℹ️' });
        return;
      }
      
      // Vérifier s'il y a une erreur retournée par le service
      if (data.error) {
        setOcrStatus(null);
        // Toujours rafraîchir la liste au cas où
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        if (data.error === 'IMAP_DISABLED') {
          toast('IMAP n\'est pas activé dans les paramètres', { icon: '⚠️' });
        } else if (data.error === 'CONFIG_INCOMPLETE') {
          toast('Configuration IMAP incomplète', { icon: '⚠️' });
        } else {
          toast(data.message || 'Erreur IMAP', { icon: '⚠️' });
        }
        return;
      }
      
      // Afficher le résultat
      if (data.count > 0) {
        setOcrStatus('processing');
        toast.loading('OCR en cours de traitement...', { id: 'ocr-status' });
        
        // Rafraîchir immédiatement puis après un délai pour laisser l'OCR terminer
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        
        // Second rafraîchissement après 2 secondes
        const t1 = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['pending-files'] });
          setOcrStatus('done');
          toast.dismiss('ocr-status');
          toast.success(`${data.count} nouveau(x) courrier(s) importé(s)${data.filtered ? `, ${data.filtered} filtré(s)` : ''} - OCR terminé !`);

          const t2 = setTimeout(() => setOcrStatus(null), 3000);
          ocrTimeoutRefs.current.push(t2);
        }, 2000);
        ocrTimeoutRefs.current.push(t1);
      } else if (data.filtered > 0) {
        setOcrStatus(null);
        // Toujours rafraîchir la liste
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        toast(`Aucun nouveau courrier avec pièce jointe PDF (${data.filtered} email(s) filtré(s))`, { icon: 'ℹ️' });
      } else {
        setOcrStatus(null);
        // Toujours rafraîchir la liste même si aucun mail
        queryClient.invalidateQueries({ queryKey: ['pending-files'] });
        toast('Vérification terminée', { icon: '✅' });
      }
    },
    onError: (error) => {
      setOcrStatus(null);
      // Toujours rafraîchir la liste au cas où
      queryClient.invalidateQueries({ queryKey: ['pending-files'] });
      // Si c'est une erreur réseau ou serveur, afficher un message approprié
      const message = error.response?.data?.message;
      if (error.response?.status === 403) {
        toast.error('Vous n\'avez pas les droits pour cette action');
      } else if (message) {
        toast.error(message);
      } else {
        toast('Aucun mail à traiter', { icon: 'ℹ️' });
      }
    }
  });

  // Récupérer les fichiers en attente
  const { data: pendingFiles, isLoading } = useQuery({
    queryKey: ['pending-files'],
    queryFn: async () => {
      const response = await mailsAPI.getPending();
      return response.data.data;
    }
  });

  // Récupérer les services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data.data;
    }
  });

  // Récupérer les expéditeurs pour autocomplete
  const { data: senders } = useQuery({
    queryKey: ['senders-autocomplete'],
    queryFn: async () => {
      const response = await sendersAPI.getAll();
      return response.data.data?.senders || response.data.data || [];
    }
  });

  // Récupérer les objets pour autocomplete
  const { data: subjects } = useQuery({
    queryKey: ['subjects-autocomplete'],
    queryFn: async () => {
      const response = await subjectsAPI.getAll();
      return response.data.data?.subjects || response.data.data || [];
    }
  });

  // Récupérer les utilisateurs pour destinataires
  const { data: users } = useQuery({
    queryKey: ['users-recipients'],
    queryFn: async () => {
      const response = await usersAPI.getRecipients({ limit: 1000 });
      return response.data.data || [];
    }
  });

  // Filtrer les expéditeurs pour l'autocomplétion
  const filteredSenders = senders?.filter(sender =>
    sender.name.toLowerCase().includes(senderSearch.toLowerCase())
  ) || [];

  // Filtrer les objets pour l'autocomplétion
  const filteredSubjects = subjects?.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  ) || [];

  // Filtrer les services pour l'autocomplétion
  const filteredServices = services?.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  ) || [];

  // Filtrer les utilisateurs pour le destinataire
  const filteredRecipients = users?.filter(user =>
    `${user.lastName} ${user.firstName}`.toLowerCase().includes(recipientSearch.toLowerCase()) &&
    user.id !== formData.assignedTo
  ) || [];

  // Filtrer les utilisateurs pour les copies (exclure le destinataire principal et ceux déjà sélectionnés)
  const filteredCopyRecipients = users?.filter(user =>
    `${user.lastName} ${user.firstName}`.toLowerCase().includes(copySearch.toLowerCase()) &&
    user.id !== formData.assignedTo &&
    !formData.copyTo.includes(user.id)
  ) || [];

  // Obtenir le nom complet d'un utilisateur par son ID
  const getUserFullName = (userId) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.lastName} ${user.firstName}` : '';
  };

  // Obtenir le nom d'un service par son ID
  const getServiceName = (serviceId) => {
    const service = services?.find(s => s._id === serviceId);
    return service ? service.name : '';
  };

  // Cleanup des timeouts OCR au démontage
  useEffect(() => {
    return () => {
      ocrTimeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSenderDropdown(false);
      setShowSubjectDropdown(false);
      setShowServiceDropdown(false);
      setShowRecipientDropdown(false);
      setShowCopyDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mutation pour supprimer un fichier
  const deleteMutation = useMutation({
    mutationFn: (id) => mailsAPI.deletePending(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-files']);
      if (selectedFile) {
        setSelectedFile(null);
        setPdfUrl(null);
        setPdfError(null);
      }
    }
  });

  // Mutation pour importer le courrier
  const importMutation = useMutation({
    mutationFn: (data) => mailsAPI.importMail(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-files']);
      queryClient.invalidateQueries(['mails']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setSelectedFile(null);
      setPdfUrl(null);
      setPdfError(null);
      setFormData({
        senderName: '',
        subject: '',
        service: '',
        assignedTo: '',
        copyTo: [],
        priority: 'normal',
        notes: ''
      });
      setSenderSearch('');
      setSubjectSearch('');
      setServiceSearch('');
      setRecipientSearch('');
      setCopySearch('');
    }
  });

  const handleSelectFile = useCallback(async (file) => {
    setSelectedFile(file);
    setPageNumber(1);
    setFormData({
      senderName: '',
      subject: '',
      service: '',
      assignedTo: '',
      copyTo: [],
      priority: 'normal',
      notes: ''
    });
    setSenderSearch('');
    setSubjectSearch('');
    setServiceSearch('');
    setRecipientSearch('');
    setCopySearch('');

    // Charger le PDF
    setPdfUrl(null);
    setPdfError(null);
    try {
      const response = await mailsAPI.getPendingFile(file._id);
      const url = URL.createObjectURL(response.data);
      setPdfUrl(url);
    } catch (error) {
      console.error('Erreur chargement PDF:', error);
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const errData = JSON.parse(text);
          setPdfError(errData.message || `Erreur ${error.response.status} lors du chargement du fichier`);
        } catch {
          setPdfError(`Erreur ${error.response?.status || ''} lors du chargement du fichier`);
        }
      } else {
        setPdfError('Impossible de charger le fichier PDF');
      }
    }
  }, []);

  // Présélectionner un fichier si spécifié dans l'URL
  useEffect(() => {
    if (preselectedFileId && pendingFiles) {
      const file = pendingFiles.find(f => f._id === preselectedFileId);
      if (file) {
        handleSelectFile(file);
      }
    }
  }, [preselectedFileId, pendingFiles, handleSelectFile]);

  const handleImport = () => {
    if (!selectedFile || !formData.senderName || !formData.subject || !formData.service || !formData.assignedTo) {
      return;
    }

    importMutation.mutate({
      pendingMailId: selectedFile._id,
      senderName: formData.senderName,
      senderId: formData.senderName, // Le backend utilise senderId ou senderName
      subject: formData.subject,
      serviceId: formData.service,
      recipientId: formData.assignedTo,
      recipientsCopyIds: formData.copyTo,
      priority: formData.priority,
      notes: formData.notes
    });
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const isFormValid = formData.senderName && formData.subject && formData.service && formData.assignedTo;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courriers entrants</h1>
          <p className="text-gray-600">
            {pendingFiles?.length || 0} fichier(s) en attente d'import
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicateur de statut OCR */}
          {ocrStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              ocrStatus === 'checking' ? 'bg-blue-100 text-blue-700' :
              ocrStatus === 'processing' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {ocrStatus === 'checking' && (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Vérification IMAP...
                </>
              )}
              {ocrStatus === 'processing' && (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  OCR en cours...
                </>
              )}
              {ocrStatus === 'done' && (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  OCR terminé !
                </>
              )}
            </div>
          )}
          
          <button
            onClick={() => checkImapMutation.mutate()}
            disabled={checkImapMutation.isLoading || ocrStatus === 'processing'}
            className={`font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors ${
              ocrStatus === 'processing' 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title="Vérifier les nouveaux courriers par email"
          >
            {checkImapMutation.isLoading || ocrStatus === 'processing' ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <EnvelopeIcon className="w-5 h-5" />
            )}
            {checkImapMutation.isLoading ? 'Vérification...' : 
             ocrStatus === 'processing' ? 'OCR en cours...' : 'Vérifier Courrier'}
          </button>
          <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer">
            <ArrowUpTrayIcon className="w-5 h-5" />
            Ajouter des fichiers
            <input
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                  const formData = new FormData();
                  for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                  }
                  await mailsAPI.uploadPending(formData);
                  queryClient.invalidateQueries(['pending-files']);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Liste des fichiers */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-3 card flex flex-col overflow-hidden"
        >
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              Fichiers en attente
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {pendingFiles?.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun fichier en attente</p>
              </div>
            ) : (
              pendingFiles?.map((file) => (
                <div
                  key={file._id}
                  onClick={() => handleSelectFile(file)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedFile?._id === file._id
                      ? 'bg-primary-50 border-l-4 border-l-primary-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName || file.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {file.createdAt && format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Supprimer ce fichier ?')) {
                          deleteMutation.mutate(file._id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Aperçu PDF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-5 card flex flex-col overflow-hidden"
        >
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Aperçu du document</h2>
            {pdfUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Zoom arrière"
                >
                  <MagnifyingGlassMinusIcon className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale(s => Math.min(2, s + 0.25))}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Zoom avant"
                >
                  <MagnifyingGlassPlusIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
            {!selectedFile ? (
              <div className="text-center text-gray-500">
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sélectionnez un fichier pour voir l'aperçu</p>
              </div>
            ) : pdfError ? (
              <div className="text-center text-danger-600 p-4">
                <p className="text-sm font-medium">{pdfError}</p>
              </div>
            ) : pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
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
            ) : (
              <LoadingSpinner />
            )}
          </div>
          {pdfUrl && numPages && (
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
        </motion.div>

        {/* Formulaire d'import */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-4 card flex flex-col overflow-hidden"
        >
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Informations du courrier</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedFile ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sélectionnez un fichier pour remplir les informations</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expéditeur */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expéditeur <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.senderName}
                    onChange={(e) => {
                      setFormData({ ...formData, senderName: e.target.value });
                      setSenderSearch(e.target.value);
                      setShowSenderDropdown(true);
                    }}
                    onFocus={() => setShowSenderDropdown(true)}
                    placeholder="Saisissez le nom de l'expéditeur"
                    className="input"
                  />
                  {showSenderDropdown && filteredSenders.length > 0 && formData.senderName && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSenders.map((sender) => (
                        <div
                          key={sender._id}
                          onClick={() => {
                            setFormData({ ...formData, senderName: sender.name });
                            setSenderSearch('');
                            setShowSenderDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                        >
                          {sender.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Objet */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => {
                      setFormData({ ...formData, subject: e.target.value });
                      setSubjectSearch(e.target.value);
                      setShowSubjectDropdown(true);
                    }}
                    onFocus={() => setShowSubjectDropdown(true)}
                    placeholder="Saisissez l'objet du courrier"
                    className="input"
                  />
                  {showSubjectDropdown && filteredSubjects.length > 0 && formData.subject && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSubjects.map((subject) => (
                        <div
                          key={subject._id}
                          onClick={() => {
                            setFormData({ ...formData, subject: subject.name });
                            setSubjectSearch('');
                            setShowSubjectDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                        >
                          {subject.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.service ? getServiceName(formData.service) : serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setFormData({ ...formData, service: '' });
                      setShowServiceDropdown(true);
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                    placeholder="Rechercher un service..."
                    className="input"
                  />
                  {showServiceDropdown && filteredServices.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredServices.map((service) => (
                        <div
                          key={service._id}
                          onClick={() => {
                            setFormData({ ...formData, service: service._id });
                            setServiceSearch(service.name);
                            setShowServiceDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                        >
                          {service.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.service && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, service: '' });
                        setServiceSearch('');
                      }}
                      className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Destinataire */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinataire <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo ? getUserFullName(formData.assignedTo) : recipientSearch}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setFormData({ ...formData, assignedTo: '' });
                      setShowRecipientDropdown(true);
                    }}
                    onFocus={() => setShowRecipientDropdown(true)}
                    placeholder="Rechercher un destinataire..."
                    className="input"
                  />
                  {showRecipientDropdown && filteredRecipients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredRecipients.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setFormData({ ...formData, assignedTo: user.id });
                            setRecipientSearch(`${user.lastName} ${user.firstName}`);
                            setShowRecipientDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span>{user.lastName} {user.firstName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{user.services?.[0]?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.assignedTo && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, assignedTo: '' });
                        setRecipientSearch('');
                      }}
                      className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Destinataires en copie */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinataire(s) en copie
                  </label>
                  {/* Tags des destinataires sélectionnés */}
                  {formData.copyTo.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {formData.copyTo.map((userId) => (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                        >
                          {getUserFullName(userId)}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              copyTo: formData.copyTo.filter(id => id !== userId)
                            })}
                            className="hover:text-primary-900"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={copySearch}
                    onChange={(e) => {
                      setCopySearch(e.target.value);
                      setShowCopyDropdown(true);
                    }}
                    onFocus={() => setShowCopyDropdown(true)}
                    placeholder="Ajouter des destinataires en copie..."
                    className="input"
                  />
                  {showCopyDropdown && filteredCopyRecipients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCopyRecipients.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              copyTo: [...formData.copyTo, user.id]
                            });
                            setCopySearch('');
                            setShowCopyDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span>{user.lastName} {user.firstName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{user.services?.[0]?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input"
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ajoutez des notes ou commentaires..."
                    rows={4}
                    className="input resize-none"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          {selectedFile && (
            <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPdfUrl(null);
                  setPdfError(null);
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!isFormValid || importMutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {importMutation.isLoading ? 'Import en cours...' : 'Importer le courrier'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
