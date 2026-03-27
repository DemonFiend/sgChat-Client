import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';
import {
  hasPermission,
  hasAdminAccess,
  isAdmin,
} from '../../stores/permissions';
import { blockedUsersStore } from '../../stores/blockedUsersStore';
import { ignoredUsersStore } from '../../stores/ignoredUsersStore';
import { chatInputStore } from '../../stores/chatInputStore';
import { setUserVolume, getUserVolume, toggleLocalMute, isLocallyMuted as checkLocallyMuted } from '../../lib/voiceService';

// ── Types ──────────────────────────────────────────────────────────────

type FriendStatus = 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming' | 'loading';

export interface UserContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  targetUser: { id: string; username: string; display_name?: string | null };
  currentUserId: string;
  serverId: string;
  serverOwnerId?: string;
  voiceContext?: {
    channelId: string;
    isMuted: boolean;
    isDeafened: boolean;
  };
  voiceChannels?: { id: string; name: string }[];
  currentUserInVoice?: boolean;
  onOpenProfile?: () => void;
  onSendMessage?: () => void;
  onMention?: () => void;
  onChangeNickname?: (isSelf: boolean) => void;
  onTimeout?: () => void;
  targetUserRoles?: { id: string; name: string; color: string | null }[];
  allServerRoles?: { id: string; name: string; color: string | null; position: number }[];
  onUpdateMemberRoles?: (
    userId: string,
    roles: { id: string; name: string; color: string | null }[],
  ) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function UserContextMenu({
  isOpen,
  onClose,
  position,
  targetUser,
  currentUserId,
  serverId,
  serverOwnerId,
  voiceContext,
  voiceChannels,
  currentUserInVoice,
  onOpenProfile,
  onSendMessage,
  onMention,
  onChangeNickname,
  onTimeout,
  targetUserRoles,
  allServerRoles,
  onUpdateMemberRoles,
}: UserContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('loading');
  const [volume, setVolume] = useState(() => getUserVolume(targetUser.id));
  const [isLocallyMuted, setIsLocallyMuted] = useState(() => checkLocallyMuted(targetUser.id));
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'kick' | 'ban' | 'warn' | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [optimisticRoles, setOptimisticRoles] = useState(targetUserRoles);
  const [isBlockedState, setIsBlockedState] = useState(false);
  const [isIgnoredState, setIsIgnoredState] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const moveItemRef = useRef<HTMLButtonElement>(null);

  const isCurrentUser = targetUser.id === currentUserId;
  const displayName = targetUser.display_name || targetUser.username;

  // Permissions
  const showVoiceControls = !!voiceContext && !!currentUserInVoice && !isCurrentUser;
  const showVoiceMod = !!voiceContext && !isCurrentUser;
  const showServerMod = !isCurrentUser;
  const pCanMute = hasPermission('mute_members') || hasAdminAccess(serverOwnerId);
  const pCanDeafen = hasPermission('deafen_members') || hasAdminAccess(serverOwnerId);
  const pCanMove = hasPermission('move_members') || hasAdminAccess(serverOwnerId);
  const pCanDisconnect = hasPermission('disconnect_members') || hasAdminAccess(serverOwnerId);
  const pCanKick = hasPermission('kick_members') || hasAdminAccess(serverOwnerId);
  const pCanBan = hasPermission('ban_members') || hasAdminAccess(serverOwnerId);
  const pCanTimeout = hasPermission('timeout_members') || hasAdminAccess(serverOwnerId);
  const pCanWarn = hasPermission('moderate_members') || hasAdminAccess(serverOwnerId);
  const pCanManageRoles = hasPermission('manage_roles') || isAdmin();
  const pCanManageNicknames = hasPermission('manage_nicknames') || hasAdminAccess(serverOwnerId);
  const pCanChangeNickname = hasPermission('change_nickname') || hasAdminAccess(serverOwnerId);

  const hasVoiceModItems = showVoiceMod && (pCanMute || pCanDeafen || pCanMove || pCanDisconnect);
  const hasServerModItems = showServerMod && (pCanTimeout || pCanKick || pCanBan || pCanWarn);

  // ── Fetch friend status on mount ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || isCurrentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const friends = await api.get<any[]>('/api/friends/');
        if (cancelled) return;
        if (friends?.some((f: any) => f.id === targetUser.id || f.friend_id === targetUser.id)) {
          setFriendStatus('friends');
          return;
        }
        const requests = await api.get<{ incoming: any[]; outgoing: any[] }>('/api/friends/requests');
        if (cancelled) return;
        if (
          requests?.outgoing?.some(
            (r: any) => r.to_user_id === targetUser.id || r.to_user?.id === targetUser.id,
          )
        ) {
          setFriendStatus('pending_outgoing');
        } else if (
          requests?.incoming?.some(
            (r: any) => r.from_user_id === targetUser.id || r.from_user?.id === targetUser.id,
          )
        ) {
          setFriendStatus('pending_incoming');
        } else {
          setFriendStatus('none');
        }
      } catch {
        if (!cancelled) setFriendStatus('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, targetUser.id, isCurrentUser]);

  // Reset state when target changes
  useEffect(() => {
    if (isOpen) {
      const vol = getUserVolume(targetUser.id);
      setVolume(vol);
      setIsLocallyMuted(checkLocallyMuted(targetUser.id));
      setShowMoveSubmenu(false);
      setConfirmAction(null);
      setConfirmReason('');
      setActionLoading(false);
    }
  }, [isOpen, targetUser.id]);

  // Sync optimistic roles with prop changes
  useEffect(() => {
    setOptimisticRoles(targetUserRoles);
  }, [targetUserRoles]);

  const effectiveRoles = optimisticRoles ?? targetUserRoles;

  // Load block/ignore state
  useEffect(() => {
    if (isOpen && !isCurrentUser) {
      setIsBlockedState(blockedUsersStore.isBlocked(targetUser.id));
      setIsIgnoredState(ignoredUsersStore.isIgnored(targetUser.id));
      setConfirmBlock(false);
      setShowRoleDropdown(false);
      setRoleLoading(null);
    }
  }, [isOpen, targetUser.id, isCurrentUser]);

  // ── Close handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmAction) {
          setConfirmAction(null);
          setConfirmReason('');
        } else if (confirmBlock) {
          setConfirmBlock(false);
        } else if (showMoveSubmenu) {
          setShowMoveSubmenu(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      cancelAnimationFrame(raf);
    };
  }, [isOpen, onClose, confirmAction, confirmBlock, showMoveSubmenu]);

  // ── Position calculation ───────────────────────────────────────────
  const adjustedPosition = useMemo(() => {
    const menuWidth = 220;
    const estimatedHeight = 600;
    const x = Math.min(position.x, window.innerWidth - menuWidth - 8);
    const y = Math.min(position.y, window.innerHeight - estimatedHeight - 8);
    return { x: Math.max(8, x), y: Math.max(8, y) };
  }, [position]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleCopyUsername = useCallback(() => {
    navigator.clipboard
      .writeText(`@${targetUser.username}`)
      .then(() => {
        toastStore.addToast({
          type: 'system',
          title: 'Copied!',
          message: `@${targetUser.username} copied to clipboard`,
        });
      })
      .catch(() => {});
    onClose();
  }, [targetUser.username, onClose]);

  const handleFriendAction = useCallback(async () => {
    if (friendStatus === 'none') {
      try {
        await api.post(`/api/friends/${targetUser.id}`, {});
        setFriendStatus('pending_outgoing');
        toastStore.addToast({
          type: 'system',
          title: 'Friend Request Sent',
          message: `Sent a friend request to ${displayName}`,
        });
      } catch {
        toastStore.addToast({
          type: 'warning',
          title: 'Failed',
          message: 'Could not send friend request',
        });
      }
    } else if (friendStatus === 'pending_incoming') {
      try {
        await api.post(`/api/friends/requests/${targetUser.id}/accept`, {});
        setFriendStatus('friends');
        toastStore.addToast({
          type: 'system',
          title: 'Friend Added',
          message: `You are now friends with ${displayName}`,
        });
      } catch {
        toastStore.addToast({
          type: 'warning',
          title: 'Failed',
          message: 'Could not accept friend request',
        });
      }
    }
  }, [friendStatus, targetUser.id, displayName]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolume(value);
      setUserVolume(targetUser.id, value);
      setIsLocallyMuted(checkLocallyMuted(targetUser.id));
    },
    [targetUser.id],
  );

  const handleLocalMute = useCallback(() => {
    const nowMuted = toggleLocalMute(targetUser.id);
    setIsLocallyMuted(nowMuted);
  }, [targetUser.id]);

  const handleServerMute = useCallback(async () => {
    if (!voiceContext) return;
    try {
      await api.post('/api/voice/server-mute', {
        user_id: targetUser.id,
        channel_id: voiceContext.channelId,
        muted: !voiceContext.isMuted,
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: 'Could not server mute member',
      });
    }
    onClose();
  }, [targetUser.id, voiceContext, onClose]);

  const handleServerDeafen = useCallback(async () => {
    if (!voiceContext) return;
    try {
      await api.post('/api/voice/server-deafen', {
        user_id: targetUser.id,
        channel_id: voiceContext.channelId,
        deafened: !voiceContext.isDeafened,
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: 'Could not server deafen member',
      });
    }
    onClose();
  }, [targetUser.id, voiceContext, onClose]);

  const handleMoveToChannel = useCallback(
    async (toChannelId: string) => {
      if (!voiceContext) return;
      try {
        await api.post('/api/voice/move-member', {
          user_id: targetUser.id,
          from_channel_id: voiceContext.channelId,
          to_channel_id: toChannelId,
        });
      } catch {
        toastStore.addToast({
          type: 'warning',
          title: 'Failed',
          message: 'Could not move member',
        });
      }
      onClose();
    },
    [targetUser.id, voiceContext, onClose],
  );

  const handleDisconnect = useCallback(async () => {
    if (!voiceContext) return;
    try {
      await api.post('/api/voice/disconnect-member', {
        user_id: targetUser.id,
        channel_id: voiceContext.channelId,
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: 'Could not disconnect member',
      });
    }
    onClose();
  }, [targetUser.id, voiceContext, onClose]);

  const handleWarn = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${targetUser.id}/warn`, {
        ...(confirmReason.trim() && { reason: confirmReason.trim() }),
      });
      toastStore.addToast({
        type: 'system',
        title: 'User Warned',
        message: `${displayName} has been warned`,
      });
      onClose();
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Warn Failed',
        message: `Could not warn ${displayName}`,
      });
      setActionLoading(false);
    }
  }, [serverId, targetUser.id, confirmReason, displayName, onClose]);

  const handleModAction = useCallback(
    async (action: 'kick' | 'ban' | 'warn') => {
      if (action === 'warn') {
        return handleWarn();
      }
      setActionLoading(true);
      try {
        await api.post(`/api/servers/${serverId}/members/${targetUser.id}/${action}`, {
          ...(confirmReason.trim() && { reason: confirmReason.trim() }),
        });
        toastStore.addToast({
          type: 'system',
          title: action === 'kick' ? 'User Kicked' : 'User Banned',
          message: `${displayName} has been ${action === 'kick' ? 'kicked' : 'banned'}`,
        });
        onClose();
      } catch {
        toastStore.addToast({
          type: 'warning',
          title: `${action === 'kick' ? 'Kick' : 'Ban'} Failed`,
          message: `Could not ${action} ${displayName}`,
        });
        setActionLoading(false);
      }
    },
    [serverId, targetUser.id, confirmReason, onClose, handleWarn, displayName],
  );

  const handleMention = useCallback(() => {
    if (onMention) {
      onMention();
    } else {
      chatInputStore.insertMention(targetUser.id, targetUser.username);
    }
    onClose();
  }, [targetUser.id, targetUser.username, onClose, onMention]);

  const handleToggleIgnore = useCallback(async () => {
    try {
      if (isIgnoredState) {
        await ignoredUsersStore.unignoreUser(targetUser.id);
        setIsIgnoredState(false);
        toastStore.addToast({
          type: 'system',
          title: 'User Unignored',
          message: `${displayName} is no longer ignored`,
        });
      } else {
        await ignoredUsersStore.ignoreUser(targetUser.id);
        setIsIgnoredState(true);
        toastStore.addToast({
          type: 'system',
          title: 'User Ignored',
          message: `${displayName}'s messages will be hidden`,
        });
      }
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: `Could not ${isIgnoredState ? 'unignore' : 'ignore'} ${displayName}`,
      });
    }
    onClose();
  }, [targetUser.id, displayName, isIgnoredState, onClose]);

  const handleToggleBlock = useCallback(async () => {
    try {
      if (isBlockedState) {
        await blockedUsersStore.unblockUser(targetUser.id);
        setIsBlockedState(false);
        toastStore.addToast({
          type: 'system',
          title: 'User Unblocked',
          message: `${displayName} has been unblocked`,
        });
      } else {
        await blockedUsersStore.blockUser(targetUser.id);
        setIsBlockedState(true);
        toastStore.addToast({
          type: 'system',
          title: 'User Blocked',
          message: `${displayName} has been blocked`,
        });
      }
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: `Could not ${isBlockedState ? 'unblock' : 'block'} ${displayName}`,
      });
    }
    onClose();
  }, [targetUser.id, displayName, isBlockedState, onClose]);

  const handleAddRole = useCallback(
    async (roleId: string) => {
      setRoleLoading(roleId);
      const role = (allServerRoles || []).find((r) => r.id === roleId);
      const prevRoles = optimisticRoles ?? targetUserRoles ?? [];
      if (role) {
        const newRoles = [...prevRoles, { id: role.id, name: role.name, color: role.color }];
        setOptimisticRoles(newRoles);
        onUpdateMemberRoles?.(targetUser.id, newRoles);
      }

      try {
        await api.post(`/api/servers/${serverId}/members/${targetUser.id}/roles/${roleId}`, {});
      } catch (err) {
        setOptimisticRoles(prevRoles);
        onUpdateMemberRoles?.(targetUser.id, prevRoles);
        toastStore.addToast({
          type: 'warning',
          title: 'Failed',
          message: 'Could not add role',
        });
        console.error('[roles] Failed to add role:', err);
      }
      setRoleLoading(null);
    },
    [serverId, targetUser.id, allServerRoles, optimisticRoles, targetUserRoles, onUpdateMemberRoles],
  );

  const handleRemoveRole = useCallback(
    async (roleId: string) => {
      setRoleLoading(roleId);
      const prevRoles = optimisticRoles ?? targetUserRoles ?? [];
      const newRoles = prevRoles.filter((r) => r.id !== roleId);
      setOptimisticRoles(newRoles);
      onUpdateMemberRoles?.(targetUser.id, newRoles);

      try {
        await api.delete(`/api/servers/${serverId}/members/${targetUser.id}/roles/${roleId}`);
      } catch (err) {
        setOptimisticRoles(prevRoles);
        onUpdateMemberRoles?.(targetUser.id, prevRoles);
        toastStore.addToast({
          type: 'warning',
          title: 'Failed',
          message: 'Could not remove role',
        });
        console.error('[roles] Failed to remove role:', err);
      }
      setRoleLoading(null);
    },
    [serverId, targetUser.id, optimisticRoles, targetUserRoles, onUpdateMemberRoles],
  );

  if (!isOpen) return null;

  // ── Move submenu position ──────────────────────────────────────────
  const moveSubmenuStyle = (() => {
    if (!moveItemRef.current) return { top: 0, left: 220 };
    const rect = moveItemRef.current.getBoundingClientRect();
    const subWidth = 180;
    const goRight = rect.right + subWidth + 8 < window.innerWidth;
    return {
      top: rect.top,
      left: goRight ? rect.right + 4 : rect.left - subWidth - 4,
    };
  })();

  // ── Render ─────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        style={{
          position: 'fixed',
          zIndex: 1000,
          minWidth: 220,
          maxWidth: 240,
          padding: '6px 0',
          background: 'var(--bg-tertiary, #1e1f22)',
          borderRadius: 6,
          boxShadow: '0 8px 16px rgba(0,0,0,0.24)',
          border: '1px solid var(--border, #2b2d31)',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 16px)',
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        {/* ── Confirmation overlay (kick/ban/warn) ─────────────────── */}
        {confirmAction && (
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 8px' }}>
              {confirmAction === 'kick' ? 'Kick' : confirmAction === 'ban' ? 'Ban' : 'Warn'}{' '}
              {displayName}?
            </p>
            <input
              type="text"
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              placeholder="Reason (optional)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleModAction(confirmAction);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                background: 'var(--bg-secondary, #2b2d31)',
                border: '1px solid var(--border, #3f4147)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                outline: 'none',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setConfirmReason('');
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, #35373c)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleModAction(confirmAction)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#fff',
                  background: confirmAction === 'warn' ? '#eab308' : 'var(--danger, #da373c)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.5 : 1,
                }}
              >
                {actionLoading
                  ? 'Processing...'
                  : confirmAction === 'kick'
                    ? 'Kick'
                    : confirmAction === 'ban'
                      ? 'Ban'
                      : 'Warn'}
              </button>
            </div>
          </div>
        )}

        {/* ── Block confirmation overlay ───────────────────────────── */}
        {confirmBlock && (
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 4px' }}>
              Block {displayName}?
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              They won&apos;t be able to send you direct messages. Their messages will be hidden.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmBlock(false)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, #35373c)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#fff',
                  background: 'var(--danger, #da373c)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Block
              </button>
            </div>
          </div>
        )}

        {/* ── Normal menu items ────────────────────────────────────── */}
        {!confirmAction && !confirmBlock && (
          <>
            {/* ─── Quick Actions ─────────────────────────────────────── */}
            {onOpenProfile && (
              <MenuItem
                label="Profile"
                icon={<ProfileIcon />}
                onClick={() => {
                  onOpenProfile();
                  onClose();
                }}
              />
            )}
            {onSendMessage && !isCurrentUser && (
              <MenuItem
                label="Message"
                icon={<MessageIcon />}
                onClick={() => {
                  onSendMessage();
                  onClose();
                }}
              />
            )}
            <MenuItem label="Mention" icon={<MentionIcon />} onClick={handleMention} />
            <MenuItem label="Copy Username" icon={<CopyIcon />} onClick={handleCopyUsername} />

            {/* ─── Friend Action ─────────────────────────────────────── */}
            {!isCurrentUser && (
              <FriendMenuItem status={friendStatus} onAction={handleFriendAction} />
            )}

            {/* ─── Identity ─────────────────────────────────────────── */}
            {((isCurrentUser && pCanChangeNickname) ||
              (!isCurrentUser && pCanManageNicknames)) && onChangeNickname ? (
              <>
                <Separator />
                <SectionLabel text="Identity" />
                {isCurrentUser && pCanChangeNickname && (
                  <MenuItem
                    label="Change Nickname"
                    icon={<EditIcon />}
                    onClick={() => {
                      onChangeNickname(true);
                      onClose();
                    }}
                  />
                )}
                {!isCurrentUser && pCanManageNicknames && (
                  <MenuItem
                    label="Set Nickname"
                    icon={<EditIcon />}
                    onClick={() => {
                      onChangeNickname(false);
                      onClose();
                    }}
                  />
                )}
              </>
            ) : null}

            {/* ─── Roles ────────────────────────────────────────────── */}
            {(effectiveRoles && effectiveRoles.length > 0) || pCanManageRoles ? (
              <>
                <Separator />
                <SectionLabel text="Roles" />
                <div style={{ padding: '4px 12px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(effectiveRoles || []).map((role) => (
                    <RolePill
                      key={role.id}
                      role={role}
                      canRemove={pCanManageRoles && !isCurrentUser}
                      loading={roleLoading === role.id}
                      onRemove={() => handleRemoveRole(role.id)}
                    />
                  ))}
                  {pCanManageRoles && !isCurrentUser && (
                    <button
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      title="Add role"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: 'var(--bg-hover, #35373c)',
                        color: 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      +
                    </button>
                  )}
                </div>
                {/* Role dropdown */}
                {showRoleDropdown && pCanManageRoles && (
                  <div style={{ padding: '0 12px 6px' }}>
                    <div style={{
                      maxHeight: 128,
                      overflowY: 'auto',
                      borderRadius: 4,
                      border: '1px solid var(--border, #3f4147)',
                      background: 'var(--bg-secondary, #2b2d31)',
                    }}>
                      {(allServerRoles || [])
                        .filter(
                          (r) =>
                            r.name !== '@everyone' &&
                            !(effectiveRoles || []).some((tr) => tr.id === r.id),
                        )
                        .map((role) => (
                          <button
                            key={role.id}
                            onClick={() => handleAddRole(role.id)}
                            disabled={roleLoading === role.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%',
                              padding: '4px 8px',
                              fontSize: 12,
                              textAlign: 'left',
                              color: 'var(--text-secondary)',
                              background: 'transparent',
                              border: 'none',
                              cursor: roleLoading === role.id ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, #35373c)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                flexShrink: 0,
                                backgroundColor: role.color || 'var(--text-muted)',
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {role.name}
                            </span>
                            {roleLoading === role.id && (
                              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>...</span>
                            )}
                          </button>
                        ))}
                      {(allServerRoles || []).filter(
                        (r) =>
                          r.name !== '@everyone' &&
                          !(effectiveRoles || []).some((tr) => tr.id === r.id),
                      ).length === 0 && (
                        <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                          No roles to assign
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* ─── Privacy ──────────────────────────────────────────── */}
            {!isCurrentUser && (
              <>
                <Separator />
                <SectionLabel text="Privacy" />
                <MenuItem
                  label={isIgnoredState ? 'Unignore' : 'Ignore'}
                  icon={isIgnoredState ? <EyeIcon /> : <EyeOffIcon />}
                  onClick={handleToggleIgnore}
                  active={isIgnoredState}
                />
                <MenuItem
                  label={isBlockedState ? 'Unblock' : 'Block'}
                  icon={<BlockIcon />}
                  onClick={() => {
                    if (isBlockedState) {
                      handleToggleBlock();
                    } else {
                      setConfirmBlock(true);
                    }
                  }}
                  danger={!isBlockedState}
                  active={isBlockedState}
                />
              </>
            )}

            {/* ─── Local Voice Controls ─────────────────────────────── */}
            {showVoiceControls && (
              <>
                <Separator />
                <div style={{ padding: '4px 12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}>
                    <VolumeIcon />
                    <span>User Volume</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      cursor: 'pointer',
                      accentColor: 'var(--accent, #5865f2)',
                    }}
                  />
                </div>
                <MenuItem
                  label={isLocallyMuted ? 'Unmute (Local)' : 'Mute (Local)'}
                  icon={isLocallyMuted ? <MicOffIcon /> : <MicIcon />}
                  onClick={handleLocalMute}
                  active={isLocallyMuted}
                />
              </>
            )}

            {/* ─── Voice Moderation ─────────────────────────────────── */}
            {hasVoiceModItems && (
              <>
                <Separator />
                {pCanMute && (
                  <MenuItem
                    label={voiceContext!.isMuted ? 'Server Unmute' : 'Server Mute'}
                    icon={voiceContext!.isMuted ? <MicIcon /> : <MicOffIcon />}
                    onClick={handleServerMute}
                    active={voiceContext!.isMuted}
                  />
                )}
                {pCanDeafen && (
                  <MenuItem
                    label={voiceContext!.isDeafened ? 'Server Undeafen' : 'Server Deafen'}
                    icon={voiceContext!.isDeafened ? <HeadphonesIcon /> : <HeadphonesOffIcon />}
                    onClick={handleServerDeafen}
                    active={voiceContext!.isDeafened}
                  />
                )}
                {pCanMove && (
                  <div style={{ position: 'relative' }}>
                    <button
                      ref={moveItemRef}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '6px 12px',
                        fontSize: 14,
                        textAlign: 'left',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s, color 0.1s',
                      }}
                      onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover, #35373c)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        setShowMoveSubmenu(true);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <span style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <MoveIcon />
                      </span>
                      Move to Channel
                      <svg
                        style={{ width: 12, height: 12, marginLeft: 'auto' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    {/* Move submenu */}
                    {showMoveSubmenu && voiceChannels && voiceChannels.length > 0 && (
                      <div
                        style={{
                          position: 'fixed',
                          zIndex: 1001,
                          minWidth: 180,
                          padding: '6px 0',
                          background: 'var(--bg-tertiary, #1e1f22)',
                          borderRadius: 6,
                          boxShadow: '0 8px 16px rgba(0,0,0,0.24)',
                          border: '1px solid var(--border, #2b2d31)',
                          top: `${moveSubmenuStyle.top}px`,
                          left: `${moveSubmenuStyle.left}px`,
                        }}
                        onMouseLeave={() => setShowMoveSubmenu(false)}
                      >
                        {voiceChannels
                          .filter((ch) => ch.id !== voiceContext?.channelId)
                          .map((ch) => (
                            <button
                              key={ch.id}
                              onClick={() => handleMoveToChannel(ch.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '6px 12px',
                                fontSize: 14,
                                textAlign: 'left',
                                color: 'var(--text-secondary)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background 0.1s, color 0.1s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--bg-hover, #35373c)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <svg
                                style={{ width: 16, height: 16, flexShrink: 0 }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 12h.01"
                                />
                              </svg>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ch.name}
                              </span>
                            </button>
                          ))}
                        {voiceChannels.filter((ch) => ch.id !== voiceContext?.channelId).length === 0 && (
                          <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                            No other voice channels
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {pCanDisconnect && (
                  <MenuItem
                    label="Disconnect"
                    icon={<DisconnectIcon />}
                    onClick={handleDisconnect}
                    danger
                  />
                )}
              </>
            )}

            {/* ─── Server Moderation ────────────────────────────────── */}
            {hasServerModItems && (
              <>
                <Separator />
                <SectionLabel text="Moderation" />
                {pCanWarn && (
                  <MenuItem
                    label="Warn"
                    icon={<WarnIcon />}
                    onClick={() => setConfirmAction('warn')}
                    warning
                  />
                )}
                {pCanTimeout && onTimeout && (
                  <MenuItem
                    label="Timeout"
                    icon={<TimeoutIcon />}
                    onClick={() => {
                      onTimeout();
                      onClose();
                    }}
                    warning
                  />
                )}
                {pCanKick && (
                  <MenuItem
                    label="Kick"
                    icon={<KickIcon />}
                    onClick={() => setConfirmAction('kick')}
                    danger
                  />
                )}
                {pCanBan && (
                  <MenuItem
                    label="Ban"
                    icon={<BanIcon />}
                    onClick={() => setConfirmAction('ban')}
                    danger
                  />
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function Separator() {
  return (
    <div
      style={{
        margin: '4px 8px',
        borderTop: '1px solid var(--border, #3f4147)',
      }}
    />
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '4px 12px 2px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
      }}
    >
      {text}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  danger,
  warning,
  disabled,
  active,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  warning?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  const getColor = () => {
    if (disabled) return 'var(--text-muted)';
    if (danger) return 'var(--danger, #da373c)';
    if (warning) return '#eab308';
    if (active) return 'var(--accent, #5865f2)';
    return 'var(--text-secondary)';
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 12px',
        fontSize: 14,
        textAlign: 'left',
        color: getColor(),
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger
            ? 'rgba(218, 55, 60, 0.1)'
            : warning
              ? 'rgba(234, 179, 8, 0.1)'
              : 'var(--bg-hover, #35373c)';
          if (!danger && !warning && !active) {
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        if (!danger && !warning && !active) {
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {icon && <span style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {label}
      {active && (
        <svg style={{ width: 14, height: 14, marginLeft: 'auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}

function FriendMenuItem({ status, onAction }: { status: FriendStatus; onAction: () => void }) {
  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        fontSize: 14,
        color: 'var(--text-muted)',
      }}>
        <span style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10 }}>...</span>
        </span>
        Loading...
      </div>
    );
  }
  if (status === 'friends') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        fontSize: 14,
        color: 'var(--text-muted)',
      }}>
        <span style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <FriendCheckIcon />
        </span>
        Friends
      </div>
    );
  }
  if (status === 'pending_outgoing') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        fontSize: 14,
        color: 'var(--text-muted)',
      }}>
        <span style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <FriendPendingIcon />
        </span>
        Request Pending
      </div>
    );
  }
  if (status === 'pending_incoming') {
    return <MenuItem label="Accept Friend Request" icon={<FriendAddIcon />} onClick={onAction} />;
  }
  return <MenuItem label="Add Friend" icon={<FriendAddIcon />} onClick={onAction} />;
}

function RolePill({
  role,
  canRemove,
  loading,
  onRemove,
}: {
  role: { id: string; name: string; color: string | null };
  canRemove: boolean;
  loading: boolean;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: 'var(--bg-hover, #35373c)',
        color: role.color || undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: role.color || 'var(--text-muted)',
        }}
      />
      {role.name}
      {canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={loading}
          style={{
            marginLeft: 2,
            opacity: hovered ? 1 : 0,
            fontSize: 12,
            lineHeight: 1,
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: 0,
            transition: 'opacity 0.15s',
          }}
          title={`Remove ${role.name}`}
        >
          {loading ? '...' : '\u00d7'}
        </button>
      )}
    </span>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────

function ProfileIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function MentionIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function FriendAddIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}

function FriendCheckIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function FriendPendingIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
      />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h0a3 3 0 003-3v-2a3 3 0 00-3-3h0a3 3 0 00-3 3v2zm18 0a3 3 0 01-3 3h0a3 3 0 01-3-3v-2a3 3 0 013-3h0a3 3 0 013 3v2z"
      />
    </svg>
  );
}

function HeadphonesOffIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h0a3 3 0 003-3v-2a3 3 0 00-3-3h0a3 3 0 00-3 3v2zm18 0a3 3 0 01-3 3h0a3 3 0 01-3-3v-2a3 3 0 013-3h0a3 3 0 013 3v2z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4l16 16" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function TimeoutIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function KickIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
      />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}
