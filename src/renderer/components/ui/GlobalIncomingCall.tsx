import { useEffect, useCallback, useRef } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useUIStore } from '../../stores/uiStore';
import { joinDMVoice, toggleDMDeafen } from '../../lib/dmVoiceService';
import { IncomingCallNotification } from './IncomingCallNotification';
import { toastStore } from '../../stores/toastNotifications';

const electronAPI = (window as any).electronAPI;

/**
 * Global overlay that shows an IncomingCallNotification when a DM call
 * is received. Socket-level detection is handled in socket.ts handleEvent
 * (voice.join / voice.leave with is_dm_call flag), which sets
 * voiceStore.incomingDMCall. This component purely reacts to that state.
 */
export function GlobalIncomingCall() {
  const incomingCall = useVoiceStore((s) => s.incomingDMCall);
  const voiceConnectionState = useVoiceStore((s) => s.connectionState);

  // Track whether the user explicitly dismissed (accept/decline) vs caller-cancelled
  const userDismissedRef = useRef(false);
  const prevCallRef = useRef(incomingCall);

  // Fire Electron native notification + flash frame when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      userDismissedRef.current = false;
      electronAPI?.showNotification?.('Incoming Call', `${incomingCall.callerName} is calling you`);
      electronAPI?.flashFrame?.(true);
    }
  }, [incomingCall]);

  // Detect caller-cancelled: incomingCall went null without user action
  useEffect(() => {
    if (prevCallRef.current && !incomingCall && !userDismissedRef.current) {
      // Caller hung up before we answered
      const callerName = prevCallRef.current.callerName;
      toastStore.addToast({
        type: 'system',
        title: 'Missed Call',
        message: `${callerName} cancelled the call`,
      });
      electronAPI?.showNotification?.('Missed Call', `${callerName} cancelled the call`);
      electronAPI?.flashFrame?.(false);
    }
    prevCallRef.current = incomingCall;
  }, [incomingCall]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    userDismissedRef.current = true;

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
    electronAPI?.flashFrame?.(false);

    // Navigate to the DM view
    useUIStore.getState().setActiveDM(incomingCall.dmChannelId);
  }, [incomingCall]);

  const handleAcceptDeafened = useCallback(async () => {
    if (!incomingCall) return;
    userDismissedRef.current = true;

    useVoiceStore.getState().setPendingDMCallInfo({
      friendId: incomingCall.callerId,
      friendName: incomingCall.callerName,
      dmChannelId: incomingCall.dmChannelId,
    });

    try {
      const result = await joinDMVoice(incomingCall.dmChannelId);
      if (result.success) {
        // Deafen after joining
        await toggleDMDeafen(true);
      } else {
        toastStore.addToast({
          type: 'warning',
          title: 'Call Failed',
          message: result.error || 'Could not join call',
        });
      }
    } catch (err) {
      console.error('[GlobalIncomingCall] Failed to accept call (deafened):', err);
    }

    useVoiceStore.getState().setIncomingDMCall(null);
    electronAPI?.flashFrame?.(false);
    useUIStore.getState().setActiveDM(incomingCall.dmChannelId);
  }, [incomingCall]);

  const handleDecline = useCallback((reason?: 'manual' | 'timeout') => {
    userDismissedRef.current = true;

    if (incomingCall && reason === 'timeout') {
      // 30s timeout — caller is still waiting, show two notifications
      toastStore.addToast({
        type: 'system',
        title: 'Incoming Call',
        message: `${incomingCall.callerName} called you`,
      });
      toastStore.addToast({
        type: 'system',
        title: 'Waiting For You',
        message: `${incomingCall.callerName} is waiting for you in a call`,
        duration: 8000,
      });
      electronAPI?.showNotification?.('Missed Call', `${incomingCall.callerName} is waiting for you`);
    }
    useVoiceStore.getState().setIncomingDMCall(null);
    electronAPI?.flashFrame?.(false);
  }, [incomingCall]);

  // Clear incoming call if user joins a call from elsewhere
  useEffect(() => {
    if (voiceConnectionState === 'connected' && incomingCall) {
      userDismissedRef.current = true;
      useVoiceStore.getState().setIncomingDMCall(null);
    }
  }, [voiceConnectionState, incomingCall]);

  if (!incomingCall) return null;

  return (
    <IncomingCallNotification
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      onAccept={handleAccept}
      onAcceptDeafened={handleAcceptDeafened}
      onDecline={handleDecline}
    />
  );
}
