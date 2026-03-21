import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useUIStore } from '../../stores/uiStore';
import { joinDMVoice } from '../../lib/dmVoiceService';
import { IncomingCallNotification } from './IncomingCallNotification';
import { toastStore } from '../../stores/toastNotifications';

/**
 * Global overlay that shows an IncomingCallNotification when a DM call
 * is received. Socket-level detection is handled in socket.ts handleEvent
 * (voice.join / voice.leave with is_dm_call flag), which sets
 * voiceStore.incomingDMCall. This component purely reacts to that state.
 */
export function GlobalIncomingCall() {
  const incomingCall = useVoiceStore((s) => s.incomingDMCall);
  const voiceConnectionState = useVoiceStore((s) => s.connectionState);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;

    // Store pending info so DMChatPanel can show the call area
    useVoiceStore.getState().setPendingDMCallInfo({
      friendId: incomingCall.callerId,
      friendName: incomingCall.callerName,
      dmChannelId: incomingCall.dmChannelId,
    });

    try {
      const result = await joinDMVoice(incomingCall.dmChannelId);
      if (!result.success) {
        toastStore.addToast({
          type: 'warning',
          title: 'Call Failed',
          message: result.error || 'Could not join call',
        });
      }
    } catch (err) {
      console.error('[GlobalIncomingCall] Failed to accept call:', err);
    }

    useVoiceStore.getState().setIncomingDMCall(null);

    // Navigate to the DM view
    useUIStore.getState().setActiveDM(incomingCall.dmChannelId);
  }, [incomingCall]);

  const handleDecline = useCallback(() => {
    useVoiceStore.getState().setIncomingDMCall(null);
  }, []);

  // Clear incoming call if user joins a call from elsewhere
  useEffect(() => {
    if (voiceConnectionState === 'connected' && incomingCall) {
      useVoiceStore.getState().setIncomingDMCall(null);
    }
  }, [voiceConnectionState, incomingCall]);

  if (!incomingCall) return null;

  return (
    <IncomingCallNotification
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
