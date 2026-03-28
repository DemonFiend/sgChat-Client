import { useState } from 'react';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconHeadphones, IconHeadphonesOff,
  IconPhoneOff, IconMusic, IconLock,
} from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useAuthStore } from '../../stores/authStore';
import { ScreenShareButton } from './ScreenShareButton';
import { PingIndicator } from './PingIndicator';
import { SoundboardPanel } from './SoundboardPanel';

interface VoiceControlsProps {
  size?: number;
}

export function VoiceControls({ size = 28 }: VoiceControlsProps) {
  const muted = useVoiceStore((s) => s.muted);
  const deafened = useVoiceStore((s) => s.deafened);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleDeafen = useVoiceStore((s) => s.toggleDeafen);
  const leave = useVoiceStore((s) => s.leave);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const participants = useVoiceStore((s) => s.participants);
  const [soundboardOpen, setSoundboardOpen] = useState(false);

  const localParticipant = participants.find((p) => p.id === currentUserId);
  const isServerMutedLocal = !!localParticipant?.isServerMuted;
  const isServerDeafenedLocal = !!localParticipant?.isServerDeafened;

  return (
    <div style={{ position: 'relative' }}>
      <Group gap={4}>
        <Tooltip label={isServerMutedLocal ? 'Server Muted' : muted ? 'Unmute' : 'Mute'} position="top" withArrow>
          <ActionIcon
            variant={muted ? 'filled' : 'subtle'}
            color={muted ? 'red' : 'gray'}
            size={size}
            onClick={toggleMute}
            style={isServerMutedLocal ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
          >
            {isServerMutedLocal ? <IconLock size={size * 0.57} /> : muted ? <IconMicrophoneOff size={size * 0.57} /> : <IconMicrophone size={size * 0.57} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isServerDeafenedLocal ? 'Server Deafened' : deafened ? 'Undeafen' : 'Deafen'} position="top" withArrow>
          <ActionIcon
            variant={deafened ? 'filled' : 'subtle'}
            color={deafened ? 'red' : 'gray'}
            size={size}
            onClick={toggleDeafen}
            style={isServerDeafenedLocal ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
          >
            {isServerDeafenedLocal ? <IconLock size={size * 0.57} /> : deafened ? <IconHeadphonesOff size={size * 0.57} /> : <IconHeadphones size={size * 0.57} />}
          </ActionIcon>
        </Tooltip>

        <ScreenShareButton size={size} />

        <Tooltip label="Soundboard" position="top" withArrow>
          <ActionIcon
            variant={soundboardOpen ? 'filled' : 'subtle'}
            color={soundboardOpen ? 'brand' : 'gray'}
            size={size}
            onClick={() => setSoundboardOpen(!soundboardOpen)}
          >
            <IconMusic size={size * 0.57} />
          </ActionIcon>
        </Tooltip>

        <PingIndicator size={size * 0.5} />

        <Tooltip label="Disconnect" position="top" withArrow>
          <ActionIcon variant="filled" color="red" size={size} onClick={leave}>
            <IconPhoneOff size={size * 0.5} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <SoundboardPanel opened={soundboardOpen} onClose={() => setSoundboardOpen(false)} />
    </div>
  );
}
