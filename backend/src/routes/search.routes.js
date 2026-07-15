import express from 'express';
import { Mail, OutgoingMail, Contact } from '../models/index.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { escapeRegex } from '../utils/regex.js';
import { buildMailVisibilityQuery, buildOutgoingMailVisibilityQuery } from '../utils/mailVisibility.js';

const router = express.Router();
const RESULTS_PER_CATEGORY = 6;

const textOr = (safeSearch, fields) => ({
  $or: fields.map(field => ({ [field]: { $regex: safeSearch, $options: 'i' } }))
});

// GET /api/search - Recherche globale (entrants + sortants + contacts)
router.get('/', authenticate, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();

    if (q.length < 2) {
      return res.json({
        success: true,
        data: { query: q, mails: [], outgoingMails: [], contacts: [] }
      });
    }

    const safeSearch = escapeRegex(q);

    const [mailVisibility, outgoingVisibility] = await Promise.all([
      buildMailVisibilityQuery(req.user),
      buildOutgoingMailVisibilityQuery(req.user)
    ]);

    const [mails, outgoingMails, contacts] = await Promise.all([
      Mail.find({
        $and: [
          mailVisibility,
          textOr(safeSearch, ['subject', 'senderName', 'ocrContent', 'fileName', 'reference', 'chronoNumber'])
        ]
      })
        .select('subject senderName reference chronoNumber receivedDate status')
        .sort({ receivedDate: -1 })
        .limit(RESULTS_PER_CATEGORY)
        .lean(),
      OutgoingMail.find({
        $and: [
          outgoingVisibility,
          textOr(safeSearch, ['subject', 'destinationName', 'ocrContent', 'notes'])
        ]
      })
        .select('subject destinationName reference chronoNumber sentDate createdAt status')
        .sort({ createdAt: -1 })
        .limit(RESULTS_PER_CATEGORY)
        .lean(),
      Contact.find(textOr(safeSearch, ['name', 'organization', 'email']))
        .select('name organization email')
        .sort({ name: 1 })
        .limit(RESULTS_PER_CATEGORY)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        query: q,
        mails: mails.map(m => ({
          type: 'mail',
          id: m._id,
          subject: m.subject,
          senderName: m.senderName,
          reference: m.reference || m.chronoNumber,
          date: m.receivedDate,
          status: m.status,
          link: `/courriers/${m._id}`
        })),
        outgoingMails: outgoingMails.map(m => ({
          type: 'outgoingMail',
          id: m._id,
          subject: m.subject,
          destinationName: m.destinationName,
          reference: m.reference || m.chronoNumber,
          date: m.sentDate || m.createdAt,
          status: m.status,
          link: `/courriers/depart/${m._id}`
        })),
        contacts: contacts.map(c => ({
          type: 'contact',
          id: c._id,
          name: c.name,
          organization: c.organization,
          email: c.email,
          link: `/admin/contacts?highlight=${c._id}`
        }))
      }
    });
  } catch (error) {
    console.error('Erreur recherche globale:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
