import { AuditLog } from '../models/index.js';

/**
 * Enregistre une entrée dans le journal d'audit.
 * N'échoue jamais bruyamment : une erreur de journalisation ne doit pas casser
 * l'opération métier qui l'a déclenchée.
 *
 * @param {Object} params
 * @param {Object} [params.req] - requête Express en cours (fournit user/ip/user-agent)
 * @param {string} params.action - identifiant précis de l'action (ex: 'mail.trashed')
 * @param {string} params.category - 'deletion' | 'permission' | 'settings' | 'export'
 * @param {string} [params.entityType] - ex: 'Mail', 'User', 'Settings'
 * @param {string|import('mongoose').Types.ObjectId} [params.entityId]
 * @param {string} [params.entityLabel] - libellé lisible, survit à une suppression définitive
 * @param {Object} [params.changes] - détail avant/après
 * @param {Object} [params.metadata] - contexte additionnel libre
 * @param {boolean} [params.isSystemAction] - action déclenchée par une tâche planifiée
 */
export const logAudit = async ({
  req,
  action,
  category,
  entityType,
  entityId,
  entityLabel,
  changes,
  metadata,
  isSystemAction = false
}) => {
  try {
    const user = req?.user;
    await AuditLog.create({
      action,
      category,
      entityType,
      entityId,
      entityLabel,
      performedBy: user?._id || null,
      performedByLabel: user ? `${user.firstName} ${user.lastName}` : 'Système',
      isSystemAction,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      changes,
      metadata
    });
  } catch (error) {
    console.error('Erreur journal d\'audit:', error.message);
  }
};
