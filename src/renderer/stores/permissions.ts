import { useAuthStore } from './authStore';

export interface UserPermissions {
  administrator: boolean;
  manage_server: boolean;
  manage_channels: boolean;
  manage_roles: boolean;
  kick_members: boolean;
  ban_members: boolean;
  timeout_members: boolean;
  moderate_members: boolean;
  create_invites: boolean;
  change_nickname: boolean;
  manage_nicknames: boolean;
  view_audit_log: boolean;
  view_channel: boolean;
  send_messages: boolean;
  embed_links: boolean;
  attach_files: boolean;
  add_reactions: boolean;
  mention_everyone: boolean;
  manage_messages: boolean;
  read_message_history: boolean;
  connect: boolean;
  speak: boolean;
  video: boolean;
  stream: boolean;
  mute_members: boolean;
  deafen_members: boolean;
  move_members: boolean;
  disconnect_members: boolean;
  priority_speaker: boolean;
  use_voice_activity: boolean;
  create_events: boolean;
  manage_events: boolean;
}

function getPermissions(): UserPermissions | null {
  const user = useAuthStore.getState().user;
  return user?.permissions ?? null;
}

export function hasPermission(permission: keyof UserPermissions): boolean {
  const perms = getPermissions();
  if (!perms) return false;
  return perms[permission] === true;
}

export function isAdmin(): boolean {
  return hasPermission('administrator');
}

export function isOwner(serverOwnerId: string | null | undefined): boolean {
  const user = useAuthStore.getState().user;
  if (!user || !serverOwnerId) return false;
  return user.id === serverOwnerId;
}

export function hasAdminAccess(serverOwnerId: string | null | undefined): boolean {
  return isAdmin() || isOwner(serverOwnerId);
}

export function canManageServer(serverOwnerId: string | null | undefined): boolean {
  return hasAdminAccess(serverOwnerId) || hasPermission('manage_server');
}

export function canManageChannels(): boolean {
  return isAdmin() || hasPermission('manage_channels');
}

export function canManageRoles(): boolean {
  return isAdmin() || hasPermission('manage_roles');
}

export function canKickMembers(): boolean {
  return isAdmin() || hasPermission('kick_members');
}

export function canBanMembers(): boolean {
  return isAdmin() || hasPermission('ban_members');
}

export function canViewAuditLog(): boolean {
  return isAdmin() || hasPermission('view_audit_log');
}

export function canCreateInvites(): boolean {
  return isAdmin() || hasPermission('create_invites');
}

export function canManageMessages(): boolean {
  return isAdmin() || hasPermission('manage_messages');
}

export function canManageNicknames(): boolean {
  return isAdmin() || hasPermission('manage_nicknames');
}

export function canSendMessages(): boolean {
  return hasPermission('send_messages');
}

export function canAttachFiles(): boolean {
  return hasPermission('attach_files');
}

export function canAddReactions(): boolean {
  return hasPermission('add_reactions');
}

export function hasAnyPermission(permissions: (keyof UserPermissions)[]): boolean {
  return permissions.some((p) => hasPermission(p));
}

export function hasAllPermissions(permissions: (keyof UserPermissions)[]): boolean {
  return permissions.every((p) => hasPermission(p));
}

export function canCreateEvents(): boolean {
  return isAdmin() || hasPermission('create_events') || hasPermission('manage_events') || hasPermission('manage_server');
}

export function canManageEvents(): boolean {
  return isAdmin() || hasPermission('manage_events') || hasPermission('manage_server');
}

/**
 * Can the current user edit a specific event?
 * Allowed if: manage_events / admin OR (creator + create_events).
 */
export function canEditEvent(creatorId: string): boolean {
  if (canManageEvents()) return true;
  const user = useAuthStore.getState().user;
  if (!user) return false;
  return user.id === creatorId && canCreateEvents();
}
