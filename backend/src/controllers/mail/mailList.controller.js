import { Mail, PERMISSIONS, Delegation } from '../../models/index.js';
import { escapeRegex } from '../../utils/regex.js';
import { buildSearchOr } from '../../utils/mailSearch.js';
import { isServiceSupervisor, canViewMail } from './mail.helpers.js';

// GET /api/mails - Liste des courriers
export async function listMails(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      priority = '',
      tag = '',
      overdue = '',
      search = '',
      sender = '',
      service = '',
      recipient = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'receivedDate',
      sortOrder = 'desc',
      scope = '', // 'mine' = mes courriers, 'service' = courriers service(s), 'delegated' = courriers délégués
      includeDelegated = 'true' // Inclure les courriers délégués dans 'mine'
    } = req.query;

    const query = {};
    const userPermissions = req.user.group.permissions;
    const userServiceIds = req.user.services.map(s => s._id);

    // Récupérer les délégations actives reçues par l'utilisateur
    let delegatorIds = [];
    if (includeDelegated === 'true' || scope === 'delegated' || scope === 'mine') {
      const delegators = await Delegation.getDelegatorsForUser(req.user._id);
      delegatorIds = delegators.map(d => d._id);
    }

    // Filtrer selon le scope demandé
    if (scope === 'mine') {
      // Mes courriers uniquement (où je suis destinataire) - SANS courriers délégués
      // Exclure les courriers où je suis en copie mais le destinataire principal est un délégant
      if (delegatorIds.length > 0) {
        query.$or = [
          { recipient: req.user._id },  // Je suis destinataire principal
          {
            recipientsCopy: req.user._id,  // Je suis en copie
            recipient: { $nin: delegatorIds }  // ET le destinataire principal n'est PAS un délégant
          }
        ];
      } else {
        query.$or = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ];
      }
    } else if (scope === 'delegated') {
      // Uniquement les courriers délégués (ceux des utilisateurs qui m'ont délégué)
      if (delegatorIds.length > 0) {
        // Courriers des délégants, en excluant ceux où je suis déjà destinataire
        query.$and = [
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
        query._id = null;
      }
    } else if (scope === 'service') {
      // Courriers de mes services uniquement (exclure ceux où je suis destinataire pour éviter doublons)
      // Vérifier que l'utilisateur a la permission OU est superviseur
      const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);

      if (userServiceIds.length > 0 && canViewServiceMails) {
        query.service = { $in: userServiceIds };
        query.recipient = { $ne: req.user._id };
        query.$and = [
          { $or: [{ recipientsCopy: { $exists: false } }, { recipientsCopy: { $ne: req.user._id } }] }
        ];
      } else {
        // Pas de service ou pas de permission, retourner aucun résultat
        query._id = null;
      }
    } else {
      // Comportement par défaut selon les permissions (pour admin et autres cas)
      const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(req.user);

      if (userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
        // Peut voir tous les courriers
      } else if (canViewServiceMails && userServiceIds.length > 0) {
        // Peut voir les courriers de ses services + ses propres courriers + courriers délégués
        const orConditions = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id },
          { service: { $in: userServiceIds } }
        ];

        // Ajouter les courriers délégués
        if (includeDelegated === 'true' && delegatorIds.length > 0) {
          orConditions.push({ recipient: { $in: delegatorIds } });
          orConditions.push({ recipientsCopy: { $in: delegatorIds } });
        }

        query.$or = orConditions;
      } else {
        // Peut voir uniquement ses courriers (utilisateur sans service) + courriers délégués
        const orConditions = [
          { recipient: req.user._id },
          { recipientsCopy: req.user._id }
        ];

        // Ajouter les courriers délégués
        if (includeDelegated === 'true' && delegatorIds.length > 0) {
          orConditions.push({ recipient: { $in: delegatorIds } });
          orConditions.push({ recipientsCopy: { $in: delegatorIds } });
        }

        query.$or = orConditions;
      }
    }

    // Filtrer par statut
    if (status) {
      query.status = status;
    }

    // Filtrer par priorité (une valeur ou liste séparée par des virgules)
    if (priority) {
      const priorities = priority.split(',').map(p => p.trim()).filter(Boolean);
      if (priorities.length > 1) {
        query.priority = { $in: priorities };
      } else if (priority === 'high') {
        // Rétrocompatibilité : 'high' inclut 'high' et 'urgent'
        query.priority = { $in: ['high', 'urgent'] };
      } else {
        query.priority = priorities[0];
      }
    }

    // Filtrer par tag (insensible à la casse)
    if (tag) {
      query.tags = { $regex: `^${escapeRegex(tag)}$`, $options: 'i' };
    }

    // Filtrer les courriers dont l'échéance est dépassée
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
    }

    // Recherche textuelle : champs courts en $regex, contenu OCR via l'index $text
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: await buildSearchOr(Mail, search, [
          'subject', 'senderName', 'fileName', 'reference', 'chronoNumber'
        ])
      });
    }

    // Filtrer par expéditeur
    if (sender) {
      query.sender = sender;
    }

    // Filtrer par service
    if (service) {
      query.service = service;
    }

    // Filtrer par destinataire
    if (recipient) {
      if (!query.$or) {
        query.recipient = recipient;
      }
    }

    // Filtrer par plage de dates
    if (dateFrom || dateTo) {
      query.receivedDate = {};
      if (dateFrom) {
        query.receivedDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.receivedDate.$lte = endDate;
      }
    }

    // Tri
    const sort = {};
    sort[sortBy || 'receivedDate'] = sortOrder === 'asc' ? 1 : -1;

    const total = await Mail.countDocuments(query);
    const mails = await Mail.find(query)
      .select('-comments')
      .populate('sender', 'name organization')
      .populate('service', 'name code color')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('recipientsCopy', 'firstName lastName email')
      .populate('importedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        mails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur liste courriers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}

// GET /api/mails/:id - Détails d'un courrier
export async function getMailById(req, res) {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate('sender', 'name organization email phone address')
      .populate('service', 'name code color')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('recipientsCopy', 'firstName lastName email avatar')
      .populate('importedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .populate('archivedBy', 'firstName lastName')
      .populate('readLogs.user', 'firstName lastName')
      .populate('responses.respondedBy', 'firstName lastName')
      .populate('comments.author', 'firstName lastName avatar')
      .populate('comments.mentions', 'firstName lastName');

    if (!mail) {
      return res.status(404).json({
        success: false,
        message: 'Courrier non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    const canView = await canViewMail(mail, req.user);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      data: mail
    });
  } catch (error) {
    console.error('Erreur détails courrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
}
