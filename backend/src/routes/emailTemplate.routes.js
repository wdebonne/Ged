import express from 'express';
import EmailTemplate, { EMAIL_ACTIONS } from '../models/EmailTemplate.model.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../models/Group.model.js';

const router = express.Router();

// Labels des actions pour l'affichage
const ACTION_LABELS = {
  [EMAIL_ACTIONS.WELCOME]: 'Bienvenue (création utilisateur)',
  [EMAIL_ACTIONS.PASSWORD_RESET]: 'Réinitialisation mot de passe',
  [EMAIL_ACTIONS.MAIL_TO_PROCESS]: 'Courrier à traiter',
  [EMAIL_ACTIONS.MAIL_ASSIGNED]: 'Courrier assigné',
  [EMAIL_ACTIONS.MAIL_REMINDER]: 'Rappel de courrier',
  [EMAIL_ACTIONS.MAIL_OVERDUE]: 'Courrier en retard',
  [EMAIL_ACTIONS.SUPERVISOR_NEW_MAIL]: 'Notification superviseur (nouveau courrier)',
  [EMAIL_ACTIONS.CORECIPIENT_PROCESSED]: 'Notification co-destinataire (traitement)',
  [EMAIL_ACTIONS.CORECIPIENT_ARCHIVED]: 'Notification co-destinataire (archivage)',
  [EMAIL_ACTIONS.CUSTOM]: 'Personnalisé'
};

// GET - Récupérer tous les templates
router.get('/', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const templates = await EmailTemplate.find()
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ action: 1, name: 1 });
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des templates'
    });
  }
});

// GET - Récupérer les actions disponibles
router.get('/actions', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const actions = Object.entries(EMAIL_ACTIONS).map(([key, value]) => ({
      id: value,
      label: ACTION_LABELS[value] || key,
      variables: EmailTemplate.getAvailableVariables(value)
    }));
    
    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Erreur récupération actions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des actions'
    });
  }
});

// GET - Récupérer un template par ID
router.get('/:id', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du template'
    });
  }
});

// POST - Créer un nouveau template
router.post('/', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const { name, action, subject, htmlContent, description, isActive, attachPdf } = req.body;

    if (!name || !action || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Nom, action, sujet et contenu HTML sont requis'
      });
    }

    // Si ce template est actif, désactiver les autres du même type
    if (isActive !== false) {
      await EmailTemplate.updateMany(
        { action, isActive: true },
        { isActive: false }
      );
    }

    const template = new EmailTemplate({
      name,
      action,
      subject,
      htmlContent,
      description,
      attachPdf: attachPdf || false,
      isActive: isActive !== false,
      variables: EmailTemplate.getAvailableVariables(action),
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'Template créé avec succès',
      data: template
    });
  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du template'
    });
  }
});

// PUT - Mettre à jour un template
router.put('/:id', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const { name, action, subject, htmlContent, description, isActive, attachPdf } = req.body;

    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }

    // Si on active ce template, désactiver les autres du même type
    if (isActive && !template.isActive) {
      const actionToUse = action || template.action;
      await EmailTemplate.updateMany(
        { action: actionToUse, isActive: true, _id: { $ne: template._id } },
        { isActive: false }
      );
    }

    template.name = name || template.name;
    template.action = action || template.action;
    template.subject = subject || template.subject;
    template.htmlContent = htmlContent || template.htmlContent;
    template.description = description !== undefined ? description : template.description;
    template.isActive = isActive !== undefined ? isActive : template.isActive;
    template.attachPdf = attachPdf !== undefined ? attachPdf : template.attachPdf;
    template.variables = EmailTemplate.getAvailableVariables(template.action);
    template.updatedBy = req.user.id;
    
    await template.save();
    
    res.json({
      success: true,
      message: 'Template mis à jour avec succès',
      data: template
    });
  } catch (error) {
    console.error('Erreur mise à jour template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du template'
    });
  }
});

// DELETE - Supprimer un template
router.delete('/:id', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Template supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du template'
    });
  }
});

// POST - Tester un template (preview avec données d'exemple)
router.post('/:id/preview', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    // Données d'exemple pour le preview
    const sampleData = {
      appName: 'GED Courrier',
      appUrl: 'http://localhost:5173',
      currentDate: new Date().toLocaleDateString('fr-FR'),
      currentYear: new Date().getFullYear(),
      userName: 'Jean Dupont',
      userEmail: 'jean.dupont@exemple.fr',
      userFirstName: 'Jean',
      userLastName: 'Dupont',
      temporaryPassword: 'TempPass123!',
      loginUrl: 'http://localhost:5173/login',
      resetLink: 'http://localhost:5173/reset-password?token=abc123',
      resetToken: 'abc123',
      expirationTime: '24 heures',
      mailReference: 'ENT-2025-001234',
      mailSubject: 'Demande de renseignements',
      senderName: 'Mairie de Paris',
      mailDate: new Date().toLocaleDateString('fr-FR'),
      mailPriority: 'Normal',
      mailUrl: 'http://localhost:5173/mails/123',
      assignedBy: 'Marie Martin',
      daysRemaining: '3',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      daysOverdue: '2'
    };
    
    // Remplacer les variables dans le HTML
    let previewHtml = template.htmlContent;
    let previewSubject = template.subject;
    
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewHtml = previewHtml.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });
    
    res.json({
      success: true,
      data: {
        subject: previewSubject,
        html: previewHtml
      }
    });
  } catch (error) {
    console.error('Erreur preview template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la prévisualisation du template'
    });
  }
});

// PUT - Activer/Désactiver un template
router.put('/:id/toggle', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    // Si on active, désactiver les autres du même type
    if (!template.isActive) {
      await EmailTemplate.updateMany(
        { action: template.action, isActive: true, _id: { $ne: template._id } },
        { isActive: false }
      );
    }
    
    template.isActive = !template.isActive;
    template.updatedBy = req.user.id;
    await template.save();
    
    res.json({
      success: true,
      message: template.isActive ? 'Template activé' : 'Template désactivé',
      data: template
    });
  } catch (error) {
    console.error('Erreur toggle template:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut du template'
    });
  }
});

export default router;
