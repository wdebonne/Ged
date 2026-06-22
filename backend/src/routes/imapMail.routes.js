import express from 'express';
import { PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { startImapMailService, stopImapMailService, checkImapMailNow, getImapMailStatus } from '../services/imapMail.service.js';

const router = express.Router();

// GET /api/imap-mail/status
router.get('/status', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    const status = await getImapMailStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Erreur statut IMAP Mail:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/imap-mail/start
router.post('/start', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    await startImapMailService();
    res.json({ success: true, message: 'Service IMAP Email-PDF démarré' });
  } catch (error) {
    console.error('Erreur démarrage IMAP Mail:', error);
    res.status(500).json({ success: false, message: 'Erreur de démarrage' });
  }
});

// POST /api/imap-mail/stop
router.post('/stop', authenticate, authorize(PERMISSIONS.MANAGE_IMAP), async (req, res) => {
  try {
    stopImapMailService();
    res.json({ success: true, message: 'Service IMAP Email-PDF arrêté' });
  } catch (error) {
    console.error('Erreur arrêt IMAP Mail:', error);
    res.status(500).json({ success: false, message: 'Erreur d\'arrêt' });
  }
});

// POST /api/imap-mail/check
router.post('/check', authenticate, authorize(PERMISSIONS.MANAGE_IMAP, PERMISSIONS.IMPORT_MAILS), async (req, res) => {
  try {
    const result = await checkImapMailNow();
    res.json({
      success: true,
      message: `${result.count} document(s) importé(s)`,
      data: result
    });
  } catch (error) {
    console.error('Erreur vérification IMAP Mail:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification' });
  }
});

export default router;
