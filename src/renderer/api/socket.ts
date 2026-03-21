import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { toastStore } from '../stores/toastNotifications';
import { usePresenceStore } from '../stores/presenceStore';
import { useActivityStore } from '../stores/activityStore';
import { useTypingStore } from '../stores/typingStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useUnreadStore } from '../stores/unreadStore';
import { useUIStore } from '../stores/uiStore';
import { useChannelNotificationStore } from '../stores/channelNotificationStore';
import { useAuthStore } from '../stores/authStore';
import { soundService } from '../lib/soundService';
import { blockedUsersStore } from '../stores/blockedUsersStore';
import { ignoredUsersStore } from '../stores/ignoredUsersStore';
import { cacheParticipantInfo, updateServerVoiceState } from '../lib/voiceService';
import { isDMConnected } from '../lib/dmVoiceService';
import {
  setKeyMaterial, encrypt as cryptoEncrypt, decrypt as cryptoDecrypt,
  isEncryptedEnvelope, hasActiveSession as hasCryptoSession,
  clearSession as clearCryptoSession, getSessionId,
} from '../lib/crypto';

const electronAPI = (window as any).electronAPI;

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let gatewaySessionId: string | null = null;
let lastSequences: Record<string, number> = {};
let unsubCryptoRefresh: (() => void) | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<void> {
  if (socket?.connected) return;

  const { token, serverUrl, cryptoSessionId } = await electronAPI.auth.getSocketToken();
  if (!token || !serverUrl) return;

  // Load crypto key material from main process if session exists
  if (cryptoSessionId) {
    const keyMaterial = await electronAPI.crypto.getKeyMaterial();
    if (keyMaterial) {
      await setKeyMaterial(keyMaterial.key, keyMaterial.sessionId);
    }
  }

  // Build auth object with optional crypto session
  const auth: Record<string, any> = { token };
  if (hasCryptoSession()) {
    auth.cryptoSessionId = getSessionId();
  }

  socket = io(serverUrl, {
    auth,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('gateway.hello', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;

    gatewaySessionId = data.session_id || null;

    // Start heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket?.emit('gateway.heartbeat');
    }, data.heartbeat_interval);
  });

  socket.on('gateway.ready', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;

    lastSequences = data.sequences || {};
    // Trigger initial data refetch
    queryClient.invalidateQueries();
    // Load blocked/ignored user lists
    blockedUsersStore.fetchBlocked();
    ignoredUsersStore.fetchIgnored();
  });

  socket.on('gateway.resumed', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;

    gatewaySessionId = data.session_id || gatewaySessionId;
    lastSequences = data.sequences || lastSequences;

    // Replay missed events
    if (Array.isArray(data.missed_events)) {
      for (const envelope of data.missed_events) {
        let eventData = envelope.payload;
        if (hasCryptoSession() && isEncryptedEnvelope(eventData)) {
          try { eventData = await cryptoDecrypt(eventData); } catch { continue; }
        }
        if (envelope.resource_id) {
          lastSequences[envelope.resource_id] = envelope.sequence;
        }
        handleEvent(envelope.type, eventData);
      }
    }
  });

  socket.on('gateway.resume_failed', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;

    console.warn('[socket] Gateway resume failed:', data.reason, data.message);
    // Clear stale session and do a full reconnect
    gatewaySessionId = null;
    lastSequences = {};
    queryClient.invalidateQueries();
  });

  socket.on('event', async (envelope: {
    type: string;
    payload: any;
    sequence: number;
    resource_id?: string;
  }) => {
    // Track per-resource sequences
    if (envelope.resource_id) {
      lastSequences[envelope.resource_id] = envelope.sequence;
    }

    // Decrypt payload if encrypted
    let eventData = envelope.payload;
    if (hasCryptoSession() && isEncryptedEnvelope(eventData)) {
      try {
        eventData = await cryptoDecrypt(eventData);
      } catch (err) {
        console.error('[socket] Decryption failed for event:', envelope.type, err);
        return; // Drop undecryptable events
      }
    }

    handleEvent(envelope.type, eventData);
  });

  // Named event listeners for events emitted via emitEncrypted (not the envelope bus)
  socket.on('server.update', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;
    handleEvent('server.update', data);
  });

  socket.on('connect_error', async (err: Error) => {
    if (err.message === 'jwt expired' || err.message?.includes('jwt')) {
      const result = await electronAPI.auth.refreshToken();
      if (result.success) {
        socket!.auth = { token: result.token };
        if (hasCryptoSession()) {
          (socket!.auth as any).cryptoSessionId = getSessionId();
        }
        socket!.connect();
      }
    }
  });

  socket.on('disconnect', async (reason: string) => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Try to resume on reconnect
    if (reason !== 'io client disconnect') {
      socket?.once('connect', () => {
        socket?.emit('gateway.resume', {
          session_id: gatewaySessionId,
          last_sequences: lastSequences,
        });
      });
    }
  });

  // Listen for crypto session refresh from main process
  unsubCryptoRefresh = electronAPI.crypto.onSessionRefreshed(
    async (data: { sessionId: string; key: string }) => {
      await setKeyMaterial(data.key, data.sessionId);
      // Update socket auth for next reconnect
      if (socket) {
        (socket.auth as any).cryptoSessionId = data.sessionId;
      }
    }
  );
}

export function disconnectSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (unsubCryptoRefresh) {
    unsubCryptoRefresh();
    unsubCryptoRefresh = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  gatewaySessionId = null;
  lastSequences = {};
  clearCryptoSession();
}

function isAfkChannel(channelId: string): boolean {
  const queries = queryClient.getQueriesData<any[]>({ queryKey: ['channels'] });
  for (const [, channels] of queries) {
    if (!Array.isArray(channels)) continue;
    const ch = channels.find((c: any) => c.id === channelId);
    if (ch) return !!ch.is_afk_channel;
  }
  return false;
}

function handleEvent(type: string, data: any): void {
  switch (type) {
    // Messages — invalidate query cache + track unreads
    case 'message.new': {
      queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
      // Increment unread if not the active channel
      const activeChannelId = useUIStore.getState().activeChannelId;
      if (data.channel_id !== activeChannelId) {
        const isMention = !!data.mentions_user;
        const isEveryone = !!data.mentions_everyone;
        const isRole = !!data.mentions_roles;
        useUnreadStore.getState().increment(data.channel_id, isMention);
        // Toast if channel notification settings allow it
        const shouldShow = useChannelNotificationStore.getState().shouldNotify(
          data.channel_id, isMention, isEveryone, isRole,
        );
        if (shouldShow && (isMention || isEveryone)) {
          const author = data.author?.username || 'Someone';
          const content = data.content?.slice(0, 80) || '';
          toastStore.addToast({
            type: 'mention',
            title: isMention ? `@${author} mentioned you` : `@${author} in #channel`,
            message: content,
            avatarUrl: data.author?.avatar_url,
          });
        }
      }
      break;
    }
    case 'message.update':
    case 'message.delete':
      queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
      break;

    // DM messages
    case 'dm.message.new': {
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      // Track DM unread + toast for non-active conversation
      const currentView = useUIStore.getState().view;
      const isActiveDM = currentView === 'dms' && useUIStore.getState().activeDMId === data.conversation_id;
      if (!isActiveDM) {
        useUnreadStore.getState().incrementDM(data.conversation_id);
        const dmAuthor = data.author?.username || 'Someone';
        const dmContent = data.content?.slice(0, 80) || '';
        toastStore.addToast({
          type: 'dm',
          title: `${dmAuthor} sent you a message`,
          message: dmContent,
          avatarUrl: data.author?.avatar_url,
        });
      }
      break;
    }
    case 'dm.message.update':
    case 'dm.message.delete':
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      break;

    // Channels
    case 'channel.create':
    case 'channel.update':
    case 'channel.delete':
    case 'channels.reorder':
    case 'channel.permissions.update':
    case 'channel.permissions.delete':
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;

    // Categories
    case 'category.create':
    case 'category.update':
    case 'category.delete':
    case 'category.permissions.update':
    case 'category.permissions.delete':
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;

    // Roles
    case 'role.create':
    case 'role.update':
    case 'role.delete':
    case 'roles.reorder':
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      break;

    // Members
    case 'member.join':
      queryClient.invalidateQueries({ queryKey: ['members'] });
      // Seed presence for newly joined member
      if (data.member?.status || data.status) {
        usePresenceStore.getState().updatePresence(
          data.member?.id || data.user_id,
          data.member?.status || data.status,
        );
      }
      break;
    case 'member.leave':
    case 'member.update':
    case 'member.role.add':
    case 'member.role.remove':
    case 'member.roles.update':
      queryClient.invalidateQueries({ queryKey: ['members'] });
      break;

    case 'member.timeout': {
      const myUserId = useAuthStore.getState().user?.id;
      if (data.user_id === myUserId || !data.user_id) {
        toastStore.addToast({
          type: 'warning',
          title: 'Timed Out',
          message: data.reason
            ? `You were timed out in ${data.server_name}: ${data.reason}`
            : `You were timed out in ${data.server_name}`,
        });
      }
      break;
    }
    case 'member.timeout.remove':
      break;
    case 'member.warn': {
      toastStore.addToast({
        type: 'warning',
        title: 'Warning',
        message: data.reason
          ? `${data.moderator_username} warned you in ${data.server_name}: ${data.reason}`
          : `You received a warning in ${data.server_name}`,
      });
      break;
    }

    // Server
    case 'server.update':
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: ['server', data.id] });
      }
      break;
    case 'server.delete':
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      // If we're viewing the deleted server, redirect
      if (data.id === useUIStore.getState().activeServerId) {
        useVoiceStore.getState().leave().catch(() => {});
        toastStore.addToast({ type: 'system', title: 'Server Deleted', message: 'The server has been deleted.' });
      }
      break;
    case 'server.kicked':
      useVoiceStore.getState().leave().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toastStore.addToast({
        type: 'warning',
        title: 'Kicked',
        message: data.reason
          ? `You were kicked from ${data.server_name}: ${data.reason}`
          : `You were kicked from ${data.server_name}`,
      });
      break;
    case 'server.banned':
      useVoiceStore.getState().leave().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toastStore.addToast({
        type: 'warning',
        title: 'Banned',
        message: data.reason
          ? `You were banned from ${data.server_name}: ${data.reason}`
          : `You were banned from ${data.server_name}`,
      });
      break;

    // Friends
    case 'friend.request.new':
    case 'friend.request.accepted':
    case 'friend.removed':
    case 'friend.request.declined':
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      break;

    // Message pinning
    case 'message.pin':
      queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', data.channel_id] });
      break;
    case 'message.unpin':
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', data.channel_id] });
      break;

    // Notifications
    case 'notification.new':
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      soundService.playNotification();
      if (data.data?.title || data.type) {
        toastStore.addToast({
          type: 'system',
          title: data.data?.title || 'Notification',
          message: data.data?.message || data.data?.body || '',
        });
      }
      break;
    case 'notification.read':
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      break;

    // Soundboard
    case 'soundboard.play': {
      // Play the sound
      if (data.sound_url) {
        const audio = new Audio(data.sound_url);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
      break;
    }
    case 'soundboard.added':
    case 'soundboard.removed':
      queryClient.invalidateQueries({ queryKey: ['soundboard'] });
      break;

    // User blocking
    case 'user.block':
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      break;

    // Presence — update Zustand directly (ephemeral)
    case 'presence.update':
      usePresenceStore.getState().updatePresence(data.user_id, data.status);
      // presence.update may include activity
      if ('activity' in data) {
        useActivityStore.getState().updateActivity(data.user_id, data.activity || null);
      }
      break;
    case 'status_comment.update':
      usePresenceStore.getState().updateStatusComment(data.user_id, data.status_comment);
      break;

    // Activity / Rich Presence
    case 'activity.update':
      useActivityStore.getState().updateActivity(data.user_id, data.activity || null);
      break;

    // Typing — update Zustand directly (ephemeral)
    // Server sends channel typing as { channel_id, user: { id, username, display_name } }
    case 'typing.start':
      useTypingStore.getState().addTyping(
        data.channel_id,
        data.user?.id || data.user_id,
        data.user?.username || data.username || 'Someone',
      );
      break;
    case 'typing.stop':
      useTypingStore.getState().removeTyping(data.channel_id, data.user?.id || data.user_id);
      break;
    // Server sends DM typing as { user_id } — resolve conversation from cache
    case 'dm.typing.start': {
      const dmConversations = queryClient.getQueryData<any[]>(['dm-conversations']);
      const dmConv = Array.isArray(dmConversations)
        ? dmConversations.find((c) => c.participants?.some((p: any) => p.id === data.user_id))
        : undefined;
      if (dmConv) {
        const participant = dmConv.participants?.find((p: any) => p.id === data.user_id);
        useTypingStore.getState().addTyping(
          `dm:${dmConv.id}`,
          data.user_id,
          participant?.username || 'Someone',
        );
      }
      break;
    }
    case 'dm.typing.stop': {
      const dmConvs = queryClient.getQueryData<any[]>(['dm-conversations']);
      const conv = Array.isArray(dmConvs)
        ? dmConvs.find((c) => c.participants?.some((p: any) => p.id === data.user_id))
        : undefined;
      if (conv) {
        useTypingStore.getState().removeTyping(`dm:${conv.id}`, data.user_id);
      }
      break;
    }

    // Voice — update voice store + query cache + play sounds
    case 'voice.join': {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      // Cache participant display info for voice username resolution
      if (data.user) {
        cacheParticipantInfo(data.user.id, {
          username: data.user.username,
          displayName: data.user.display_name,
          avatarUrl: data.user.avatar_url,
        });
      }
      const currentUserId = useAuthStore.getState().user?.id;
      const voiceState = useVoiceStore.getState();
      const isSelf = data.user?.id === currentUserId;
      // Play join sound for everyone in the channel including the joining user.
      // For self: voiceState may still be 'connecting' (API returned but store
      //   hasn't set connected yet), so accept connectionState === 'connecting'.
      // For others: require connected + same channel.
      const shouldPlay =
        !isAfkChannel(data.channel_id) &&
        (isSelf
          ? voiceState.connectionState === 'connecting' || (voiceState.connected && data.channel_id === voiceState.channelId)
          : voiceState.connected && data.channel_id === voiceState.channelId);
      if (shouldPlay) {
        if (data.custom_sound_url) {
          soundService.playUrl(data.custom_sound_url);
        } else {
          soundService.playVoiceJoin();
        }
      }
      // Detect incoming DM call from another user
      if (data.is_dm_call && data.dm_channel_id && data.user && !isSelf) {
        // Only suppress if already in a DM call (allow notification while in server voice)
        if (!(voiceState.connectionState === 'connected' && isDMConnected())) {
          useVoiceStore.getState().setIncomingDMCall({
            callerId: data.user.id,
            callerName: data.user.display_name || data.user.username,
            callerAvatar: data.user.avatar_url || null,
            dmChannelId: data.dm_channel_id,
          });
        }
      }
      break;
    }
    case 'voice.leave': {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      const currentUserId2 = useAuthStore.getState().user?.id;
      const leavingUserId = data.user?.id || data.user_id;
      const voiceState2 = useVoiceStore.getState();
      // Leave sound plays only for users remaining in the channel, not the leaving user
      if (
        voiceState2.connected &&
        leavingUserId !== currentUserId2 &&
        data.channel_id === voiceState2.channelId &&
        !isAfkChannel(data.channel_id)
      ) {
        if (data.custom_sound_url) {
          soundService.playUrl(data.custom_sound_url);
        } else {
          soundService.playVoiceLeave();
        }
      }
      // Detect caller cancellation — caller left DM call before we answered
      if (data.is_dm_call && data.dm_channel_id) {
        const incoming = useVoiceStore.getState().incomingDMCall;
        if (incoming && incoming.dmChannelId === data.dm_channel_id) {
          useVoiceStore.getState().setIncomingDMCall(null);
        }
      }
      break;
    }
    case 'voice.state_update': {
      // Server sends mute/deafen/stream state for a participant — update local cache
      if (data.user_id) {
        updateServerVoiceState(data.user_id, {
          isServerMuted: data.is_server_muted,
          isServerDeafened: data.is_server_deafened,
        });
      }
      break;
    }
    case 'voice.force_move': {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.connected) {
        voiceStore.leave().then(() => {
          if (data.to_channel_id) {
            voiceStore.join(data.to_channel_id, data.to_channel_name);
          }
        });
      }
      break;
    }
    case 'voice.force_disconnect': {
      // Server already cleaned up Redis state and published voice.leave —
      // client only needs to tear down local voice (LiveKit, UI state).
      const vs = useVoiceStore.getState();
      if (vs.connected) {
        vs.leave();
      }
      break;
    }
    case 'voice.server_mute': {
      // A moderator muted/unmuted the current user
      const myId = useAuthStore.getState().user?.id;
      if (myId) {
        updateServerVoiceState(myId, { isServerMuted: data.muted });
      }
      break;
    }
    case 'voice.server_deafen': {
      // A moderator deafened/undeafened the current user
      const myId2 = useAuthStore.getState().user?.id;
      if (myId2) {
        updateServerVoiceState(myId2, { isServerDeafened: data.deafened });
      }
      break;
    }
  }
}

// ── Emit helpers (encrypt when crypto session active) ────────────────────────

export async function emitTypingStart(channelId: string): Promise<void> {
  if (!socket) return;
  const payload = { channel_id: channelId };
  if (hasCryptoSession()) {
    socket.emit('typing:start', await cryptoEncrypt(payload));
  } else {
    socket.emit('typing:start', payload);
  }
}

export async function emitTypingStop(channelId: string): Promise<void> {
  if (!socket) return;
  const payload = { channel_id: channelId };
  if (hasCryptoSession()) {
    socket.emit('typing:stop', await cryptoEncrypt(payload));
  } else {
    socket.emit('typing:stop', payload);
  }
}

export async function emitPresenceUpdate(status: string): Promise<void> {
  if (!socket) return;
  const payload = { status };
  if (hasCryptoSession()) {
    socket.emit('presence:update', await cryptoEncrypt(payload));
  } else {
    socket.emit('presence:update', payload);
  }
}

export async function emitStatusCommentUpdate(
  text: string | null,
  emoji?: string | null,
  expiresAt?: string | null,
): Promise<void> {
  if (!socket) return;
  const payload = { text, emoji: emoji ?? null, expires_at: expiresAt ?? null };
  if (hasCryptoSession()) {
    socket.emit('status_comment:update', await cryptoEncrypt(payload));
  } else {
    socket.emit('status_comment:update', payload);
  }
}

export async function emitJoinDM(userId: string): Promise<void> {
  if (!socket) return;
  const payload = { user_id: userId };
  if (hasCryptoSession()) {
    socket.emit('join:dm', await cryptoEncrypt(payload));
  } else {
    socket.emit('join:dm', payload);
  }
}

export async function emitLeaveDM(userId: string): Promise<void> {
  if (!socket) return;
  const payload = { user_id: userId };
  if (hasCryptoSession()) {
    socket.emit('leave:dm', await cryptoEncrypt(payload));
  } else {
    socket.emit('leave:dm', payload);
  }
}

export async function emitDMAck(messageIds: string[]): Promise<void> {
  if (!socket) return;
  const payload = { message_ids: messageIds };
  if (hasCryptoSession()) {
    socket.emit('dm:ack', await cryptoEncrypt(payload));
  } else {
    socket.emit('dm:ack', payload);
  }
}

export async function emitVoiceActivity(): Promise<void> {
  if (!socket) return;
  if (hasCryptoSession()) {
    socket.emit('voice:activity', await cryptoEncrypt({}));
  } else {
    socket.emit('voice:activity', {});
  }
}

export async function emitActivityUpdate(activity: {
  type: string;
  name: string;
  details?: string | null;
  state?: string | null;
  started_at?: string | null;
  large_image_url?: string | null;
  small_image_url?: string | null;
}): Promise<void> {
  if (!socket) return;
  if (hasCryptoSession()) {
    socket.emit('activity:update', await cryptoEncrypt(activity));
  } else {
    socket.emit('activity:update', activity);
  }
}

export async function emitActivityClear(): Promise<void> {
  if (!socket) return;
  if (hasCryptoSession()) {
    socket.emit('activity:clear', await cryptoEncrypt({}));
  } else {
    socket.emit('activity:clear', {});
  }
}

export async function emitRaiseHand(channelId: string): Promise<void> {
  if (!socket) return;
  const payload = { channel_id: channelId };
  if (hasCryptoSession()) {
    socket.emit('voice:raiseHand', await cryptoEncrypt(payload));
  } else {
    socket.emit('voice:raiseHand', payload);
  }
}

export async function emitLowerHand(channelId: string): Promise<void> {
  if (!socket) return;
  const payload = { channel_id: channelId };
  if (hasCryptoSession()) {
    socket.emit('voice:lowerHand', await cryptoEncrypt(payload));
  } else {
    socket.emit('voice:lowerHand', payload);
  }
}
