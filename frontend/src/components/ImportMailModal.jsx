import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { mailsAPI, servicesAPI, sendersAPI, subjectsAPI, usersAPI } from '../services/api';
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ImportMailModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    senderName: '',
    senderId: '',
    subject: '',
    subjectId: '',
    serviceId: '',
    assignedToId: '',
    priority: 'normal',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Autocomplete states
  const [senderSearch, setSenderSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // Fetch data for dropdowns
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesAPI.getAll();
      return response.data.data;
    },
    enabled: isOpen
  });

  const { data: senders } = useQuery({
    queryKey: ['senders', senderSearch],
    queryFn: async () => {
      const response = await sendersAPI.getAll({ search: senderSearch });
      return response.data.data;
    },
    enabled: isOpen && senderSearch.length > 0
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', subjectSearch],
    queryFn: async () => {
      const response = await subjectsAPI.getAll({ search: subjectSearch });
      return response.data.data;
    },
    enabled: isOpen && subjectSearch.length > 0
  });

  const { data: users } = useQuery({
    queryKey: ['users', formData.serviceId],
    queryFn: async () => {
      const response = await usersAPI.getByService(formData.serviceId);
      return response.data.data;
    },
    enabled: isOpen && !!formData.serviceId
  });

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setErrors(prev => ({ ...prev, file: null }));
    } else {
      setErrors(prev => ({ ...prev, file: 'Veuillez sélectionner un fichier PDF' }));
    }
  };

  // Handle form submission
  const createMailMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData();
      formDataToSend.append('document', file);
      
      // Ajouter les champs avec les bons noms
      if (data.senderName) formDataToSend.append('senderName', data.senderName);
      if (data.senderId) formDataToSend.append('senderId', data.senderId);
      if (data.subject) formDataToSend.append('subject', data.subject);
      if (data.subjectId) formDataToSend.append('subjectId', data.subjectId);
      if (data.serviceId) formDataToSend.append('serviceId', data.serviceId);
      if (data.assignedToId) formDataToSend.append('assignedToId', data.assignedToId);
      if (data.priority) formDataToSend.append('priority', data.priority);
      if (data.notes) formDataToSend.append('notes', data.notes);
      
      return mailsAPI.create(formDataToSend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mails']);
      handleClose();
    },
    onError: (error) => {
      setErrors(prev => ({ 
        ...prev, 
        submit: error.response?.data?.message || 'Erreur lors de la création du courrier' 
      }));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!file) {
      newErrors.file = 'Veuillez sélectionner un fichier PDF';
    }
    if (!formData.senderName && !formData.senderId) {
      newErrors.sender = 'Veuillez saisir un expéditeur';
    }
    if (!formData.subject && !formData.subjectId) {
      newErrors.subject = 'Veuillez saisir un objet';
    }
    if (!formData.serviceId) {
      newErrors.service = 'Veuillez sélectionner un service';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMailMutation.mutate(formData);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setFormData({
      senderName: '',
      senderId: '',
      subject: '',
      subjectId: '',
      serviceId: '',
      assignedToId: '',
      priority: 'normal',
      notes: ''
    });
    setSenderSearch('');
    setSubjectSearch('');
    setErrors({});
    onClose();
  };

  // Select sender from dropdown
  const selectSender = (sender) => {
    setFormData(prev => ({ ...prev, senderId: sender._id, senderName: sender.name }));
    setSenderSearch(sender.name);
    setShowSenderDropdown(false);
  };

  // Select subject from dropdown
  const selectSubject = (subject) => {
    setFormData(prev => ({ ...prev, subjectId: subject._id, subject: subject.name }));
    setSubjectSearch(subject.name);
    setShowSubjectDropdown(false);
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Importer un nouveau courrier
            </h2>
            <button onClick={handleClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left - PDF Preview */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Document PDF</h3>
                
                {!file ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      errors.file 
                        ? 'border-danger-300 bg-danger-50' 
                        : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                    }`}
                  >
                    <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      Cliquez pour sélectionner un fichier PDF
                    </p>
                    <p className="text-sm text-gray-400">
                      ou glissez-déposez votre fichier ici
                    </p>
                    {errors.file && (
                      <p className="text-sm text-danger-600 mt-2">{errors.file}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-primary-600" />
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="btn-icon text-danger-600"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {previewUrl && (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[400px] rounded-lg border"
                        title="Aperçu PDF"
                      />
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Right - Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Informations du courrier</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Expéditeur */}
                  <div className="relative">
                    <label className="label">Expéditeur *</label>
                    <input
                      type="text"
                      value={senderSearch}
                      onChange={(e) => {
                        setSenderSearch(e.target.value);
                        setFormData(prev => ({ ...prev, senderName: e.target.value, senderId: '' }));
                        setShowSenderDropdown(true);
                      }}
                      onFocus={() => setShowSenderDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSenderDropdown(false), 200)}
                      placeholder="Saisissez le nom de l'expéditeur"
                      className={`input ${errors.sender ? 'border-danger-500' : ''}`}
                    />
                    {errors.sender && (
                      <p className="text-sm text-danger-600 mt-1">{errors.sender}</p>
                    )}
                    
                    {/* Sender Dropdown */}
                    {showSenderDropdown && senders?.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {senders.map((sender) => (
                          <button
                            key={sender._id}
                            type="button"
                            onClick={() => selectSender(sender)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            {sender.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Objet */}
                  <div className="relative">
                    <label className="label">Objet *</label>
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        setFormData(prev => ({ ...prev, subject: e.target.value, subjectId: '' }));
                        setShowSubjectDropdown(true);
                      }}
                      onFocus={() => setShowSubjectDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                      placeholder="Saisissez l'objet du courrier"
                      className={`input ${errors.subject ? 'border-danger-500' : ''}`}
                    />
                    {errors.subject && (
                      <p className="text-sm text-danger-600 mt-1">{errors.subject}</p>
                    )}
                    
                    {/* Subject Dropdown */}
                    {showSubjectDropdown && subjects?.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {subjects.map((subject) => (
                          <button
                            key={subject._id}
                            type="button"
                            onClick={() => selectSubject(subject)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            {subject.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service */}
                  <div>
                    <label className="label">Service destinataire *</label>
                    <select
                      value={formData.serviceId}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        serviceId: e.target.value,
                        assignedToId: '' 
                      }))}
                      className={`input ${errors.service ? 'border-danger-500' : ''}`}
                    >
                      <option value="">Sélectionnez un service</option>
                      {services?.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                    {errors.service && (
                      <p className="text-sm text-danger-600 mt-1">{errors.service}</p>
                    )}
                  </div>

                  {/* Destinataire */}
                  {formData.serviceId && (
                    <div>
                      <label className="label">Destinataire (optionnel)</label>
                      <select
                        value={formData.assignedToId}
                        onChange={(e) => setFormData(prev => ({ ...prev, assignedToId: e.target.value }))}
                        className="input"
                      >
                        <option value="">Aucun destinataire spécifique</option>
                        {users?.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Priority */}
                  <div>
                    <label className="label">Priorité</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
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
                    <label className="label">Notes (optionnel)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Ajoutez des notes ou commentaires..."
                      className="input min-h-[100px]"
                    />
                  </div>

                  {/* Error message */}
                  {errors.submit && (
                    <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      {errors.submit}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMailMutation.isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {createMailMutation.isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importation...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Importer le courrier
                </>
              )}
            </button>
          </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
