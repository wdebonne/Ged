import express from 'express';
import { PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { startImapService, stopImapService, checkImapNow, getImapStatus } from '../services/imap.service.js';

const router = express.Router();

// GET /api/imap/status - Statut du service IMAP
router.get('/status', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    const status = getImapStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Erreur statut IMAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/imap/start - Démarrer le service IMAP
router.post('/start', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    await startImapService();
    
    res.json({
      success: true,
      message: 'Service IMAP démarré'
    });
  } catch (error) {
    console.error('Erreur démarrage IMAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de démarrage du service IMAP'
    });
  }
});

// POST /api/imap/stop - Arrêter le service IMAP
router.post('/stop', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    stopImapService();
    
    res.json({
      success: true,
      message: 'Service IMAP arrêté'
    });
  } catch (error) {
    console.error('Erreur arrêt IMAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur d\'arrêt du service IMAP'
    });
  }
});

// POST /api/imap/check - Vérifier les emails maintenant
// Accessible aux utilisateurs qui peuvent importer des courriers OU gérer IMAP
router.post('/check', authenticate, authorize(PERMISSIONS.MANAGE_IMAP, PERMISSIONS.IMPORT_MAILS), async (req, res) => {
  try {
    const result = await checkImapNow();
    
    res.json({
      success: true,
      message: `${result.count} nouveau(x) courrier(s) importé(s)`,
      data: result
    });
  } catch (error) {
    console.error('Erreur vérification IMAP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des emails'
    });
  }
});

export default router;
