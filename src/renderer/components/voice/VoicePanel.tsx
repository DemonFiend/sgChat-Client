import { useState, useEffect } from 'react';
import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconHeadphones, IconHeadphonesOff,
  IconScreenShare, IconScreenShareOff,
  IconPhoneOff, IconWifi, IconWifiOff,
  IconMusic, IconAlertTriangle,
} from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { SoundboardPanel } from '../ui/SoundboardPanel';

const QUALITY_COLORS: Record<string, { rgb: string; hex: string }> = {
  excellent: { rgb: '74,222,128', hex: '#4ade80' },
  good: { rgb: '59,130,246', hex: '#3b82f6' },
  poor: { rgb: '245,158,11', hex: '#f59e0b' },
  lost: { rgb: '239,68,68', hex: '#ef4444' },
};

const QUALITY_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  poor: 'Poor',
  lost: 'Disconnected',
};

export function VoicePanel() {
  const connected = useVoiceStore((s) => s.connected);
  const connectionState = useVoiceStore((s) => s.connectionState);
  const channelName = useVoiceStore((s) => s.channelName);
  const muted = useVoiceStore((s) => s.muted);
  const deafened = useVoiceStore((s) => s.deafened);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleDeafen = useVoiceStore((s) => s.toggleDeafen);
  const leave = useVoiceStore((s) => s.leave);
  const toggleScreenShare = useVoiceStore((s) => s.toggleScreenShare);
  const isSharing = useVoiceStore((s) => s.screenShare.isSharing);
  const canStream = useVoiceStore((s) => s.permissions?.canStream ?? false);
  const qualityLevel = useVoiceStore((s) => s.connectionQuality.quality);
  const ping = useVoiceStore((s) => s.connectionQuality.ping);
  const error = useVoiceStore((s) => s.error);
  const initListeners = useVoiceStore((s) => s.initListeners);
  const [soundboardOpen, setSoundboardOpen] = useState(false);

  // Initialize voice event listeners (quality polling, participant updates, reconnection)
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  if (!connected && connectionState !== 'connecting' && connectionState !== 'reconnecting' && connectionState !== 'error') {
    return null;
  }

  // Error state — show error message with disconnect button
  if (connectionState === 'error') {
    return (
      <div style={{
        background: 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, var(--bg-tertiary) 100%)',
        borderTop: '1px solid var(--border)',
        padding: '12px 8px 8px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <IconAlertTriangle size={20} style={{ color: '#ef4444' }} />
          <Text size="xs" fw={600} style={{ color: '#ef4444' }}>Connection Failed</Text>
          <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 180 }}>
            {error || 'Could not connect to voice channel'}
          </Text>
          <Tooltip label="Dismiss" position="top" withArrow>
            <ActionIcon variant="filled" color="red" size={28} radius="xl" onClick={leave} mt={4}>
              <IconPhoneOff size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>
    );
  }

  const statusLabel =
    connectionState === 'connecting' ? 'Connecting...' :
    connectionState === 'reconnecting' ? 'Reconnecting...' :
    'Voice Connected';

  const q = QUALITY_COLORS[qualityLevel] || QUALITY_COLORS.excellent;
  const qLabel = QUALITY_LABELS[qualityLevel] || 'Unknown';

  return (
    <div style={{
      background: `linear-gradient(180deg, rgba(${q.rgb},0.08) 0%, var(--bg-tertiary) 100%)`,
      borderTop: '1px solid var(--border)',
      padding: '12px 8px 8px',
      flexShrink: 0,
      transition: 'background 0.5s ease',
    }}>
      {/* Orb + Status */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <Tooltip label={`Connection: ${qLabel}`} position="top" withArrow>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `rgba(${q.rgb}, 0.15)`,
            boxShadow: `0 0 12px rgba(${q.rgb}, 0.25)`,
            transition: 'box-shadow 0.5s ease, background 0.5s ease',
          }}>
            {qualityLevel === 'lost' ? (
              <IconWifiOff size={18} style={{ color: q.hex }} />
            ) : (
              <IconWifi size={18} style={{ color: q.hex }} />
            )}
          </div>
        </Tooltip>

        <Text size="xs" fw={600} style={{ color: q.hex }}>
          {statusLabel}
        </Text>

        {channelName && (
          <Group gap={6} justify="center">
            <Text size="xs" c="dimmed" truncate style={{ maxWidth: 160 }}>
              {channelName}
            </Text>
            {connected && (
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                {ping}ms
              </Text>
            )}
          </Group>
        )}
      </div>

      {/* Glass pill controls */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(8px)',
        borderRadius: 20,
        padding: '4px 8px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
      }}>
        <Group gap={4} justify="center">
          <Tooltip label={muted ? 'Unmute' : 'Mute'} position="top" withArrow>
            <ActionIcon
              variant={muted ? 'filled' : 'subtle'}
              color={muted ? 'red' : 'gray'}
              size={28}
              radius="xl"
              onClick={toggleMute}
            >
              {muted ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label={deafened ? 'Undeafen' : 'Deafen'} position="top" withArrow>
            <ActionIcon
              variant={deafened ? 'filled' : 'subtle'}
              color={deafened ? 'red' : 'gray'}
              size={28}
              radius="xl"
              onClick={toggleDeafen}
            >
              {deafened ? <IconHeadphonesOff size={16} /> : <IconHeadphones size={16} />}
            </ActionIcon>
          </Tooltip>

          {canStream && (
            <Tooltip label={isSharing ? 'Stop Sharing' : 'Share Screen'} position="top" withArrow>
              <ActionIcon
                variant={isSharing ? 'filled' : 'subtle'}
                color={isSharing ? 'green' : 'gray'}
                size={28}
                radius="xl"
                onClick={toggleScreenShare}
              >
                {isSharing ? <IconScreenShareOff size={16} /> : <IconScreenShare size={16} />}
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label="Soundboard" position="top" withArrow>
            <ActionIcon
              variant={soundboardOpen ? 'filled' : 'subtle'}
              color={soundboardOpen ? 'brand' : 'gray'}
              size={28}
              radius="xl"
              onClick={() => setSoundboardOpen(!soundboardOpen)}
            >
              <IconMusic size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Disconnect" position="top" withArrow>
            <ActionIcon variant="filled" color="red" size={28} radius="xl" onClick={leave}>
              <IconPhoneOff size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SoundboardPanel opened={soundboardOpen} onClose={() => setSoundboardOpen(false)} />
      </div>

      {/* Quality bar */}
      <div style={{
        height: 2,
        borderRadius: 1,
        background: q.hex,
        marginTop: 8,
        transition: 'background 0.5s ease',
        opacity: 0.6,
      }} />
    </div>
  );
}
