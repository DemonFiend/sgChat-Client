import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconPhoneOff, IconPhone,
  IconVideo, IconVideoOff,
} from '@tabler/icons-react';

interface DMVoiceControlsProps {
  isInCall: boolean;
  isMuted: boolean;
  isVideoOn?: boolean;
  onCall: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleVideo?: () => void;
}

export function DMVoiceControls({
  isInCall,
  isMuted,
  isVideoOn = false,
  onCall,
  onHangup,
  onToggleMute,
  onToggleVideo,
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
      <Tooltip label={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'} position="bottom" withArrow>
        <ActionIcon
          variant={isVideoOn ? 'filled' : 'subtle'}
          color={isVideoOn ? 'brand' : 'gray'}
          size={28}
          onClick={onToggleVideo}
        >
          {isVideoOn ? <IconVideo size={16} /> : <IconVideoOff size={16} />}
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
