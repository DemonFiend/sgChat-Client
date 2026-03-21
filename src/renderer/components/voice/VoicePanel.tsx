import { useState, useEffect, useRef } from 'react';
import { ActionIcon, Group, Text, TextInput, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconHeadphones, IconHeadphonesOff,
  IconPhoneOff, IconWifi, IconWifiOff,
  IconMusic, IconAlertTriangle, IconPencil,
} from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { getSocket } from '../../api/socket';
import { ScreenShareButton } from '../ui/ScreenShareButton';
import { SoundboardPanel } from '../ui/SoundboardPanel';
import { StageControls } from './StageControls';

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
  const qualityLevel = useVoiceStore((s) => s.connectionQuality.quality);
  const ping = useVoiceStore((s) => s.connectionQuality.ping);
  const error = useVoiceStore((s) => s.error);
  const initListeners = useVoiceStore((s) => s.initListeners);
  const qualityStabilized = useVoiceStore((s) => s.qualityStabilized);
  const channelType = useVoiceStore((s) => s.channelType);
  const isSpeaker = useVoiceStore((s) => s.isSpeaker);
  const isHandRaised = useVoiceStore((s) => s.isHandRaised);
  const raiseHand = useVoiceStore((s) => s.raiseHand);
  const lowerHand = useVoiceStore((s) => s.lowerHand);
  const [soundboardOpen, setSoundboardOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const statusInputRef = useRef<HTMLInputElement>(null);

  // Initialize voice event listeners (quality polling, participant updates, reconnection)
  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingStatus) {
      statusInputRef.current?.focus();
    }
  }, [editingStatus]);

  const handleStatusEditStart = () => {
    setStatusDraft(voiceStatus);
    setEditingStatus(true);
  };

  const handleStatusSave = () => {
    const trimmed = statusDraft.trim();
    setVoiceStatus(trimmed);
    setEditingStatus(false);
    getSocket()?.emit('voice:setStatus', { status: trimmed });
  };

  const handleStatusCancel = () => {
    setEditingStatus(false);
    setStatusDraft('');
  };

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
    !qualityStabilized ? 'Connecting...' :
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

        {/* Voice status — click to edit */}
        {editingStatus ? (
          <TextInput
            ref={statusInputRef}
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStatusSave();
              if (e.key === 'Escape') handleStatusCancel();
            }}
            onBlur={handleStatusSave}
            placeholder="Set a voice status..."
            size="xs"
            styles={{
              input: {
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                fontSize: '0.7rem',
                height: 24,
                textAlign: 'center',
              },
            }}
            style={{ maxWidth: 180, margin: '0 auto' }}
          />
        ) : (
          <Tooltip label="Click to set voice status" position="top" withArrow>
            <Group
              gap={4}
              justify="center"
              style={{ cursor: 'pointer' }}
              onClick={handleStatusEditStart}
            >
              <Text size="xs" c="dimmed" style={{ fontSize: '0.65rem', fontStyle: voiceStatus ? 'normal' : 'italic' }}>
                {voiceStatus || 'Set a status'}
              </Text>
              <IconPencil size={10} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
            </Group>
          </Tooltip>
        )}
      </div>

      {/* Stage controls (for stage channels) */}
      {channelType === 'stage' && (
        <StageControls
          isSpeaker={isSpeaker}
          isHandRaised={isHandRaised}
          isMuted={muted}
          onToggleMute={toggleMute}
          onRaiseHand={raiseHand}
          onLowerHand={lowerHand}
        />
      )}

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

          <ScreenShareButton size={28} />

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
