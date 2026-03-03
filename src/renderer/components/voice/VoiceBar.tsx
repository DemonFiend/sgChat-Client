import { useEffect } from 'react';
import { ActionIcon, Avatar, Group, Text, Tooltip } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconHeadphones, IconHeadphonesOff, IconPhoneOff } from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';

export function VoiceBar() {
  const { connected, channelId, muted, deafened, participants, leave, toggleMute, toggleDeafen, initListeners } = useVoiceStore();

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  if (!connected) return null;

  return (
    <div style={{
      height: 52,
      background: '#1a1b1e',
      borderTop: '1px solid #111214',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Connection info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={600} c="green" truncate>
          Voice Connected
        </Text>
        <Text size="xs" c="dimmed" truncate>
          Channel • {participants.length} {participants.length === 1 ? 'user' : 'users'}
        </Text>
      </div>

      {/* Participant avatars */}
      <Group gap={-8}>
        {participants.slice(0, 5).map((p) => (
          <Tooltip key={p.id} label={`${p.username}${p.isMuted ? ' (muted)' : ''}${p.isSpeaking ? ' (speaking)' : ''}`}>
            <Avatar
              size={28}
              radius="xl"
              color={p.isSpeaking ? 'green' : 'brand'}
              style={{
                border: p.isSpeaking ? '2px solid #2f9e44' : '2px solid #1a1b1e',
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

      {/* Controls */}
      <Group gap={4}>
        <Tooltip label={muted ? 'Unmute' : 'Mute'} position="top" withArrow>
          <ActionIcon
            variant={muted ? 'filled' : 'subtle'}
            color={muted ? 'red' : 'gray'}
            size={32}
            onClick={toggleMute}
          >
            {muted ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={deafened ? 'Undeafen' : 'Deafen'} position="top" withArrow>
          <ActionIcon
            variant={deafened ? 'filled' : 'subtle'}
            color={deafened ? 'red' : 'gray'}
            size={32}
            onClick={toggleDeafen}
          >
            {deafened ? <IconHeadphonesOff size={18} /> : <IconHeadphones size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Disconnect" position="top" withArrow>
          <ActionIcon
            variant="filled"
            color="red"
            size={32}
            onClick={leave}
          >
            <IconPhoneOff size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
