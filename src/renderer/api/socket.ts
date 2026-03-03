import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { usePresenceStore } from '../stores/presenceStore';
import { useTypingStore } from '../stores/typingStore';
import { useVoiceStore } from '../stores/voiceStore';
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

function handleEvent(type: string, data: any): void {
  switch (type) {
    // Messages — invalidate query cache
    case 'message.new':
    case 'message.update':
    case 'message.delete':
      queryClient.invalidateQueries({ queryKey: ['messages', data.channel_id] });
      break;

    // DM messages
    case 'dm.message.new':
    case 'dm.message.update':
    case 'dm.message.delete':
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      break;

    // Channels
    case 'channel.create':
    case 'channel.update':
    case 'channel.delete':
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;

    // Members
    case 'member.join':
    case 'member.leave':
    case 'member.update':
      queryClient.invalidateQueries({ queryKey: ['members'] });
      break;

    // Friends
    case 'friend.request.new':
    case 'friend.request.accepted':
    case 'friend.removed':
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      break;

    // Presence — update Zustand directly (ephemeral)
    case 'presence.update':
      usePresenceStore.getState().updatePresence(data.user_id, data.status);
      break;
    case 'status_comment.update':
      usePresenceStore.getState().updateStatusComment(data.user_id, data.status_comment);
      break;

    // Typing — update Zustand directly (ephemeral)
    case 'typing.start':
      useTypingStore.getState().addTyping(data.channel_id, data.user_id, data.username);
      break;
    case 'typing.stop':
      useTypingStore.getState().removeTyping(data.channel_id, data.user_id);
      break;
    case 'dm.typing.start':
      useTypingStore.getState().addTyping(`dm:${data.conversation_id}`, data.user_id, data.username);
      break;
    case 'dm.typing.stop':
      useTypingStore.getState().removeTyping(`dm:${data.conversation_id}`, data.user_id);
      break;

    // Voice — update voice store + query cache
    case 'voice.join':
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;
    case 'voice.leave':
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;
    case 'voice.state_update':
      break;
    case 'voice.force_move': {
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.connected) {
        voiceStore.leave().then(() => {
          if (data.channel_id) {
            voiceStore.join(data.channel_id);
          }
        });
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
