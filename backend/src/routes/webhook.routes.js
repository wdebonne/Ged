import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import Webhook, { WEBHOOK_EVENTS } from '../models/Webhook.model.js';
import { PERMISSIONS } from '../models/Group.model.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/webhooks/events - Obtenir la liste des événements disponibles
router.get('/events', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const events = Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      key,
      value,
      category: value.split('.')[0],
      action: value.split('.')[1]
    }));

    // Grouper par catégorie
    const grouped = events.reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        events,
        grouped,
        categories: Object.keys(grouped)
      }
    });
  } catch (error) {
    console.error('Erreur liste événements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/webhooks - Obtenir tous les webhooks
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const webhooks = await Webhook.find()
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Masquer les secrets et mots de passe
    const sanitizedWebhooks = webhooks.map(w => {
      const obj = w.toObject();
      if (obj.secret) {
        obj.secret = '••••••••';
      }
      if (obj.authPassword) {
        obj.authPassword = '••••••••';
      }
      return obj;
    });

    res.json({
      success: true,
      data: sanitizedWebhooks
    });
  } catch (error) {
    console.error('Erreur liste webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/webhooks/:id - Obtenir un webhook
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_SETTINGS), async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook non trouvé'
      });
    }

    const obj = webhook.toObject();
    if (obj.secret) {
      obj.secret = '••••••••';
    }
    if (obj.authPassword) {
      obj.authPassword = '••••••••';
    }

    res.json({
      success: true,
      data: obj
    });
  } catch (error) {
    console.error('Erreur détail webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/webhooks - Créer un webhook
router.post('/',
  authenticate,
  authorize(PERMISSIONS.EDIT_SETTINGS),
  [
    body('name').trim().notEmpty().withMessage('Le nom est requis'),
    body('url').trim().isURL().withMessage('URL invalide'),
    body('events').isArray({ min: 1 }).withMessage('Au moins un événement est requis')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { name, url, description, events, authType, secret, authUsername, authPassword, headers, isActive, retryOnFailure, maxRetries, timeoutMs } = req.body;

      // Vérifier que les événements sont valides
      const validEvents = Object.values(WEBHOOK_EVENTS);
      const invalidEvents = events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Événements invalides: ${invalidEvents.join(', ')}`
        });
      }

      const webhook = new Webhook({
        name,
        url,
        description,
        events,
        authType: authType || 'none',
        secret,
        authUsername,
        authPassword,
        headers: headers || {},
        isActive: isActive !== false,
        retryOnFailure: retryOnFailure !== false,
        maxRetries: maxRetries || 3,
        timeoutMs: timeoutMs || 30000,
        createdBy: req.user._id
      });

      await webhook.save();

      res.status(201).json({
        success: true,
        message: 'Webhook créé',
        data: webhook
      });
    } catch (error) {
      console.error('Erreur création webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// PUT /api/webhooks/:id - Modifier un webhook
router.put('/:id',
  authenticate,
  authorize(PERMISSIONS.EDIT_SETTINGS),
  [
    body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
    body('url').optional().trim().isURL().withMessage('URL invalide'),
    body('events').optional().isArray({ min: 1 }).withMessage('Au moins un événement est requis')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const webhook = await Webhook.findById(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      const { name, url, description, events, authType, secret, authUsername, authPassword, headers, isActive, retryOnFailure, maxRetries, timeoutMs } = req.body;

      // Vérifier les événements si fournis
      if (events) {
        const validEvents = Object.values(WEBHOOK_EVENTS);
        const invalidEvents = events.filter(e => !validEvents.includes(e));
        if (invalidEvents.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Événements invalides: ${invalidEvents.join(', ')}`
          });
        }
        webhook.events = events;
      }

      if (name !== undefined) webhook.name = name;
      if (url !== undefined) webhook.url = url;
      if (description !== undefined) webhook.description = description;
      if (authType !== undefined) webhook.authType = authType;
      if (secret !== undefined && secret !== '••••••••') webhook.secret = secret;
      if (authUsername !== undefined) webhook.authUsername = authUsername;
      if (authPassword !== undefined && authPassword !== '••••••••') webhook.authPassword = authPassword;
      if (headers !== undefined) webhook.headers = headers;
      if (isActive !== undefined) webhook.isActive = isActive;
      if (retryOnFailure !== undefined) webhook.retryOnFailure = retryOnFailure;
      if (maxRetries !== undefined) webhook.maxRetries = maxRetries;
      if (timeoutMs !== undefined) webhook.timeoutMs = timeoutMs;

      webhook.updatedBy = req.user._id;

      await webhook.save();

      res.json({
        success: true,
        message: 'Webhook mis à jour',
        data: webhook
      });
    } catch (error) {
      console.error('Erreur modification webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// DELETE /api/webhooks/:id - Supprimer un webhook
router.delete('/:id', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Webhook supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/webhooks/:id/toggle - Activer/Désactiver un webhook
router.post('/:id/toggle', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook non trouvé'
      });
    }

    webhook.isActive = !webhook.isActive;
    webhook.updatedBy = req.user._id;
    await webhook.save();

    res.json({
      success: true,
      message: webhook.isActive ? 'Webhook activé' : 'Webhook désactivé',
      data: { isActive: webhook.isActive }
    });
  } catch (error) {
    console.error('Erreur toggle webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/webhooks/:id/test - Tester un webhook
router.post('/:id/test', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook non trouvé'
      });
    }

    // Données de test
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Ceci est un test de webhook depuis GED Courrier',
        webhookId: webhook._id,
        webhookName: webhook.name
      }
    };

    // Préparer les headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'GED-Courrier-Webhook/1.0',
      'X-Webhook-Event': 'webhook.test',
      'X-Webhook-Delivery': crypto.randomUUID()
    };

    // Ajouter les headers personnalisés
    if (webhook.headers) {
      for (const [key, value] of webhook.headers) {
        headers[key] = value;
      }
    }

    // Gérer l'authentification selon le type
    if (webhook.authType === 'hmac' && webhook.secret) {
      // Signature HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    } else if (webhook.authType === 'basic' && webhook.authUsername && webhook.authPassword) {
      // Authentification Basic
      const credentials = Buffer.from(`${webhook.authUsername}:${webhook.authPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Envoyer la requête
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeoutMs);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const responseText = await response.text().catch(() => '');
      
      // Enregistrer le résultat
      await webhook.recordCall(
        response.ok,
        response.ok ? null : `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
        response.status
      );

      if (response.ok) {
        res.json({
          success: true,
          message: 'Test réussi',
          data: {
            statusCode: response.status,
            responseTime: Date.now() - new Date(testPayload.timestamp).getTime(),
            response: responseText.substring(0, 500)
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Erreur HTTP ${response.status}`,
          data: {
            statusCode: response.status,
            response: responseText.substring(0, 500)
          }
        });
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      
      const errorMessage = fetchError.name === 'AbortError' 
        ? `Timeout après ${webhook.timeoutMs}ms`
        : fetchError.message;

      await webhook.recordCall(false, errorMessage, null);

      res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error) {
    console.error('Erreur test webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/webhooks/:id/reset-stats - Réinitialiser les statistiques
router.post('/:id/reset-stats', authenticate, authorize(PERMISSIONS.EDIT_SETTINGS), async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook non trouvé'
      });
    }

    webhook.totalCalls = 0;
    webhook.successfulCalls = 0;
    webhook.failedCalls = 0;
    webhook.lastTriggeredAt = null;
    webhook.lastStatus = null;
    webhook.lastError = null;
    webhook.lastResponseCode = null;
    webhook.updatedBy = req.user._id;

    await webhook.save();

    res.json({
      success: true,
      message: 'Statistiques réinitialisées'
    });
  } catch (error) {
    console.error('Erreur reset stats webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
