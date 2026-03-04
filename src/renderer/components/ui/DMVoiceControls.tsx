import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconPhoneOff, IconPhone,
} from '@tabler/icons-react';

interface DMVoiceControlsProps {
  isInCall: boolean;
  isMuted: boolean;
  onCall: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
}

export function DMVoiceControls({
  isInCall,
  isMuted,
  onCall,
  onHangup,
  onToggleMute,
}: DMVoiceControlsProps) {
  if (!isInCall) {
    return (
      <Tooltip label="Start Voice Call" position="bottom" withArrow>
        <ActionIcon variant="subtle" color="green" size={28} onClick={onCall}>
          <IconPhone size={16} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Group gap={4}>
      <Tooltip label={isMuted ? 'Unmute' : 'Mute'} position="bottom" withArrow>
        <ActionIcon
          variant={isMuted ? 'filled' : 'subtle'}
          color={isMuted ? 'red' : 'gray'}
          size={28}
          onClick={onToggleMute}
        >
          {isMuted ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label="End Call" position="bottom" withArrow>
        <ActionIcon variant="filled" color="red" size={28} onClick={onHangup}>
          <IconPhoneOff size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
