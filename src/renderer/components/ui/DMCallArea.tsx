import { useEffect, useRef, useState } from 'react';
import { Avatar, Group, Stack, Text } from '@mantine/core';
import { useVoiceStore } from '../../stores/voiceStore';
import { onDMVoiceEvent, type DMVoiceParticipant } from '../../lib/dmVoiceService';
import { useAuthStore } from '../../stores/authStore';

interface DMCallAreaProps {
  dmChannelId: string;
  friendName: string;
  friendAvatarUrl?: string | null;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
}

export function DMCallArea({
  dmChannelId,
  friendName,
  friendAvatarUrl,
  currentUserAvatarUrl,
  currentUserDisplayName,
}: DMCallAreaProps) {
  const dmCallPhase = useVoiceStore((s) => s.dmCallPhase);
  const remoteParticipantLeft = useVoiceStore((s) => s.remoteParticipantLeft);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Call duration timer
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id);

  // Track speaking state for voice activity indicators
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  useEffect(() => {
    const cleanup = onDMVoiceEvent((event: string, data: any) => {
      if (event === 'participant-update' && Array.isArray(data)) {
        const local = data.find((p: DMVoiceParticipant) => p.userId === currentUserId);
        const remote = data.find((p: DMVoiceParticipant) => p.userId !== currentUserId);
        setLocalSpeaking(local?.isSpeaking ?? false);
        setRemoteSpeaking(remote?.isSpeaking ?? false);
      }
    });
    return cleanup;
  }, [currentUserId]);

  // Use store state (not isDMConnected()) so React re-renders when call phase changes
  const isInDMCall = dmCallPhase !== 'idle';

  useEffect(() => {
    if (dmCallPhase === 'connected' && !remoteParticipantLeft) {
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (dmCallPhase === 'idle') {
        setCallDuration(0);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dmCallPhase, remoteParticipantLeft]);

  if (!isInDMCall) return null;

  const isWaiting = dmCallPhase === 'notifying' || dmCallPhase === 'waiting';
  const isConnectedWithFriend = dmCallPhase === 'connected' && !remoteParticipantLeft;
  const friendLeft = remoteParticipantLeft;

  // Determine status text and colors
  let callStatusText: string;
  let accentColor: string;
  let dotColor: string;

  if (friendLeft) {
    callStatusText = `${friendName} left the call`;
    accentColor = 'var(--danger)';
    dotColor = 'var(--danger)';
  } else if (dmCallPhase === 'notifying') {
    callStatusText = `Notifying ${friendName}...`;
    accentColor = '#fab005';
    dotColor = '#fab005';
  } else if (dmCallPhase === 'waiting') {
    callStatusText = `Waiting for ${friendName}...`;
    accentColor = '#fab005';
    dotColor = '#fab005';
  } else {
    callStatusText = `Connected`;
    accentColor = 'var(--online)';
    dotColor = 'var(--online)';
  }

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <style>{`
        @keyframes dmCallPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes dmCallDotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes dmSpeakingGlow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(74,222,128,0.6); }
          50% { box-shadow: 0 0 8px 3px rgba(74,222,128,0.4); }
        }
      `}</style>

      <Stack align="center" gap={12}>
        {/* Avatar display */}
        <Group gap={16} align="center">
          {/* Local user avatar */}
          <Stack align="center" gap={4}>
            <div
              style={{
                borderRadius: '50%',
                transition: 'box-shadow 0.2s',
                ...(localSpeaking && isConnectedWithFriend
                  ? { animation: 'dmSpeakingGlow 1s ease-in-out infinite' }
                  : isWaiting
                    ? {
                        boxShadow: `0 0 0 2px ${dotColor}40`,
                        animation: 'dmCallPulse 2s ease-in-out infinite',
                      }
                    : {}),
              }}
            >
              <Avatar src={currentUserAvatarUrl} size={56} radius="xl" color={localSpeaking && isConnectedWithFriend ? 'green' : 'brand'}>
                {(currentUserDisplayName || 'You').charAt(0).toUpperCase()}
              </Avatar>
            </div>
            <Text size="xs" c="var(--text-muted)">You</Text>
          </Stack>

          {/* Connection dots */}
          <Group gap={4}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: friendLeft ? `${dotColor}60` : dotColor,
                  ...(isWaiting || isConnectedWithFriend
                    ? {
                        animation: 'dmCallDotPulse 1.5s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }
                    : {}),
                }}
              />
            ))}
          </Group>

          {/* Friend avatar */}
          <Stack align="center" gap={4}>
            <div
              style={{
                borderRadius: '50%',
                transition: 'opacity 0.3s, box-shadow 0.2s',
                opacity: friendLeft ? 0.4 : 1,
                ...(remoteSpeaking && isConnectedWithFriend
                  ? { animation: 'dmSpeakingGlow 1s ease-in-out infinite' }
                  : isConnectedWithFriend
                    ? { boxShadow: `0 0 0 2px ${dotColor}60` }
                    : {}),
              }}
            >
              <Avatar src={friendAvatarUrl} size={56} radius="xl" color={remoteSpeaking && isConnectedWithFriend ? 'green' : 'brand'}>
                {friendName.charAt(0).toUpperCase()}
              </Avatar>
            </div>
            <Text
              size="xs"
              c={friendLeft ? 'var(--danger)' : 'var(--text-muted)'}
              style={{ opacity: friendLeft ? 0.6 : 1 }}
            >
              {friendName}
            </Text>
          </Stack>
        </Group>

        {/* Status text */}
        <Group gap={8} align="center">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: accentColor,
              ...(isWaiting || isConnectedWithFriend
                ? { animation: 'dmCallDotPulse 1.5s ease-in-out infinite' }
                : {}),
            }}
          />
          <Text size="sm" fw={500} c={accentColor}>
            {callStatusText}
          </Text>
          {isConnectedWithFriend && callDuration > 0 && (
            <Text size="xs" c="var(--text-muted)">
              {formatDuration(callDuration)}
            </Text>
          )}
        </Group>
      </Stack>

      {/* Hidden video refs for future video support */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      <div ref={remoteVideoRef} style={{ display: 'none' }} />
    </div>
  );
}
