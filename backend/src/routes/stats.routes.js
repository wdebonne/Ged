import express from 'express';
import { Mail, OutgoingMail, User, Service, PendingMail, Delegation, MAIL_STATUS, OUTGOING_MAIL_STATUS, PERMISSIONS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

function isServiceSupervisor(user) {
  if (!user?.services?.length) return false;
  const userId = user._id.toString();
  return user.services.some(service => {
    const ids = (service.supervisors || []).map(s => s?._id?.toString() || s?.toString());
    return ids.includes(userId);
  });
}

// GET /api/stats - Statistiques générales
router.get('/', authenticate, async (req, res) => {
  try {
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);
    const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);

    // Récupérer les délégations actives reçues par l'utilisateur
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    const delegatorIds = delegators.map(d => d._id);

    // Mes courriers (où je suis destinataire direct UNIQUEMENT - sans délégués)
    // Exclure les courriers où je suis en copie mais le destinataire principal est un délégant
    let myQuery;
    if (delegatorIds.length > 0) {
      myQuery = {
        $or: [
          { recipient: req.user._id },  // Je suis destinataire principal
          { 
            recipientsCopy: req.user._id,  // Je suis en copie
            recipient: { $nin: delegatorIds }  // ET le destinataire principal n'est PAS un délégant
          }
        ]
      };
    } else {
      myQuery = {
        $or: [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ]
      };
    }

    const [myPending, myProcessed, myArchived] = await Promise.all([
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PENDING }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PROCESSED }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.ARCHIVED })
    ]);

    const stats = {
      my: {
        pending: myPending,
        processed: myProcessed,
        archived: myArchived
      }
    };

    // Courriers délégués (courriers des utilisateurs qui m'ont délégué)
    if (delegatorIds.length > 0) {
      // Courriers des délégants, en excluant ceux où je suis déjà destinataire
      const delegatedQuery = {
        $and: [
          {
            $or: [
              { recipient: { $in: delegatorIds } },
              { recipientsCopy: { $in: delegatorIds } }
            ]
          },
          { recipient: { $nin: [req.user._id] } },
          {
            $or: [
              { recipientsCopy: { $exists: false } },
              { recipientsCopy: { $size: 0 } },
              { recipientsCopy: { $nin: [req.user._id] } }
            ]
          }
        ]
      };

      const [delegatedPending, delegatedProcessed, delegatedArchived] = await Promise.all([
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.PENDING }),
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.PROCESSED }),
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.ARCHIVED })
      ]);

      stats.delegated = {
        pending: delegatedPending,
        processed: delegatedProcessed,
        archived: delegatedArchived
      };
    }

    // Courriers Service(s) - courriers assignés à mes services (exclure ceux où je suis déjà destinataire)
    // Requiert la permission VIEW_SERVICE_MAILS OU être superviseur, ET avoir des services
    if (canViewServiceMails && userServiceIds.length > 0) {
      const serviceQuery = { 
        service: { $in: userServiceIds },
        recipient: { $ne: req.user._id },
        recipientsCopy: { $ne: req.user._id }
      };
      
      const [servicePending, serviceProcessed, serviceArchived] = await Promise.all([
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.PENDING }),
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.PROCESSED }),
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.ARCHIVED })
      ]);

      stats.service = {
        pending: servicePending,
        processed: serviceProcessed,
        archived: serviceArchived
      };
    }

    // Stats globales (pour admins et archivistes)
    if (userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS) || userPermissions.includes(PERMISSIONS.IMPORT_MAILS)) {
      const [allPending, allProcessed, allArchived, pendingImport] = await Promise.all([
        Mail.countDocuments({ status: MAIL_STATUS.PENDING }),
        Mail.countDocuments({ status: MAIL_STATUS.PROCESSED }),
        Mail.countDocuments({ status: MAIL_STATUS.ARCHIVED }),
        PendingMail.countDocuments()
      ]);

      stats.all = {
        pending: allPending,
        processed: allProcessed,
        archived: allArchived
      };

      stats.pendingImport = pendingImport;
    }

    // Stats courrier départ
    const outgoingQuery = userPermissions.includes(PERMISSIONS.VIEW_ALL_OUTGOING)
      ? {}
      : (userPermissions.includes(PERMISSIONS.VIEW_SERVICE_OUTGOING) && userServiceIds.length > 0)
        ? { $or: [{ sender: req.user._id }, { service: { $in: userServiceIds } }] }
        : { sender: req.user._id };

    const [outDraft, outSent, outArchived] = await Promise.all([
      OutgoingMail.countDocuments({ ...outgoingQuery, status: OUTGOING_MAIL_STATUS.DRAFT }),
      OutgoingMail.countDocuments({ ...outgoingQuery, status: OUTGOING_MAIL_STATUS.SENT }),
      OutgoingMail.countDocuments({ ...outgoingQuery, status: OUTGOING_MAIL_STATUS.ARCHIVED })
    ]);

    stats.outgoing = {
      draft: outDraft,
      sent: outSent,
      archived: outArchived
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats/dashboard - Statistiques pour le tableau de bord
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const dashboardStats = {};

    // Récupérer les délégations actives reçues par l'utilisateur
    const delegators = await Delegation.getDelegatorsForUser(req.user._id);
    const delegatorIds = delegators.map(d => d._id);

    // === MES COURRIERS (où je suis destinataire UNIQUEMENT - sans délégués) ===
    // Exclure les courriers où je suis en copie mais le destinataire principal est un délégant
    let myQuery;
    if (delegatorIds.length > 0) {
      myQuery = {
        $or: [
          { recipient: req.user._id },  // Je suis destinataire principal
          { 
            recipientsCopy: req.user._id,  // Je suis en copie
            recipient: { $nin: delegatorIds }  // ET le destinataire principal n'est PAS un délégant
          }
        ]
      };
    } else {
      myQuery = {
        $or: [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ]
      };
    }

    const [myPending, myProcessed, myArchived] = await Promise.all([
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PENDING }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PROCESSED }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.ARCHIVED })
    ]);

    dashboardStats.my = {
      pending: myPending,
      processed: myProcessed,
      archived: myArchived
    };

    // === COURRIERS DÉLÉGUÉS (courriers des utilisateurs qui m'ont délégué) ===
    if (delegatorIds.length > 0) {
      // Courriers des délégants, en excluant ceux où je suis déjà destinataire
      const delegatedQuery = {
        $and: [
          {
            $or: [
              { recipient: { $in: delegatorIds } },
              { recipientsCopy: { $in: delegatorIds } }
            ]
          },
          { recipient: { $nin: [req.user._id] } },
          {
            $or: [
              { recipientsCopy: { $exists: false } },
              { recipientsCopy: { $size: 0 } },
              { recipientsCopy: { $nin: [req.user._id] } }
            ]
          }
        ]
      };

      const [delegatedPending, delegatedProcessed, delegatedArchived] = await Promise.all([
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.PENDING }),
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.PROCESSED }),
        Mail.countDocuments({ ...delegatedQuery, status: MAIL_STATUS.ARCHIVED })
      ]);

      dashboardStats.delegated = {
        pending: delegatedPending,
        processed: delegatedProcessed,
        archived: delegatedArchived
      };
    }

    // === COURRIERS SERVICE(S) (du service mais pas déjà dans mes courriers) ===
    if (userServiceIds.length > 0) {
      const serviceQuery = {
        service: { $in: userServiceIds },
        recipient: { $ne: req.user._id },
        $or: [
          { recipientsCopy: { $exists: false } },
          { recipientsCopy: { $not: { $elemMatch: { $eq: req.user._id } } } }
        ]
      };

      const [servicePending, serviceProcessed, serviceArchived] = await Promise.all([
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.PENDING }),
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.PROCESSED }),
        Mail.countDocuments({ ...serviceQuery, status: MAIL_STATUS.ARCHIVED })
      ]);

      dashboardStats.service = {
        pending: servicePending,
        processed: serviceProcessed,
        archived: serviceArchived
      };
    }

    // === TOTAUX (pour compatibilité) ===
    // Déterminer la requête de base selon les permissions
    let baseQuery = {};
    if (userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
      // Admin/Archiviste: voir tous les courriers
      baseQuery = {};
    } else if (userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || userServiceIds.length > 0) {
      // Superviseur ou utilisateur avec service: voir les courriers du service
      baseQuery = {
        $or: [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id },
          { service: { $in: userServiceIds } }
        ]
      };
    } else {
      // Utilisateur sans service: voir uniquement ses courriers
      baseQuery = {
        $or: [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ]
      };
    }

    // Compteurs principaux (totaux)
    const [pendingCount, processedCount, archivedCount] = await Promise.all([
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.PENDING }),
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.PROCESSED }),
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.ARCHIVED })
    ]);

    dashboardStats.pendingCount = pendingCount;
    dashboardStats.processedCount = processedCount;
    dashboardStats.archivedCount = archivedCount;
    
    // Totaux globaux pour admin
    dashboardStats.totalPending = pendingCount;
    dashboardStats.totalProcessed = processedCount;
    dashboardStats.totalArchived = archivedCount;

    // Courriers reçus cette semaine
    dashboardStats.thisWeek = await Mail.countDocuments({
      ...baseQuery,
      receivedDate: { $gte: startOfWeek }
    });

    // Courriers reçus ce mois
    dashboardStats.thisMonth = await Mail.countDocuments({
      ...baseQuery,
      receivedDate: { $gte: startOfMonth }
    });

    // Courriers non lus pour l'utilisateur
    dashboardStats.unread = await Mail.countDocuments({
      $or: [
        { recipient: req.user._id },
        { recipientsCopy: req.user._id }
      ],
      isRead: false
    });

    // Temps moyen de traitement (en jours)
    if (userPermissions.includes(PERMISSIONS.VIEW_ALL_STATS)) {
      const processedMails = await Mail.find({
        status: { $in: [MAIL_STATUS.PROCESSED, MAIL_STATUS.ARCHIVED] },
        processedDate: { $exists: true }
      }).select('receivedDate processedDate');

      if (processedMails.length > 0) {
        const totalDays = processedMails.reduce((sum, mail) => {
          const diff = (mail.processedDate - mail.receivedDate) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0);
        dashboardStats.avgProcessingTime = Math.round(totalDays / processedMails.length * 10) / 10;
      } else {
        dashboardStats.avgProcessingTime = 0;
      }
    }

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Erreur statistiques dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats/by-service - Statistiques par service
router.get('/by-service', authenticate, authorize(PERMISSIONS.VIEW_ALL_STATS), async (req, res) => {
  try {
    const stats = await Mail.aggregate([
      {
        $group: {
          _id: '$service',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PENDING] }, 1, 0] }
          },
          processed: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PROCESSED] }, 1, 0] }
          },
          archived: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.ARCHIVED] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      {
        $unwind: '$service'
      },
      {
        $project: {
          _id: 1,
          serviceName: '$service.name',
          serviceCode: '$service.code',
          total: 1,
          pending: 1,
          processed: 1,
          archived: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur statistiques par service:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats/by-month - Statistiques par mois
router.get('/by-month', authenticate, authorize(PERMISSIONS.VIEW_STATS), async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const stats = await Mail.aggregate([
      {
        $match: {
          receivedDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: '$receivedDate' },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PENDING] }, 1, 0] }
          },
          processed: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PROCESSED] }, 1, 0] }
          },
          archived: {
            $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.ARCHIVED] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Remplir les mois manquants
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const found = stats.find(s => s._id === i + 1);
      return {
        month: i + 1,
        total: found?.total || 0,
        pending: found?.pending || 0,
        processed: found?.processed || 0,
        archived: found?.archived || 0
      };
    });

    res.json({
      success: true,
      data: monthlyStats
    });
  } catch (error) {
    console.error('Erreur statistiques par mois:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats/detailed - Statistiques détaillées avec filtres
router.get('/detailed', authenticate, async (req, res) => {
  try {
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);
    const { startDate, endDate, serviceId, userId, scope = 'my' } = req.query;

    // Construire le filtre de date
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // Déterminer la requête de base selon le scope et les permissions
    let baseQuery = {};
    
    if (scope === 'all' && userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
      // Admin/Archiviste: voir tous
      baseQuery = {};
      if (serviceId) baseQuery.service = serviceId;
      if (userId) baseQuery.recipient = userId;
    } else if (scope === 'service' && (userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user) || userServiceIds.length > 0)) {
      // Responsable de service ou utilisateur avec services
      const userServiceIdStrings = userServiceIds.map(id => id.toString());
      const targetServiceId = serviceId && userServiceIdStrings.includes(serviceId)
        ? serviceId
        : (userServiceIds.length > 0 ? userServiceIds[0] : null);
      if (targetServiceId) {
        baseQuery.service = targetServiceId;
        if (userId) baseQuery.recipient = userId;
      }
    } else if (scope === 'delegated') {
      // Courriers délégués uniquement
      const delegators = await Delegation.getDelegatorsForUser(req.user._id);
      const delegatorIds = delegators.map(d => d._id);
      
      if (delegatorIds.length > 0) {
        // Courriers des délégants, en excluant ceux où je suis déjà destinataire
        baseQuery.$and = [
          {
            $or: [
              { recipient: { $in: delegatorIds } },
              { recipientsCopy: { $in: delegatorIds } }
            ]
          },
          { recipient: { $nin: [req.user._id] } },
          {
            $or: [
              { recipientsCopy: { $exists: false } },
              { recipientsCopy: { $size: 0 } },
              { recipientsCopy: { $nin: [req.user._id] } }
            ]
          }
        ];
      } else {
        // Pas de délégation, retourner aucun résultat
        baseQuery._id = null;
      }
    } else {
      // Mes courriers uniquement
      baseQuery.$or = [
        { recipient: req.user._id },
        { recipientsCopy: req.user._id }
      ];
    }

    if (Object.keys(dateFilter).length > 0) {
      baseQuery.receivedDate = dateFilter;
    }

    // Statistiques de base
    const [pending, processed, archived] = await Promise.all([
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.PENDING }),
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.PROCESSED }),
      Mail.countDocuments({ ...baseQuery, status: MAIL_STATUS.ARCHIVED })
    ]);

    // Temps de traitement
    const processedMails = await Mail.find({
      ...baseQuery,
      status: { $in: [MAIL_STATUS.PROCESSED, MAIL_STATUS.ARCHIVED] },
      processedDate: { $exists: true }
    }).select('receivedDate processedDate processedBy');

    let avgProcessingTime = 0;
    let minProcessingTime = 0;
    let maxProcessingTime = 0;
    
    if (processedMails.length > 0) {
      const times = processedMails.map(mail => {
        const diff = (mail.processedDate - mail.receivedDate) / (1000 * 60 * 60); // en heures
        return diff;
      });
      avgProcessingTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length * 10) / 10;
      minProcessingTime = Math.round(Math.min(...times) * 10) / 10;
      maxProcessingTime = Math.round(Math.max(...times) * 10) / 10;
    }

    // Statistiques par utilisateur (qui a traité quoi)
    const userStats = await Mail.aggregate([
      { $match: { ...baseQuery, processedBy: { $exists: true } } },
      {
        $group: {
          _id: '$processedBy',
          processed: { $sum: 1 },
          avgTime: {
            $avg: {
              $divide: [
                { $subtract: ['$processedDate', '$receivedDate'] },
                1000 * 60 * 60 // en heures
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          processed: 1,
          avgTime: { $round: ['$avgTime', 1] }
        }
      },
      { $sort: { processed: -1 } }
    ]);

    // Statistiques par service
    let serviceStats = [];
    const showServiceStats = (scope === 'all' && userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS))
      || (scope === 'service' && userServiceIds.length > 1 && !serviceId);
    if (showServiceStats) {
      const matchQuery = {};
      if (scope === 'service') {
        matchQuery.service = { $in: userServiceIds };
      }
      if (Object.keys(dateFilter).length > 0) {
        matchQuery.receivedDate = dateFilter;
      }

      serviceStats = await Mail.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$service',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PENDING] }, 1, 0] } },
            processed: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PROCESSED] }, 1, 0] } },
            archived: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.ARCHIVED] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'services',
            localField: '_id',
            foreignField: '_id',
            as: 'service'
          }
        },
        { $unwind: '$service' },
        {
          $project: {
            _id: 1,
            name: '$service.name',
            code: '$service.code',
            color: '$service.color',
            total: 1,
            pending: 1,
            processed: 1,
            archived: 1
          }
        },
        { $sort: { total: -1 } }
      ]);
    }

    // Évolution mensuelle
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const monthlyQuery = { ...baseQuery };
    if (!monthlyQuery.receivedDate) {
      monthlyQuery.receivedDate = { $gte: startOfYear };
    }
    
    const monthlyStats = await Mail.aggregate([
      { $match: monthlyQuery },
      {
        $group: {
          _id: {
            year: { $year: '$receivedDate' },
            month: { $month: '$receivedDate' }
          },
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PENDING] }, 1, 0] } },
          processed: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.PROCESSED] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', MAIL_STATUS.ARCHIVED] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Statistiques par priorité
    const priorityStats = await Mail.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Statistiques par expéditeur (top 10)
    const senderStats = await Mail.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'contacts',
          localField: '_id',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $project: {
          _id: 1,
          name: '$sender.name',
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Statistiques d'import par source (manuel vs IMAP) - évolution mensuelle
    const importStatsQuery = { ...baseQuery };
    if (!importStatsQuery.importedDate && !importStatsQuery.receivedDate) {
      importStatsQuery.importedDate = { $gte: startOfYear };
    }
    
    const importStats = await Mail.aggregate([
      { $match: importStatsQuery },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ['$importedDate', '$receivedDate'] } },
            month: { $month: { $ifNull: ['$importedDate', '$receivedDate'] } },
            source: { $ifNull: ['$source', 'manual'] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Réorganiser les stats d'import par mois
    const importByMonth = {};
    importStats.forEach(stat => {
      const key = `${stat._id.year}-${stat._id.month}`;
      if (!importByMonth[key]) {
        importByMonth[key] = { year: stat._id.year, month: stat._id.month, manual: 0, imap: 0 };
      }
      importByMonth[key][stat._id.source] = stat.count;
    });
    const importStatsByMonth = Object.values(importByMonth).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Totaux d'import
    const importTotals = await Mail.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: { $ifNull: ['$source', 'manual'] },
          count: { $sum: 1 }
        }
      }
    ]);
    const importSummary = { manual: 0, imap: 0 };
    importTotals.forEach(stat => {
      importSummary[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        summary: {
          pending,
          processed,
          archived,
          total: pending + processed + archived
        },
        processing: {
          avgTime: avgProcessingTime,
          minTime: minProcessingTime,
          maxTime: maxProcessingTime,
          unit: 'heures'
        },
        userStats,
        serviceStats,
        monthlyStats,
        priorityStats,
        senderStats,
        importStats: importStatsByMonth,
        importSummary,
        scope,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          serviceId: serviceId || null,
          userId: userId || null
        }
      }
    });
  } catch (error) {
    console.error('Erreur statistiques détaillées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats/my-performance - Mes performances personnelles
router.get('/my-performance', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // Mes courriers où je suis destinataire
    const myQuery = {
      $or: [
        { recipient: req.user._id },
        { recipientsCopy: req.user._id }
      ]
    };
    if (Object.keys(dateFilter).length > 0) {
      myQuery.receivedDate = dateFilter;
    }

    // Mes statistiques
    const [pending, processed, archived] = await Promise.all([
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PENDING }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.PROCESSED }),
      Mail.countDocuments({ ...myQuery, status: MAIL_STATUS.ARCHIVED })
    ]);

    // Courriers que j'ai traités (processedBy = moi)
    const processedByMeQuery = { processedBy: req.user._id };
    if (Object.keys(dateFilter).length > 0) {
      processedByMeQuery.processedDate = dateFilter;
    }
    
    const processedByMe = await Mail.find(processedByMeQuery)
      .select('receivedDate processedDate');

    let myAvgTime = 0;
    if (processedByMe.length > 0) {
      const times = processedByMe.map(mail => {
        return (mail.processedDate - mail.receivedDate) / (1000 * 60 * 60); // heures
      });
      myAvgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length * 10) / 10;
    }

    // Évolution de mes traitements par mois
    const myMonthlyProcessed = await Mail.aggregate([
      { $match: { processedBy: req.user._id, ...processedByMeQuery } },
      {
        $group: {
          _id: {
            year: { $year: '$processedDate' },
            month: { $month: '$processedDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          pending,
          processed,
          archived,
          total: pending + processed + archived
        },
        performance: {
          processedByMe: processedByMe.length,
          avgProcessingTime: myAvgTime,
          unit: 'heures'
        },
        monthlyProcessed: myMonthlyProcessed
      }
    });
  } catch (error) {
    console.error('Erreur performances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
