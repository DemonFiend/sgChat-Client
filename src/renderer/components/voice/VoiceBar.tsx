import { useEffect } from 'react';
import { ActionIcon, Avatar, Group, Text, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconHeadphones, IconHeadphonesOff,
  IconPhoneOff, IconScreenShare, IconVideo,
  IconMusic, IconWifi,
} from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';

interface VoiceBarProps {
  compact?: boolean;
}

export function VoiceBar({ compact }: VoiceBarProps) {
  const {
    connected, channelId, muted, deafened, participants,
    leave, toggleMute, toggleDeafen, initListeners,
  } = useVoiceStore();

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  if (!connected) return null;

  if (compact) {
    return (
      <div style={{
        background: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border)',
        padding: '8px',
        flexShrink: 0,
      }}>
        {/* Connection info */}
        <Group gap={8} mb={6}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text size="xs" fw={600} style={{ color: 'var(--accent)' }} truncate>
              Voice Connected
            </Text>
          </div>
          <Tooltip label="Connection quality" position="top" withArrow>
            <IconWifi size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          </Tooltip>
        </Group>

        {/* Controls — two rows for compact layout */}
        <Group gap={4} justify="center">
          <Tooltip label={muted ? 'Unmute' : 'Mute'} position="top" withArrow>
            <ActionIcon
              variant={muted ? 'filled' : 'subtle'}
              color={muted ? 'red' : 'gray'}
              size={28}
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
              onClick={toggleDeafen}
            >
              {deafened ? <IconHeadphonesOff size={16} /> : <IconHeadphones size={16} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Screen Share" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={28}>
              <IconScreenShare size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Video" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={28}>
              <IconVideo size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Soundboard" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={28}>
              <IconMusic size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Disconnect" position="top" withArrow>
            <ActionIcon
              variant="filled"
              color="red"
              size={28}
              onClick={leave}
            >
              <IconPhoneOff size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    );
  }

  // Full-width voice bar (legacy fallback)
  return (
    <div style={{
      height: 52,
      background: 'var(--bg-tertiary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={600} c="green" truncate>Voice Connected</Text>
        <Text size="xs" c="dimmed" truncate>
          Channel • {participants.length} {participants.length === 1 ? 'user' : 'users'}
        </Text>
      </div>

      <Group gap={-8}>
        {participants.slice(0, 5).map((p) => (
          <Tooltip key={p.id} label={`${p.username}${p.isMuted ? ' (muted)' : ''}${p.isSpeaking ? ' (speaking)' : ''}`}>
            <Avatar
              size={28}
              radius="xl"
              color={p.isSpeaking ? 'green' : 'brand'}
              style={{
                border: p.isSpeaking ? '2px solid var(--accent)' : '2px solid var(--bg-tertiary)',
                opacity: p.isMuted ? 0.5 : 1,
              }}
            >
              {p.username.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
        {participants.length > 5 && (
          <Text size="xs" c="dimmed" ml={8}>+{participants.length - 5}</Text>
        )}
      </Group>

      <Group gap={4}>
        <Tooltip label={muted ? 'Unmute' : 'Mute'} position="top" withArrow>
          <ActionIcon variant={muted ? 'filled' : 'subtle'} color={muted ? 'red' : 'gray'} size={32} onClick={toggleMute}>
            {muted ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={deafened ? 'Undeafen' : 'Deafen'} position="top" withArrow>
          <ActionIcon variant={deafened ? 'filled' : 'subtle'} color={deafened ? 'red' : 'gray'} size={32} onClick={toggleDeafen}>
            {deafened ? <IconHeadphonesOff size={18} /> : <IconHeadphones size={18} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Disconnect" position="top" withArrow>
          <ActionIcon variant="filled" color="red" size={32} onClick={leave}>
            <IconPhoneOff size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
