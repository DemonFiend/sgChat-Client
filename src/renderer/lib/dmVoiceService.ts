import { Room, RoomEvent, Track } from 'livekit-client';
import { api } from './api';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { noiseSuppressionService } from './noiseSuppressionService';

let dmRoom: Room | null = null;

export interface DMVoiceParticipant {
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

type DMVoiceCallback = (event: string, data: any) => void;
let dmEventCallback: DMVoiceCallback | null = null;

export function onDMVoiceEvent(cb: DMVoiceCallback): () => void {
  dmEventCallback = cb;
  return () => { dmEventCallback = null; };
}

function emit(event: string, data: any) {
  dmEventCallback?.(event, data);
}

export async function joinDMVoice(dmChannelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.post<{
      livekit_token: string;
      livekit_url: string;
    }>(`/api/voice/dm/join/${dmChannelId}`);

    const voiceSettings = useVoiceSettingsStore.getState();
    const useAiNs = voiceSettings.aiNoiseSuppression && noiseSuppressionService.checkCapabilities().supported;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        deviceId: voiceSettings.inputDevice !== 'default' ? voiceSettings.inputDevice : undefined,
        autoGainControl: voiceSettings.autoGainControl,
        echoCancellation: voiceSettings.echoCancellation,
        noiseSuppression: useAiNs ? false : voiceSettings.noiseSuppression,
      },
      audioOutput: {
        deviceId: voiceSettings.outputDevice !== 'default' ? voiceSettings.outputDevice : undefined,
      },
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const element = track.attach();
        document.body.appendChild(element);
        element.style.display = 'none';
      }
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
      emit('participant-update', dmRoom ? getDMParticipants(dmRoom) : []);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.ActiveSpeakersChanged, () => {
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.Disconnected, () => {
      emit('disconnected', null);
      dmRoom = null;
    });

    await room.connect(response.livekit_url, response.livekit_token);

    if (useAiNs) {
      try {
        await noiseSuppressionService.loadModel();
        const rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: voiceSettings.inputDevice !== 'default' ? { exact: voiceSettings.inputDevice } : undefined,
            autoGainControl: voiceSettings.autoGainControl,
            echoCancellation: voiceSettings.echoCancellation,
            noiseSuppression: false,
          },
        });
        const cleanStream = await noiseSuppressionService.processOutboundTrack(rawStream);
        const cleanTrack = cleanStream.getAudioTracks()[0];
        await room.localParticipant.publishTrack(cleanTrack, {
          source: Track.Source.Microphone,
        });
        console.log('[DMVoiceService] Microphone enabled with AI noise suppression');
      } catch (nsErr) {
        console.warn('[DMVoiceService] AI NS failed, falling back to browser NS:', nsErr);
        await room.localParticipant.setMicrophoneEnabled(true);
      }
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
    }

    dmRoom = room;
    emit('connected', { dmChannelId });
    emit('participant-update', getDMParticipants(room));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join DM voice' };
  }
}

export async function leaveDMVoice(): Promise<void> {
  if (dmRoom) {
    await noiseSuppressionService.destroy();
    dmRoom.disconnect();
    dmRoom = null;
    emit('disconnected', null);
  }
}

export async function toggleDMMute(): Promise<boolean> {
  if (!dmRoom) return false;
  const enabled = dmRoom.localParticipant.isMicrophoneEnabled;
  await dmRoom.localParticipant.setMicrophoneEnabled(!enabled);
  emit('participant-update', getDMParticipants(dmRoom));
  return !enabled;
}

export function isDMConnected(): boolean {
  return dmRoom !== null && dmRoom.state === 'connected';
}

function getDMParticipants(room: Room): DMVoiceParticipant[] {
  const participants: DMVoiceParticipant[] = [];

  const local = room.localParticipant;
  participants.push({
    userId: local.identity,
    username: local.name || local.identity,
    isMuted: !local.isMicrophoneEnabled,
    isSpeaking: local.isSpeaking,
  });

  room.remoteParticipants.forEach((p) => {
    participants.push({
      userId: p.identity,
      username: p.name || p.identity,
      isMuted: !p.isMicrophoneEnabled,
      isSpeaking: p.isSpeaking,
    });
  });

  return participants;
}
