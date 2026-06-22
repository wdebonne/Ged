import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { outgoingMailsAPI, contactsAPI, servicesAPI, subjectsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SENDING_METHODS = [
  { value: 'courrier', label: 'Courrier postal' },
  { value: 'email', label: 'Email' },
  { value: 'fax', label: 'Fax' },
  { value: 'main_propre', label: 'Remise en main propre' },
  { value: 'autre', label: 'Autre' }
];

const PRIORITIES = [
  { value: 'low', label: 'Basse' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' }
];

export default function CreateOutgoingMailPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationResults, setDestinationResults] = useState([]);
  const [showDestResults, setShowDestResults] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    destinationId: '',
    destinationName: '',
    service: user?.services?.[0]?._id || '',
    content: '',
    priority: 'normal',
    sendingMethod: 'courrier',
    trackingNumber: '',
    notes: ''
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await servicesAPI.getAll();
      return res.data?.data || [];
    }
  });

  const searchDestinations = useCallback(async (search) => {
    if (search.length < 1) {
      setDestinationResults([]);
      return;
    }
    try {
      const response = await contactsAPI.autocomplete(search);
      setDestinationResults(response.data?.data || []);
    } catch {
      setDestinationResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchDestinations(destinationSearch), 300);
    return () => clearTimeout(timer);
  }, [destinationSearch, searchDestinations]);

  const createMutation = useMutation({
    mutationFn: async ({ sendNow }) => {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('subject', formData.subject);
      fd.append('service', formData.service);
      fd.append('priority', formData.priority);
      fd.append('sendingMethod', formData.sendingMethod);
      if (formData.destinationId) fd.append('destinationId', formData.destinationId);
      if (formData.destinationName) fd.append('destinationName', formData.destinationName);
      if (formData.content) fd.append('content', formData.content);
      if (formData.trackingNumber) fd.append('trackingNumber', formData.trackingNumber);
      if (formData.notes) fd.append('notes', formData.notes);

      const result = await outgoingMailsAPI.create(fd);

      if (sendNow && result.data?.data?._id) {
        await outgoingMailsAPI.markAsSent(result.data.data._id);
      }

      return result;
    },
    onSuccess: (_, { sendNow }) => {
      navigate(sendNow ? '/courriers/depart/envoyes' : '/courriers/depart/brouillons');
    },
    onError: (error) => {
      setErrors({ submit: error.response?.data?.message || 'Erreur lors de la création' });
    }
  });

  const handleSubmit = (e, sendNow = false) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.subject) newErrors.subject = 'Objet requis';
    if (!formData.service) newErrors.service = 'Service requis';
    if (!formData.destinationId && !formData.destinationName) newErrors.destination = 'Destinataire requis';
    if (!file) newErrors.file = 'Document PDF requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    createMutation.mutate({ sendNow });
  };

  const selectDestination = (dest) => {
    setFormData(prev => ({
      ...prev,
      destinationId: dest._id,
      destinationName: dest.name
    }));
    setDestinationSearch(dest.name + (dest.organization ? ` (${dest.organization})` : ''));
    setShowDestResults(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau courrier départ</h1>
        <p className="text-gray-600 mt-1">Créer un nouveau courrier sortant</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="card p-6 space-y-6">
        {/* Objet */}
        <div>
          <label className="label">Objet *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className={`input ${errors.subject ? 'border-danger-500' : ''}`}
            placeholder="Objet du courrier"
          />
          {errors.subject && <p className="text-sm text-danger-600 mt-1">{errors.subject}</p>}
        </div>

        {/* Destinataire */}
        <div className="relative">
          <label className="label">Destinataire *</label>
          <input
            type="text"
            value={destinationSearch}
            onChange={(e) => {
              setDestinationSearch(e.target.value);
              setFormData(prev => ({ ...prev, destinationId: '', destinationName: e.target.value }));
              setShowDestResults(true);
            }}
            onFocus={() => setShowDestResults(true)}
            onBlur={() => setTimeout(() => setShowDestResults(false), 200)}
            className={`input ${errors.destination ? 'border-danger-500' : ''}`}
            placeholder="Rechercher ou saisir un nouveau contact..."
          />
          {errors.destination && <p className="text-sm text-danger-600 mt-1">{errors.destination}</p>}
          {showDestResults && destinationResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {destinationResults.map((dest) => (
                <button
                  key={dest._id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                  onClick={() => selectDestination(dest)}
                >
                  <p className="font-medium text-gray-900">{dest.name}</p>
                  {dest.organization && <p className="text-sm text-gray-500">{dest.organization}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Service + Priorité */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Service expéditeur *</label>
            <select
              value={formData.service}
              onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
              className={`input ${errors.service ? 'border-danger-500' : ''}`}
            >
              <option value="">Sélectionner...</option>
              {(servicesData || []).map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            {errors.service && <p className="text-sm text-danger-600 mt-1">{errors.service}</p>}
          </div>
          <div>
            <label className="label">Priorité</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="input"
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Méthode d'envoi + N° suivi */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Méthode d'envoi</label>
            <select
              value={formData.sendingMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, sendingMethod: e.target.value }))}
              className="input"
            >
              {SENDING_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">N° de suivi</label>
            <input
              type="text"
              value={formData.trackingNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
              className="input"
              placeholder="Optionnel"
            />
          </div>
        </div>

        {/* Contenu / Notes */}
        <div>
          <label className="label">Description / Notes</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="input min-h-[100px]"
            placeholder="Description du courrier (optionnel)"
          />
        </div>

        {/* Upload PDF */}
        <div>
          <label className="label">Document PDF *</label>
          {file ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-green-800 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-green-600 hover:text-green-800">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${errors.file ? 'border-danger-400' : 'border-gray-300'}`}>
              <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Cliquez pour sélectionner un PDF</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
          )}
          {errors.file && <p className="text-sm text-danger-600 mt-1">{errors.file}</p>}
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5" />
            {errors.submit}
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {createMutation.isLoading ? 'Enregistrement...' : 'Enregistrer brouillon'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={createMutation.isLoading}
            className="btn-primary flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            {createMutation.isLoading ? 'Envoi...' : 'Enregistrer et envoyer'}
          </button>
        </div>
      </form>
    </div>
  );
}
