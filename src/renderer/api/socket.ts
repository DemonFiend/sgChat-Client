import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { usePresenceStore } from '../stores/presenceStore';
import { useTypingStore } from '../stores/typingStore';
import { useVoiceStore } from '../stores/voiceStore';

const electronAPI = (window as any).electronAPI;

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastSequence = 0;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<void> {
  if (socket?.connected) return;

  const { token, serverUrl } = await electronAPI.auth.getSocketToken();
  if (!token || !serverUrl) return;

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('gateway.hello', (data: { heartbeat_interval: number }) => {
    // Start heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket?.emit('gateway.heartbeat');
    }, data.heartbeat_interval);
  });

  socket.on('gateway.ready', (data: any) => {
    lastSequence = data.sequence || 0;
    // Trigger initial data refetch
    queryClient.invalidateQueries();
  });

  socket.on('event', (envelope: { type: string; data: any; sequence: number }) => {
    lastSequence = envelope.sequence;
    handleEvent(envelope.type, envelope.data);
  });

  socket.on('connect_error', async (err: Error) => {
    if (err.message === 'jwt expired' || err.message?.includes('jwt')) {
      const result = await electronAPI.auth.refreshToken();
      if (result.success) {
        socket!.auth = { token: result.token };
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
        socket?.emit('gateway.resume', { sequence: lastSequence });
      });
    }
  });
}

export function disconnectSocket(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  lastSequence = 0;
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
      // Someone joined a voice channel — refresh channel member display
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;
    case 'voice.leave':
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      break;
    case 'voice.state_update':
      // Remote participant mute/deafen state changed — voiceService handles
      // LiveKit track events directly, but we can force a participant refresh
      break;
    case 'voice.force_move': {
      // Server is forcing us to move to a different voice channel
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

// Emit helpers
export function emitTypingStart(channelId: string): void {
  socket?.emit('typing:start', { channel_id: channelId });
}

export function emitTypingStop(channelId: string): void {
  socket?.emit('typing:stop', { channel_id: channelId });
}

export function emitPresenceUpdate(status: string): void {
  socket?.emit('presence:update', { status });
}
