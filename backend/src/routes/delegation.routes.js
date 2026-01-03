import express from 'express';
import { body, validationResult } from 'express-validator';
import { Delegation, User, Mail, DELEGATION_STATUS } from '../models/index.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Middleware pour mettre à jour les statuts des délégations à chaque requête
router.use(async (req, res, next) => {
  try {
    await Delegation.updateDelegationStatuses();
    next();
  } catch (error) {
    console.error('Erreur mise à jour statuts délégations:', error);
    next();
  }
});

// GET /api/delegations - Liste des délégations de l'utilisateur connecté
router.get('/', authenticate, async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    let delegationsAsOwner = [];
    let delegationsAsDelegate = [];
    
    if (type === 'all' || type === 'given') {
      // Délégations données (où l'utilisateur est délégant)
      delegationsAsOwner = await Delegation.find({ delegator: req.user._id })
        .populate('delegate', 'firstName lastName email avatar')
        .populate('revokedBy', 'firstName lastName')
        .sort({ createdAt: -1 });
    }
    
    if (type === 'all' || type === 'received') {
      // Délégations reçues (où l'utilisateur est délégataire)
      delegationsAsDelegate = await Delegation.find({ delegate: req.user._id })
        .populate('delegator', 'firstName lastName email avatar')
        .populate('revokedBy', 'firstName lastName')
        .sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      data: {
        given: delegationsAsOwner,
        received: delegationsAsDelegate
      }
    });
  } catch (error) {
    console.error('Erreur liste délégations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/delegations/active - Délégations actives (pour les filtres courriers)
router.get('/active', authenticate, async (req, res) => {
  try {
    // Récupérer les délégants de l'utilisateur (ceux qui lui ont délégué leurs courriers)
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    
    res.json({
      success: true,
      data: delegators
    });
  } catch (error) {
    console.error('Erreur délégations actives:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/delegations - Créer une nouvelle délégation
router.post('/', authenticate, [
  body('delegateId').notEmpty().withMessage('Le délégataire est requis'),
  body('startDate').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Date de début invalide');
    }
    return true;
  }),
  body('endDate').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Date de fin invalide');
    }
    return true;
  }),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { delegateId, startDate, endDate, reason } = req.body;
    
    // Vérifier que le délégataire existe
    const delegate = await User.findById(delegateId);
    if (!delegate) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur délégataire non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur ne délègue pas à lui-même
    if (delegateId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous déléguer vos propres courriers'
      });
    }
    
    // Vérifier qu'il n'y a pas déjà une délégation active vers cet utilisateur
    const existingDelegation = await Delegation.findOne({
      delegator: req.user._id,
      delegate: delegateId,
      status: { $in: [DELEGATION_STATUS.ACTIVE, DELEGATION_STATUS.PENDING] }
    });
    
    if (existingDelegation) {
      return res.status(400).json({
        success: false,
        message: 'Une délégation active existe déjà vers cet utilisateur'
      });
    }
    
    // Créer la délégation
    const delegation = new Delegation({
      delegator: req.user._id,
      delegate: delegateId,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      reason: reason || ''
    });
    
    await delegation.save();
    
    // Populer les données pour la réponse
    await delegation.populate('delegate', 'firstName lastName email avatar');
    
    res.status(201).json({
      success: true,
      message: 'Délégation créée avec succès',
      data: delegation
    });
  } catch (error) {
    console.error('Erreur création délégation:', error);
    
    // Gérer l'erreur d'index unique
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une délégation active existe déjà vers cet utilisateur'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// PUT /api/delegations/:id - Modifier une délégation
router.put('/:id', authenticate, [
  body('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const delegation = await Delegation.findById(req.params.id);
    
    if (!delegation) {
      return res.status(404).json({
        success: false,
        message: 'Délégation non trouvée'
      });
    }
    
    // Vérifier que l'utilisateur est le délégant
    if (delegation.delegator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette délégation'
      });
    }
    
    // Ne pas modifier une délégation révoquée ou expirée
    if (delegation.status === DELEGATION_STATUS.REVOKED || delegation.status === DELEGATION_STATUS.EXPIRED) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de modifier une délégation révoquée ou expirée'
      });
    }
    
    const { endDate, reason } = req.body;
    
    if (endDate !== undefined) {
      delegation.endDate = endDate ? new Date(endDate) : null;
    }
    if (reason !== undefined) {
      delegation.reason = reason;
    }
    
    await delegation.save();
    await delegation.populate('delegate', 'firstName lastName email avatar');
    
    res.json({
      success: true,
      message: 'Délégation mise à jour',
      data: delegation
    });
  } catch (error) {
    console.error('Erreur modification délégation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/delegations/:id/revoke - Révoquer une délégation
router.post('/:id/revoke', authenticate, [
  body('note').optional().trim()
], async (req, res) => {
  try {
    const delegation = await Delegation.findById(req.params.id);
    
    if (!delegation) {
      return res.status(404).json({
        success: false,
        message: 'Délégation non trouvée'
      });
    }
    
    // Vérifier que l'utilisateur est le délégant
    if (delegation.delegator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à révoquer cette délégation'
      });
    }
    
    // Ne pas révoquer une délégation déjà révoquée ou expirée
    if (delegation.status === DELEGATION_STATUS.REVOKED) {
      return res.status(400).json({
        success: false,
        message: 'Cette délégation est déjà révoquée'
      });
    }
    
    if (delegation.status === DELEGATION_STATUS.EXPIRED) {
      return res.status(400).json({
        success: false,
        message: 'Cette délégation est expirée'
      });
    }
    
    const { note } = req.body;
    await delegation.revoke(req.user._id, note || '');
    
    await delegation.populate('delegate', 'firstName lastName email avatar');
    await delegation.populate('revokedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Délégation révoquée avec succès',
      data: delegation
    });
  } catch (error) {
    console.error('Erreur révocation délégation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE /api/delegations/:id - Supprimer une délégation (uniquement si pending ou pour historique)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const delegation = await Delegation.findById(req.params.id);
    
    if (!delegation) {
      return res.status(404).json({
        success: false,
        message: 'Délégation non trouvée'
      });
    }
    
    // Vérifier que l'utilisateur est le délégant
    if (delegation.delegator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cette délégation'
      });
    }
    
    await delegation.deleteOne();
    
    res.json({
      success: true,
      message: 'Délégation supprimée'
    });
  } catch (error) {
    console.error('Erreur suppression délégation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/delegations/check/:userId - Vérifier si un utilisateur serait en doublon
router.get('/check/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur existe
    const user = await User.findById(userId).select('firstName lastName email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer un échantillon de courriers de l'utilisateur connecté
    const sampleMails = await Mail.find({
      $or: [
        { recipient: req.user._id },
        { recipientsCopy: req.user._id }
      ]
    }).limit(100).select('recipient recipientsCopy');
    
    // Compter combien de courriers ont déjà cet utilisateur comme destinataire ou co-destinataire
    let alreadyRecipientCount = 0;
    let alreadyCoRecipientCount = 0;
    
    for (const mail of sampleMails) {
      if (mail.recipient?.toString() === userId) {
        alreadyRecipientCount++;
      }
      if (mail.recipientsCopy?.some(r => r.toString() === userId)) {
        alreadyCoRecipientCount++;
      }
    }
    
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        overlap: {
          asRecipient: alreadyRecipientCount,
          asCoRecipient: alreadyCoRecipientCount,
          total: alreadyRecipientCount + alreadyCoRecipientCount,
          sampleSize: sampleMails.length
        }
      }
    });
  } catch (error) {
    console.error('Erreur vérification doublon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
