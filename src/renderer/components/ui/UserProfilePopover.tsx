import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Indicator,
  Paper,
  Slider,
  Stack,
  Text,
  ActionIcon,
  ScrollArea,
  TextInput,
} from '@mantine/core';
import {
  IconMessage,
  IconUserPlus,
  IconUserMinus,
  IconCheck,
  IconClock,
  IconVolume,
  IconVolumeOff,
  IconMicrophoneOff,
  IconHeadphonesOff,
  IconArrowsExchange,
  IconPlugConnectedX,
  IconAlertTriangle,
  IconUserX,
  IconBan,
  IconHistory,
  IconLoader2,
} from '@tabler/icons-react';
import { usePresenceStore } from '../../stores/presenceStore';
import { useAuthStore } from '../../stores/authStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { api, resolveAssetUrl } from '../../lib/api';
import {
  setUserVolume,
  getUserVolume,
  isLocallyMuted,
  toggleLocalMute,
} from '../../lib/voiceService';
import { toastStore } from '../../stores/toastNotifications';
import { queryClient } from '../../lib/queryClient';

// ── Module-level profile cache ───────────────────────────────────────────────

interface ProfileCacheEntry {
  bio: string | null;
  banner_url: string | null;
}

const profileCache = new Map<string, ProfileCacheEntry>();

// ── Types ────────────────────────────────────────────────────────────────────

interface VoiceChannel {
  id: string;
  name: string;
}

interface Warning {
  id: string;
  reason: string | null;
  created_at: string;
  moderator_username: string | null;
}

type FriendStatus = 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming' | 'loading';

export interface UserProfilePopoverProps {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  roles?: Array<{ id: string; name: string; color?: string }>;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string | null;
  roleColor?: string | null;
  isCurrentUser?: boolean;

  // Voice context
  isInVoice?: boolean;
  voiceChannelId?: string;
  voiceChannels?: VoiceChannel[];

  // Permissions (boolean flags)
  canMoveMembers?: boolean;
  canDisconnectMembers?: boolean;
  canMuteMembers?: boolean;
  canDeafenMembers?: boolean;
  canKickMembers?: boolean;
  canBanMembers?: boolean;
  canWarnMembers?: boolean;

  // Server context
  serverId?: string;

  // Positioning
  anchorRect?: { top: number; left: number; bottom: number; right: number };

  // Callbacks
  onSendMessage?: (userId: string) => void;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function UserProfilePopover({
  userId,
  username,
  displayName: displayNameProp,
  avatarUrl,
  bio: bioProp,
  roles = [],
  status: statusProp,
  customStatus: customStatusProp,
  roleColor,
  isCurrentUser,
  isInVoice,
  voiceChannelId,
  voiceChannels = [],
  canMoveMembers,
  canDisconnectMembers,
  canMuteMembers,
  canDeafenMembers,
  canKickMembers,
  canBanMembers,
  canWarnMembers,
  serverId,
  anchorRect,
  onSendMessage,
  onClose,
}: UserProfilePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // ── Presence store (safe primitive selectors) ────────────────────────────
  const presenceStatus = usePresenceStore((s) => s.statuses[userId] || 'offline');
  const statusComment = usePresenceStore((s) => s.statusComments[userId]);

  // ── Voice store (safe primitive selectors) ───────────────────────────────
  const voiceConnected = useVoiceStore((s) => s.connected);

  // ── Current user ─────────────────────────────────────────────────────────
  const currentUserId = useAuthStore((s) => s.user?.id);

  // ── Local state ──────────────────────────────────────────────────────────
  const [volume, setVolume] = useState(() => getUserVolume(userId));
  const [localMuted, setLocalMuted] = useState(() => isLocallyMuted(userId));
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('loading');
  const [actionLoading, setActionLoading] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'warn' | 'kick' | 'ban' | null>(null);
  const [modReason, setModReason] = useState('');
  const [showWarnings, setShowWarnings] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loadingWarnings, setLoadingWarnings] = useState(false);
  const [bio, setBio] = useState<string | null>(bioProp ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const status = statusProp || (presenceStatus as 'online' | 'idle' | 'dnd' | 'offline');
  const customStatus = customStatusProp || statusComment;
  const displayName = displayNameProp || username;
  const isMe = isCurrentUser ?? (currentUserId === userId);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'online': return 'green';
      case 'idle': return 'yellow';
      case 'dnd': return 'red';
      case 'offline': return 'gray';
      default: return 'gray';
    }
  }, [status]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Idle';
      case 'dnd': return 'Do Not Disturb';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  }, [status]);

  const showVoiceControls = isInVoice && !isMe && voiceConnected;

  const hasAnyModAction =
    canMoveMembers ||
    canDisconnectMembers ||
    canMuteMembers ||
    canDeafenMembers ||
    canKickMembers ||
    canBanMembers ||
    canWarnMembers;

  // ── Position calculation ─────────────────────────────────────────────────
  const position = useMemo(() => {
    if (!anchorRect) return { x: 0, y: 0 };

    const popoverWidth = 300;
    const popoverHeight = 500;
    const padding = 8;

    // Try left of anchor first
    let x = anchorRect.left - popoverWidth - padding;
    if (x < padding) {
      // Fall back to right of anchor
      x = anchorRect.right + padding;
    }
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding;
    }

    // Center vertically on anchor
    let y = anchorRect.top + (anchorRect.bottom - anchorRect.top) / 2 - popoverHeight / 2;
    y = Math.max(padding, Math.min(y, window.innerHeight - popoverHeight - padding));

    return { x, y };
  }, [anchorRect]);

  // ── Profile data fetching ────────────────────────────────────────────────
  useEffect(() => {
    const cached = profileCache.get(userId);
    if (cached) {
      if (!bioProp) setBio(cached.bio);
      setBannerUrl(cached.banner_url);
      return;
    }

    let cancelled = false;
    api.get<{ bio: string | null; banner_url: string | null }>(`/api/users/${userId}`)
      .then((data) => {
        if (cancelled) return;
        const profile: ProfileCacheEntry = {
          bio: data.bio ?? null,
          banner_url: data.banner_url ?? null,
        };
        profileCache.set(userId, profile);
        if (!bioProp) setBio(profile.bio);
        setBannerUrl(profile.banner_url);
      })
      .catch(() => {
        // Bio/banner are optional enhancements
      });

    return () => { cancelled = true; };
  }, [userId, bioProp]);

  // ── Friend status fetching ───────────────────────────────────────────────
  const fetchFriendStatus = useCallback(async () => {
    try {
      const friends = await api.get<any[]>('/api/friends/');
      const friendsList = Array.isArray(friends) ? friends : [];
      if (friendsList.some((f: any) => f.id === userId)) {
        setFriendStatus('friends');
        return;
      }

      const requests = await api.get<{ incoming: any[]; outgoing: any[] }>('/api/friends/requests');
      if (
        requests?.outgoing?.some(
          (r: any) => r.to_user_id === userId || r.to_user?.id === userId
        )
      ) {
        setFriendStatus('pending_outgoing');
        return;
      }
      if (
        requests?.incoming?.some(
          (r: any) => r.from_user_id === userId || r.from_user?.id === userId
        )
      ) {
        setFriendStatus('pending_incoming');
        return;
      }

      setFriendStatus('none');
    } catch {
      setFriendStatus('none');
    }
  }, [userId]);

  // ── Escape + Click outside ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmAction) {
          setConfirmAction(null);
          setModReason('');
        } else if (showMovePicker) {
          setShowMovePicker(false);
        } else if (showWarnings) {
          setShowWarnings(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Delay click-outside to prevent the opening click from closing immediately
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      cancelAnimationFrame(raf);
    };
  }, [confirmAction, showMovePicker, showWarnings, onClose]);

  // Fetch friend status once on mount (not on every overlay state change)
  useEffect(() => {
    if (!isMe) {
      fetchFriendStatus();
    }
  }, [isMe, fetchFriendStatus]);

  // ── Friend actions ───────────────────────────────────────────────────────

  const handleSendFriendRequest = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.post('/api/friends/requests', { username });
      setFriendStatus('pending_outgoing');
      toastStore.addToast({
        type: 'system',
        title: 'Friend Request Sent',
        message: `Sent a friend request to ${displayName}`,
      });
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not send friend request',
      });
    } finally {
      setActionLoading(false);
    }
  }, [username, displayName]);

  const handleAcceptFriendRequest = useCallback(async () => {
    setActionLoading(true);
    try {
      // Find the request ID from incoming requests
      const requests = await api.get<{ incoming: any[] }>('/api/friends/requests');
      const req = requests?.incoming?.find(
        (r: any) => r.from_user_id === userId || r.from_user?.id === userId
      );
      if (req) {
        await api.post(`/api/friends/requests/${req.id}/accept`);
        setFriendStatus('friends');
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        toastStore.addToast({
          type: 'system',
          title: 'Friend Added',
          message: `You are now friends with ${displayName}`,
        });
      }
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not accept friend request',
      });
    } finally {
      setActionLoading(false);
    }
  }, [userId, displayName]);

  const handleRemoveFriend = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.delete(`/api/friends/${userId}`);
      setFriendStatus('none');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toastStore.addToast({
        type: 'system',
        title: 'Friend Removed',
        message: `Removed ${displayName} from friends`,
      });
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not remove friend',
      });
    } finally {
      setActionLoading(false);
    }
  }, [userId, displayName]);

  const handleSendMessage = useCallback(() => {
    if (onSendMessage) {
      onSendMessage(userId);
    }
    onClose();
  }, [onSendMessage, userId, onClose]);

  // ── Voice controls ───────────────────────────────────────────────────────

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    setUserVolume(userId, value);
  }, [userId]);

  const handleToggleLocalMute = useCallback(() => {
    const nowMuted = toggleLocalMute(userId);
    setLocalMuted(nowMuted);
  }, [userId]);

  // ── Mod: server mute/deafen ──────────────────────────────────────────────

  const handleServerMute = useCallback(async () => {
    if (!voiceChannelId || !serverId) return;
    try {
      await api.post('/api/voice/server-mute', {
        user_id: userId,
        channel_id: voiceChannelId,
        muted: true,
      });
      toastStore.addToast({
        type: 'system',
        title: 'Server Muted',
        message: `Server muted ${displayName}`,
      });
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not server mute member',
      });
    }
  }, [userId, voiceChannelId, serverId, displayName]);

  const handleServerDeafen = useCallback(async () => {
    if (!voiceChannelId || !serverId) return;
    try {
      await api.post('/api/voice/server-deafen', {
        user_id: userId,
        channel_id: voiceChannelId,
        deafened: true,
      });
      toastStore.addToast({
        type: 'system',
        title: 'Server Deafened',
        message: `Server deafened ${displayName}`,
      });
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not server deafen member',
      });
    }
  }, [userId, voiceChannelId, serverId, displayName]);

  // ── Mod: move to channel ─────────────────────────────────────────────────

  const handleMove = useCallback(async (toChannelId: string) => {
    if (!voiceChannelId) return;
    try {
      await api.post('/api/voice/move-member', {
        user_id: userId,
        from_channel_id: voiceChannelId,
        to_channel_id: toChannelId,
      });
      setShowMovePicker(false);
      toastStore.addToast({
        type: 'system',
        title: 'Member Moved',
        message: `Moved ${displayName} to another channel`,
      });
      onClose();
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not move member',
      });
    }
  }, [userId, voiceChannelId, displayName, onClose]);

  // ── Mod: disconnect ──────────────────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    if (!voiceChannelId) return;
    try {
      await api.post('/api/voice/disconnect-member', {
        user_id: userId,
        channel_id: voiceChannelId,
      });
      toastStore.addToast({
        type: 'system',
        title: 'Member Disconnected',
        message: `Disconnected ${displayName} from voice`,
      });
      onClose();
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not disconnect member',
      });
    }
  }, [userId, voiceChannelId, displayName, onClose]);

  // ── Mod: warn/kick/ban ───────────────────────────────────────────────────

  const handleWarn = useCallback(async () => {
    if (!serverId) return;
    setActionLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/warn`, {
        reason: modReason || undefined,
      });
      setConfirmAction(null);
      setModReason('');
      toastStore.addToast({
        type: 'system',
        title: 'Member Warned',
        message: `Warned ${displayName}`,
      });
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not warn member',
      });
    } finally {
      setActionLoading(false);
    }
  }, [serverId, userId, modReason, displayName]);

  const handleKick = useCallback(async () => {
    if (!serverId) return;
    setActionLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/kick`, {
        reason: modReason || undefined,
      });
      setConfirmAction(null);
      setModReason('');
      toastStore.addToast({
        type: 'system',
        title: 'Member Kicked',
        message: `Kicked ${displayName} from the server`,
      });
      onClose();
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not kick member',
      });
    } finally {
      setActionLoading(false);
    }
  }, [serverId, userId, modReason, displayName, onClose]);

  const handleBan = useCallback(async () => {
    if (!serverId) return;
    setActionLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/ban`, {
        reason: modReason || undefined,
      });
      setConfirmAction(null);
      setModReason('');
      toastStore.addToast({
        type: 'system',
        title: 'Member Banned',
        message: `Banned ${displayName} from the server`,
      });
      onClose();
    } catch (err: any) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed',
        message: err.message || 'Could not ban member',
      });
    } finally {
      setActionLoading(false);
    }
  }, [serverId, userId, modReason, displayName, onClose]);

  // ── Warning history ──────────────────────────────────────────────────────

  const fetchWarnings = useCallback(async () => {
    if (!serverId) return;
    setLoadingWarnings(true);
    try {
      const data = await api.get<{ warnings: Warning[] }>(
        `/api/servers/${serverId}/members/${userId}/warnings`
      );
      const list = Array.isArray(data) ? data : (data?.warnings ?? []);
      setWarnings(list);
    } catch {
      setWarnings([]);
    } finally {
      setLoadingWarnings(false);
    }
  }, [serverId, userId]);

  // ── Banner background ────────────────────────────────────────────────────
  const bannerStyle = useMemo(() => {
    if (bannerUrl) {
      return {
        height: 60,
        background: `url(${resolveAssetUrl(bannerUrl)}) center/cover no-repeat`,
      };
    }
    if (roleColor) {
      return {
        height: 60,
        background: `${roleColor}40`,
      };
    }
    return {
      height: 60,
      background: 'var(--accent)',
      opacity: 0.3,
    };
  }, [bannerUrl, roleColor]);

  // ── Confirm action exec ──────────────────────────────────────────────────
  const executeConfirmAction = useCallback(() => {
    if (confirmAction === 'warn') handleWarn();
    else if (confirmAction === 'kick') handleKick();
    else if (confirmAction === 'ban') handleBan();
  }, [confirmAction, handleWarn, handleKick, handleBan]);

  // ── Render ───────────────────────────────────────────────────────────────

  const content = (
    <Paper
      ref={popoverRef}
      shadow="lg"
      radius="md"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        width: 300,
        overflow: 'hidden',
        maxHeight: '85vh',
        overflowY: 'auto',
        ...(anchorRect
          ? {
              position: 'fixed' as const,
              left: position.x,
              top: position.y,
              zIndex: 200,
            }
          : {}),
      }}
    >
      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div style={bannerStyle} />

      {/* ── Avatar (overlapping banner) ─────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginTop: -30 }}>
        <Indicator
          color={statusColor as any}
          size={14}
          offset={4}
          position="bottom-end"
          withBorder
        >
          <Avatar
            src={resolveAssetUrl(avatarUrl)}
            size={64}
            radius="xl"
            color="brand"
            style={{ border: '4px solid var(--bg-primary)' }}
          >
            {(displayName || '?')[0].toUpperCase()}
          </Avatar>
        </Indicator>
      </div>

      <Stack gap="sm" p="md" pt="xs">
        {/* ── Name + Status ───────────────────────────────────────────── */}
        <div>
          <Text
            fw={700}
            size="lg"
            style={roleColor ? { color: roleColor } : undefined}
          >
            {displayName}
          </Text>
          {displayNameProp && displayNameProp !== username && (
            <Text size="sm" c="dimmed">{username}</Text>
          )}
          <Group gap={6} mt={2}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: `var(--mantine-color-${statusColor}-filled)`,
              }}
            />
            <Text size="xs" c="dimmed">{statusLabel}</Text>
          </Group>
        </div>

        {/* ── Custom status ───────────────────────────────────────────── */}
        {customStatus && (
          <Text
            size="sm"
            c="dimmed"
            style={{
              fontStyle: 'italic',
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              padding: '4px 10px',
            }}
          >
            {customStatus}
          </Text>
        )}

        {/* ── Bio ─────────────────────────────────────────────────────── */}
        {bio && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>About Me</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{bio}</Text>
            </div>
          </>
        )}

        {/* ── Friend action button ────────────────────────────────────── */}
        {!isMe && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <Group gap="xs">
              {friendStatus === 'loading' && (
                <Button
                  size="xs"
                  variant="light"
                  disabled
                  leftSection={
                    <IconLoader2
                      size={14}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  }
                >
                  Loading...
                </Button>
              )}

              {friendStatus === 'none' && (
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  leftSection={<IconUserPlus size={14} />}
                  onClick={handleSendFriendRequest}
                  loading={actionLoading}
                >
                  Add Friend
                </Button>
              )}

              {friendStatus === 'pending_outgoing' && (
                <Button size="xs" variant="light" disabled leftSection={<IconClock size={14} />}>
                  Request Pending
                </Button>
              )}

              {friendStatus === 'pending_incoming' && (
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  leftSection={<IconCheck size={14} />}
                  onClick={handleAcceptFriendRequest}
                  loading={actionLoading}
                >
                  Accept Request
                </Button>
              )}

              {friendStatus === 'friends' && (
                <>
                  {onSendMessage && (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconMessage size={14} />}
                      onClick={handleSendMessage}
                    >
                      Message
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconUserMinus size={14} />}
                    onClick={handleRemoveFriend}
                    loading={actionLoading}
                  >
                    Remove Friend
                  </Button>
                </>
              )}
            </Group>
          </>
        )}

        {/* ── Roles ───────────────────────────────────────────────────── */}
        {roles.length > 0 && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Roles</Text>
              <Group gap={4}>
                {roles.map((role) => (
                  <Badge key={role.id} size="sm" variant="outline" color={role.color || 'gray'}>
                    {role.name}
                  </Badge>
                ))}
              </Group>
            </div>
          </>
        )}

        {/* ── Voice controls ──────────────────────────────────────────── */}
        {showVoiceControls && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>User Volume</Text>

              {/* Volume slider */}
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={handleToggleLocalMute}
                  color={localMuted ? 'red' : 'gray'}
                  title={localMuted ? 'Unmute user locally' : 'Mute user locally'}
                >
                  {localMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                </ActionIcon>
                <Slider
                  value={volume}
                  onChange={handleVolumeChange}
                  min={0}
                  max={200}
                  step={1}
                  style={{ flex: 1 }}
                  label={(v) => `${v}%`}
                  disabled={localMuted}
                  styles={{
                    bar: { backgroundColor: volume > 100 ? 'var(--mantine-color-orange-filled)' : undefined },
                    thumb: { borderColor: volume > 100 ? 'var(--mantine-color-orange-filled)' : undefined },
                  }}
                />
                <Text size="xs" c="dimmed" w={36} ta="right">{volume}%</Text>
              </Group>
            </div>
          </>
        )}

        {/* ── Moderation section ──────────────────────────────────────── */}
        {!isMe && hasAnyModAction && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />

            {/* Confirmation overlay */}
            {confirmAction ? (
              <div>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
                  {confirmAction === 'warn' ? 'Warn Member' : confirmAction === 'kick' ? 'Kick Member' : 'Ban Member'}
                </Text>
                <Text size="xs" c="dimmed" mb={8}>
                  {confirmAction === 'warn'
                    ? `Send a warning to ${displayName}.`
                    : confirmAction === 'kick'
                      ? `Remove ${displayName} from the server.`
                      : `Permanently ban ${displayName} from the server.`}
                </Text>
                <TextInput
                  placeholder="Reason (optional)"
                  size="xs"
                  value={modReason}
                  onChange={(e) => setModReason(e.currentTarget.value)}
                  mb={8}
                  styles={{
                    input: {
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                    },
                  }}
                />
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => { setConfirmAction(null); setModReason(''); }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    color={confirmAction === 'warn' ? 'yellow' : 'red'}
                    onClick={executeConfirmAction}
                    loading={actionLoading}
                    style={{ flex: 1 }}
                  >
                    {confirmAction === 'warn' ? 'Warn' : confirmAction === 'kick' ? 'Kick' : 'Ban'}
                  </Button>
                </Group>
              </div>
            ) : (
              <div>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Moderation</Text>
                <Stack gap={2}>
                  {/* Voice-specific mod actions */}
                  {showVoiceControls && (
                    <>
                      {/* Move to channel */}
                      {canMoveMembers && (
                        <>
                          {showMovePicker ? (
                            <Paper
                              p="xs"
                              style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: 6,
                              }}
                            >
                              <Text size="xs" c="dimmed" mb={4}>Move to:</Text>
                              <ScrollArea.Autosize mah={128}>
                                <Stack gap={2}>
                                  {voiceChannels
                                    .filter((c) => c.id !== voiceChannelId)
                                    .map((ch) => (
                                      <Button
                                        key={ch.id}
                                        size="xs"
                                        variant="subtle"
                                        fullWidth
                                        justify="flex-start"
                                        onClick={() => handleMove(ch.id)}
                                      >
                                        {ch.name}
                                      </Button>
                                    ))}
                                </Stack>
                              </ScrollArea.Autosize>
                              <Button
                                size="xs"
                                variant="subtle"
                                c="dimmed"
                                mt={4}
                                onClick={() => setShowMovePicker(false)}
                              >
                                Cancel
                              </Button>
                            </Paper>
                          ) : (
                            <Button
                              size="xs"
                              variant="subtle"
                              fullWidth
                              justify="flex-start"
                              leftSection={<IconArrowsExchange size={16} />}
                              onClick={() => setShowMovePicker(true)}
                            >
                              Move to Channel
                            </Button>
                          )}
                        </>
                      )}

                      {/* Server mute */}
                      {canMuteMembers && (
                        <Button
                          size="xs"
                          variant="subtle"
                          fullWidth
                          justify="flex-start"
                          leftSection={<IconMicrophoneOff size={16} />}
                          onClick={handleServerMute}
                        >
                          Server Mute
                        </Button>
                      )}

                      {/* Server deafen */}
                      {canDeafenMembers && (
                        <Button
                          size="xs"
                          variant="subtle"
                          fullWidth
                          justify="flex-start"
                          leftSection={<IconHeadphonesOff size={16} />}
                          onClick={handleServerDeafen}
                        >
                          Server Deafen
                        </Button>
                      )}

                      {/* Disconnect */}
                      {canDisconnectMembers && (
                        <Button
                          size="xs"
                          variant="subtle"
                          fullWidth
                          justify="flex-start"
                          color="red"
                          leftSection={<IconPlugConnectedX size={16} />}
                          onClick={handleDisconnect}
                        >
                          Disconnect
                        </Button>
                      )}
                    </>
                  )}

                  {/* Warn + history */}
                  {canWarnMembers && (
                    <>
                      <Group gap={4}>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="yellow"
                          leftSection={<IconAlertTriangle size={16} />}
                          onClick={() => setConfirmAction('warn')}
                          style={{ flex: 1 }}
                          justify="flex-start"
                        >
                          Warn
                        </Button>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          title="View warning history"
                          onClick={() => {
                            const next = !showWarnings;
                            setShowWarnings(next);
                            if (next && warnings.length === 0) fetchWarnings();
                          }}
                        >
                          <IconHistory size={14} />
                        </ActionIcon>
                      </Group>

                      {/* Warning history panel */}
                      {showWarnings && (
                        <Paper
                          p="xs"
                          style={{
                            background: 'var(--bg-secondary)',
                            borderRadius: 6,
                          }}
                        >
                          <ScrollArea.Autosize mah={160}>
                            {loadingWarnings ? (
                              <Text size="xs" c="dimmed" ta="center" py={8}>Loading...</Text>
                            ) : warnings.length === 0 ? (
                              <Text size="xs" c="dimmed" ta="center" py={8}>No warnings</Text>
                            ) : (
                              <Stack gap={8}>
                                {warnings.map((w) => (
                                  <div key={w.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                    <Group justify="space-between">
                                      <Text size="xs" c="dimmed">
                                        by {w.moderator_username || 'Unknown'}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {new Date(w.created_at).toLocaleDateString()}
                                      </Text>
                                    </Group>
                                    {w.reason && (
                                      <Text size="xs" mt={2}>{w.reason}</Text>
                                    )}
                                  </div>
                                ))}
                              </Stack>
                            )}
                          </ScrollArea.Autosize>
                        </Paper>
                      )}
                    </>
                  )}

                  {/* Kick */}
                  {canKickMembers && (
                    <Button
                      size="xs"
                      variant="subtle"
                      fullWidth
                      justify="flex-start"
                      color="red"
                      leftSection={<IconUserX size={16} />}
                      onClick={() => setConfirmAction('kick')}
                    >
                      Kick
                    </Button>
                  )}

                  {/* Ban */}
                  {canBanMembers && (
                    <Button
                      size="xs"
                      variant="subtle"
                      fullWidth
                      justify="flex-start"
                      color="red"
                      leftSection={<IconBan size={16} />}
                      onClick={() => setConfirmAction('ban')}
                    >
                      Ban
                    </Button>
                  )}
                </Stack>
              </div>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );

  // Portal rendering when anchorRect is provided (floating popover)
  if (anchorRect) {
    return createPortal(content, document.body);
  }

  // Inline rendering (backward-compatible, used when no anchor)
  return content;
}
