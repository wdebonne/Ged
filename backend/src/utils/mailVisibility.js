import { Delegation, PERMISSIONS } from '../models/index.js';

export function isServiceSupervisor(user) {
  if (!user?.services?.length) return false;
  const userId = user._id.toString();
  return user.services.some(service => {
    const ids = (service.supervisors || []).map(s => s?._id?.toString() || s?.toString());
    return ids.includes(userId);
  });
}

// Reproduit la branche par défaut (sans `scope`) de GET /api/mails
export async function buildMailVisibilityQuery(user) {
  const userPermissions = user.group.permissions;
  const userServiceIds = user.services.map(s => s._id);

  if (userPermissions.includes(PERMISSIONS.VIEW_ALL_MAILS)) {
    return {};
  }

  const canViewServiceMails = userPermissions.includes(PERMISSIONS.VIEW_SERVICE_MAILS) || isServiceSupervisor(user);

  const orConditions = canViewServiceMails && userServiceIds.length > 0
    ? [{ recipient: user._id }, { recipientsCopy: user._id }, { service: { $in: userServiceIds } }]
    : [{ recipient: user._id }, { recipientsCopy: user._id }];

  const delegators = await Delegation.getDelegatorsForUser(user._id);
  const delegatorIds = delegators.map(d => d._id);
  if (delegatorIds.length > 0) {
    orConditions.push({ recipient: { $in: delegatorIds } });
    orConditions.push({ recipientsCopy: { $in: delegatorIds } });
  }

  return { $or: orConditions };
}

// Reproduit la branche par défaut (sans `scope`) de GET /api/outgoing-mails
export function buildOutgoingMailVisibilityQuery(user) {
  const userPermissions = user.group.permissions;
  const userServiceIds = user.services.map(s => s._id);

  if (userPermissions.includes(PERMISSIONS.VIEW_ALL_OUTGOING)) {
    return {};
  }
  if (userPermissions.includes(PERMISSIONS.VIEW_SERVICE_OUTGOING) && userServiceIds.length > 0) {
    return { $or: [{ sender: user._id }, { service: { $in: userServiceIds } }] };
  }
  return { sender: user._id };
}
