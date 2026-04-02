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
import { cacheParticipantInfo, updateServerVoiceState, setServerMuted, setServerDeafened, handleForceMove, handleRelaySwitch, updateParticipantStatus } from '../lib/voiceService';
import { isDMConnected } from '../lib/dmVoiceService';
import {
  setKeyMaterial, encrypt as cryptoEncrypt, decrypt as cryptoDecrypt,
  isEncryptedEnvelope, hasActiveSession as hasCryptoSession,
  clearSession as clearCryptoSession, getSessionId,
} from '../lib/crypto';

import { activateSSE, deactivateSSE, isSSEActive } from '../lib/sseGateway';

const electronAPI = (window as any).electronAPI;

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let gatewaySessionId: string | null = null;
let lastSequences: Record<string, number> = {};
let unsubCryptoRefresh: (() => void) | null = null;

/** Monotonic timestamp of the last received event (ms since epoch). Used for resync. */
let lastEventTimestamp = 0;

/** Number of consecutive Socket.IO connection failures. */
let consecutiveSocketFailures = 0;

/** Threshold of Socket.IO failures before activating SSE fallback. */
const SSE_FALLBACK_THRESHOLD = 3;

// ── Timestamp tracking for resync ────────────────────────────────

/** Get the timestamp of the last successfully received event. */
export function getLastEventTimestamp(): number {
  return lastEventTimestamp;
}

/** Update the last event timestamp (called by SSE gateway too). */
export function setLastEventTimestamp(ts: number): void {
  if (ts > lastEventTimestamp) {
    lastEventTimestamp = ts;
  }
}

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

    // Socket.IO connected successfully — reset failure counter & deactivate SSE
    consecutiveSocketFailures = 0;
    if (isSSEActive()) {
      console.info('[socket] Socket.IO reconnected — deactivating SSE fallback');
      deactivateSSE();
    }

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
    // Trigger initial data refetch — catch to prevent unhandled rejections
    // when active queries fail (e.g. 403 "not a member" on server endpoints)
    queryClient.invalidateQueries().catch(() => {});
    // Load blocked/ignored user lists
    blockedUsersStore.fetchBlocked();
    ignoredUsersStore.fetchIgnored();
    // Load sound settings
    soundService.loadSettings();
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

    // Refresh member presence data to avoid stale online status after resume.
    // The missed_events replay may not include all presence changes, and the DB
    // may have updated statuses during the disconnect window.
    queryClient.invalidateQueries({ queryKey: ['members'] }).catch(() => {});
  });

  socket.on('gateway.resume_failed', async (rawData: any) => {
    const data = isEncryptedEnvelope(rawData) && hasCryptoSession()
      ? await cryptoDecrypt(rawData) : rawData;

    console.warn('[socket] Gateway resume failed:', data.reason, data.message);
    // Clear stale session and do a full reconnect
    gatewaySessionId = null;
    lastSequences = {};
    // Clear stale presence — will be re-seeded from fresh member data
    usePresenceStore.getState().clearAll();
    // Catch to prevent unhandled rejections from failing query refetches
    queryClient.invalidateQueries().catch(() => {});
  });

  socket.on('event', async (envelope: {
    type: string;
    payload: any;
    sequence: number;
    resource_id?: string;
    timestamp?: number;
  }) => {
    // Track per-resource sequences
    if (envelope.resource_id) {
      lastSequences[envelope.resource_id] = envelope.sequence;
    }

    // Track event timestamp for resync
    if (envelope.timestamp) {
      setLastEventTimestamp(envelope.timestamp);
    } else {
      setLastEventTimestamp(Date.now());
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
    consecutiveSocketFailures++;

    // Activate SSE fallback after repeated failures
    if (consecutiveSocketFailures >= SSE_FALLBACK_THRESHOLD && !isSSEActive()) {
      console.warn(
        `[socket] ${consecutiveSocketFailures} consecutive failures — activating SSE fallback`,
      );
      activateSSE();
    }

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

    // Clear presence data on disconnect — will be refreshed on reconnect
    usePresenceStore.getState().clearAll();

    // Try to resume on reconnect
    if (reason !== 'io client disconnect') {
      socket?.once('connect', () => {
        socket?.emit('gateway.resume', {
          session_id: gatewaySessionId,
          last_sequences: lastSequences,
        });

        // Resync missed events via REST if we have a timestamp reference
        resyncMissedEvents();
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

/**
 * Fetch events missed during disconnection via REST endpoint.
 * Requires server endpoint: GET /api/events/since?timestamp={ms}
 * Falls back silently if the endpoint does not exist.
 */
async function resyncMissedEvents(): Promise<void> {
  if (lastEventTimestamp <= 0) return;

  try {
    const res = await electronAPI.api.request(
      'GET',
      `/api/events/since?timestamp=${lastEventTimestamp}`,
    );

    if (!res.ok || !Array.isArray(res.data)) return;

    for (const envelope of res.data as Array<{
      type: string;
      payload: unknown;
      timestamp?: number;
    }>) {
      if (envelope.timestamp) {
        setLastEventTimestamp(envelope.timestamp);
      }
      handleEvent(envelope.type, envelope.payload);
    }
  } catch {
    // Endpoint may not exist yet — fail silently
    console.debug('[socket] Event resync endpoint not available');
  }
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
  // Shut down SSE fallback if active
  deactivateSSE();
  consecutiveSocketFailures = 0;

  if (socket) {
    socket.disconnect();
    socket = null;
  }
  gatewaySessionId = null;
  lastSequences = {};
  lastEventTimestamp = 0;
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

/** Route a realtime event to the appropriate store/cache handler.
 *  Exported so the SSE fallback gateway can dispatch events through the same path. */
export function handleEvent(type: string, data: any): void {
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
        // Also increment server-level unreads
        if (data.server_id) {
          useUnreadStore.getState().incrementServer(data.server_id, isMention || isEveryone);
        }
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
      if (!data.conversation_id) break;
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      // Track DM unread + toast for non-active conversation
      const currentView = useUIStore.getState().view;
      const isActiveDM = currentView === 'dms' && useUIStore.getState().activeDMId === data.conversation_id;
      if (!isActiveDM) {
        useUnreadStore.getState().incrementDM(data.conversation_id);
        const dmAuthor = data.author?.username || 'Someone';
        const dmContent = data.is_encrypted ? 'Encrypted message' : (data.content?.slice(0, 80) || '');
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
            ? `You were timed out in ${data.server_name || 'the server'}: ${data.reason}`
            : `You were timed out in ${data.server_name || 'the server'}`,
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
      queryClient.invalidateQueries({ queryKey: ['members'] });
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
      queryClient.invalidateQueries({ queryKey: ['members'] });
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
      // Play the sound via soundService for consistent volume handling
      if (data.sound_url) {
        soundService.playUrl(data.sound_url);
      }
      break;
    }
    case 'soundboard.added':
    case 'soundboard.removed':
      // Scope invalidation to the specific server's soundboard query
      if (data.server_id) {
        queryClient.invalidateQueries({ queryKey: ['soundboard', data.server_id] });
      } else {
        // Fallback: invalidate all soundboard queries
        queryClient.invalidateQueries({ queryKey: ['soundboard'] });
      }
      break;

    // User blocking
    case 'user.block':
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      break;
    case 'user.unblock':
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      break;

    // Presence — update Zustand directly (ephemeral)
    case 'presence.update':
      if (!data.user_id) break;
      usePresenceStore.getState().updatePresence(data.user_id, data.status);
      // presence.update may include activity
      if ('activity' in data) {
        useActivityStore.getState().updateActivity(data.user_id, data.activity || null);
      }
      break;
    case 'status_comment.update':
      if (!data.user_id) break;
      usePresenceStore.getState().updateStatusComment(data.user_id, data.status_comment);
      break;

    // Activity / Rich Presence
    case 'activity.update':
      if (!data.user_id) break;
      useActivityStore.getState().updateActivity(data.user_id, data.activity || null);
      break;

    // Typing — update Zustand directly (ephemeral)
    // Server sends channel typing as { channel_id, user: { id, username, display_name } }
    case 'typing.start': {
      const uid = data.user?.id || data.user_id;
      if (!data.channel_id || !uid) break;
      useTypingStore.getState().addTyping(
        data.channel_id,
        uid,
        data.user?.username || data.username || 'Someone',
      );
      break;
    }
    case 'typing.stop': {
      const uid = data.user?.id || data.user_id;
      if (!data.channel_id || !uid) break;
      useTypingStore.getState().removeTyping(data.channel_id, uid);
      break;
    }
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
      if (data.is_dm_call && data.dm_channel_id && data.user?.id && !isSelf) {
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
        // Update voice status if present
        if (typeof data.voice_status === 'string') {
          updateParticipantStatus(data.user_id, data.voice_status);
        }
      }
      break;
    }
    case 'voice.force_move': {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.connected && data.to_channel_id) {
        handleForceMove(data.to_channel_id, data.to_channel_name).then(() => {
          // Update store state to reflect the new channel
          voiceStore.join(data.to_channel_id, data.to_channel_name);
        });
        // Show toast with reason
        const reasonMap: Record<string, string> = {
          afk: 'You were moved to the AFK channel due to inactivity',
          moderator: `A moderator moved you to ${data.to_channel_name || 'another channel'}`,
          temp_channel: 'Your temporary channel was deleted',
        };
        const message = reasonMap[data.reason as string] || `You were moved to ${data.to_channel_name || 'another channel'}`;
        toastStore.addToast({ type: 'system', title: 'Moved', message });
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
    case 'voice.relay_switch': {
      // Server instructs us to reconnect via a different relay
      const voiceStoreRS = useVoiceStore.getState();
      if (voiceStoreRS.connected && data.channel_id) {
        handleRelaySwitch(data.channel_id).then(() => {
          voiceStoreRS.join(data.channel_id, data.channel_name);
        });
        toastStore.addToast({
          type: 'system',
          title: 'Relay Switch',
          message: `Reconnecting to ${data.relay_name || 'a new relay server'}...`,
        });
      }
      break;
    }
    case 'voice.server_mute': {
      // A moderator muted/unmuted the current user — enforce locally
      const myId = useAuthStore.getState().user?.id;
      if (myId) {
        updateServerVoiceState(myId, { isServerMuted: data.muted });
        setServerMuted(data.muted);
      }
      break;
    }
    case 'voice.server_deafen': {
      // A moderator deafened/undeafened the current user — enforce locally
      const myId2 = useAuthStore.getState().user?.id;
      if (myId2) {
        updateServerVoiceState(myId2, { isServerDeafened: data.deafened });
        setServerDeafened(data.deafened);
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
