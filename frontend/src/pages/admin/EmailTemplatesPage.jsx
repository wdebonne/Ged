import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { emailTemplatesAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  // Récupérer les templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await emailTemplatesAPI.getAll();
      return response.data.data;
    }
  });

  // Récupérer les actions disponibles
  const { data: actions } = useQuery({
    queryKey: ['email-template-actions'],
    queryFn: async () => {
      const response = await emailTemplatesAPI.getActions();
      return response.data.data;
    }
  });

  // Mutation suppression
  const deleteMutation = useMutation({
    mutationFn: (id) => emailTemplatesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates']);
      toast.success('Modèle supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  // Mutation toggle
  const toggleMutation = useMutation({
    mutationFn: (id) => emailTemplatesAPI.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates']);
    }
  });

  // Preview
  const handlePreview = async (template) => {
    try {
      const response = await emailTemplatesAPI.preview(template._id);
      setPreviewContent(response.data.data);
      setIsPreviewOpen(true);
    } catch (error) {
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleDelete = (template) => {
    if (window.confirm(`Supprimer le modèle "${template.name}" ?`)) {
      deleteMutation.mutate(template._id);
    }
  };

  // Grouper les templates par action
  const groupedTemplates = templates?.reduce((acc, template) => {
    if (!acc[template.action]) {
      acc[template.action] = [];
    }
    acc[template.action].push(template);
    return acc;
  }, {}) || {};

  const getActionLabel = (actionId) => {
    return actions?.find(a => a.id === actionId)?.label || actionId;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modèles de Mail</h1>
          <p className="text-gray-600 mt-1">
            Gérez les modèles d'emails pour les notifications automatiques
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nouveau modèle
        </button>
      </div>

      {/* Liste par action */}
      {Object.keys(groupedTemplates).length === 0 ? (
        <div className="card p-12 text-center">
          <EnvelopeIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun modèle</h3>
          <p className="text-gray-500 mb-4">Créez votre premier modèle de mail</p>
          <button onClick={handleCreate} className="btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            Créer un modèle
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([action, actionTemplates]) => (
            <motion.div
              key={action}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-primary-600" />
                  {getActionLabel(action)}
                </h2>
              </div>
              <div className="divide-y">
                {actionTemplates.map((template) => (
                  <div
                    key={template._id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          template.isActive ? 'bg-success-500' : 'bg-gray-300'
                        }`}
                        title={template.isActive ? 'Actif' : 'Inactif'}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {template.description && (
                            <p className="text-xs text-gray-400">{template.description}</p>
                          )}
                          {template.attachPdf && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                              <PaperClipIcon className="w-3 h-3" />
                              PDF joint
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMutation.mutate(template._id)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          template.isActive
                            ? 'bg-success-100 text-success-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {template.isActive ? 'Actif' : 'Inactif'}
                      </button>
                      <button
                        onClick={() => handlePreview(template)}
                        className="btn-icon"
                        title="Prévisualiser"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="btn-icon"
                        title="Modifier"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="btn-icon text-danger-600 hover:text-danger-700"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal d'édition/création */}
      <AnimatePresence>
        {isModalOpen && (
          <TemplateModal
            template={selectedTemplate}
            actions={actions}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal de prévisualisation */}
      <AnimatePresence>
        {isPreviewOpen && previewContent && (
          <PreviewModal
            content={previewContent}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal de création/édition
function TemplateModal({ template, actions, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('editor');
  const [formData, setFormData] = useState({
    name: template?.name || '',
    action: template?.action || 'welcome',
    subject: template?.subject || '',
    htmlContent: template?.htmlContent || getDefaultTemplate(),
    description: template?.description || '',
    isActive: template?.isActive ?? true,
    attachPdf: template?.attachPdf ?? false
  });

  const MAIL_ACTIONS = [
    'mail_to_process', 'mail_assigned', 'mail_reminder', 'mail_overdue',
    'supervisor_new_mail', 'corecipient_processed', 'corecipient_archived'
  ];
  const showAttachPdf = MAIL_ACTIONS.includes(formData.action);

  // Récupérer les variables disponibles pour l'action sélectionnée
  const selectedAction = actions?.find(a => a.id === formData.action);
  const availableVariables = selectedAction?.variables || [];

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return emailTemplatesAPI.update(template._id, data);
      }
      return emailTemplatesAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['email-templates']);
      toast.success(template ? 'Modèle mis à jour' : 'Modèle créé');
      onClose();
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    mutation.mutate(formData);
  };

  const insertVariable = (variable) => {
    // Insérer la variable à la position du curseur dans le textarea
    const textarea = document.getElementById('html-editor');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        formData.htmlContent.substring(0, start) +
        variable +
        formData.htmlContent.substring(end);
      setFormData({ ...formData, htmlContent: newContent });
      // Repositionner le curseur
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setFormData({ ...formData, htmlContent: formData.htmlContent + variable });
    }
  };

  const copyVariable = (variable) => {
    navigator.clipboard.writeText(variable);
    toast.success('Variable copiée');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">
              {template ? 'Modifier le modèle' : 'Nouveau modèle'}
            </h2>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Infos générales */}
            <div className="p-4 border-b bg-gray-50 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Nom du modèle *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Ex: Email de bienvenue"
                  />
                </div>
                <div>
                  <label className="label">Action *</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="input"
                  >
                    {actions?.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Sujet de l'email *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input"
                    placeholder="Ex: Bienvenue sur {{appName}}"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="label">Description (optionnelle)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    placeholder="Description du modèle"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Activer ce modèle</label>
                  </div>
                  {showAttachPdf && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="attachPdf"
                        checked={formData.attachPdf}
                        onChange={(e) => setFormData({ ...formData, attachPdf: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                      />
                      <label htmlFor="attachPdf" className="text-sm text-gray-700">Joindre le PDF du courrier</label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 flex overflow-hidden">
              {/* Variables disponibles */}
              <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Variables disponibles</h3>
                <p className="text-xs text-gray-500 mb-3">Cliquez pour insérer, double-cliquez pour copier</p>
                <div className="space-y-1">
                  {availableVariables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      onDoubleClick={() => copyVariable(variable)}
                      className="w-full text-left px-2 py-1.5 text-xs font-mono bg-white border rounded hover:bg-primary-50 hover:border-primary-300 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{variable}</span>
                      <ClipboardDocumentIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Éditeur et aperçu */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'editor'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                    Code HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'preview'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <EyeIcon className="w-4 h-4" />
                    Aperçu
                  </button>
                </div>

                {/* Contenu tab */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'editor' ? (
                    <textarea
                      id="html-editor"
                      value={formData.htmlContent}
                      onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                      className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                      placeholder="Saisissez votre code HTML ici..."
                    />
                  ) : (
                    <div className="h-full overflow-auto bg-gray-100 p-4">
                      <div className="bg-white rounded-lg shadow-sm mx-auto max-w-2xl">
                        <iframe
                          srcDoc={formData.htmlContent}
                          className="w-full h-[500px] border-0"
                          title="Aperçu du template"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                {mutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {template ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// Modal de prévisualisation
function PreviewModal({ content, onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Aperçu du mail</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sujet: {content.subject}
              </p>
            </div>
            <button onClick={onClose} className="btn-icon">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="overflow-auto max-h-[70vh] bg-gray-100 p-6">
            <div className="bg-white rounded-lg shadow-sm mx-auto max-w-2xl overflow-hidden">
              <iframe
                srcDoc={content.html}
                className="w-full h-[500px] border-0"
                title="Aperçu du mail"
              />
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <button onClick={onClose} className="btn-primary">
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Template HTML par défaut
function getDefaultTemplate() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{appName}}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .content h2 {
      color: #6366f1;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{appName}}</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{userFirstName}},</h2>
      <p>Votre contenu ici...</p>
      <a href="{{appUrl}}" class="button">Accéder à l'application</a>
    </div>
    <div class="footer">
      <p>© {{currentYear}} {{appName}}. Tous droits réservés.</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;
}
