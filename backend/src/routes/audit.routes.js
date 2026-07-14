import express from 'express';
import { AuditLog, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOG));

// GET /api/audit-logs - Liste paginée du journal d'audit
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = '',
      entityType = '',
      performedBy = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (entityType) query.entityType = entityType;
    if (performedBy) query.performedBy = performedBy;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur liste journal d\'audit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/audit-logs/entity-types - Types d'entités présents dans le journal (pour filtre)
router.get('/entity-types', async (req, res) => {
  try {
    const entityTypes = await AuditLog.distinct('entityType');
    res.json({ success: true, data: entityTypes.filter(Boolean).sort() });
  } catch (error) {
    console.error('Erreur types entités audit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
