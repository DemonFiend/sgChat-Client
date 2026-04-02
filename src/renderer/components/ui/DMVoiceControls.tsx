import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import {
  IconMicrophone, IconMicrophoneOff,
  IconHeadphones, IconHeadphonesOff,
  IconPhoneOff, IconPhone,
  IconVideo, IconVideoOff,
  IconScreenShare, IconScreenShareOff,
} from '@tabler/icons-react';
import type { DMCallPhase } from '../../lib/dmVoiceService';

interface DMVoiceControlsProps {
  isInCall: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  callPhase?: DMCallPhase;
  remoteParticipantLeft?: boolean;
  onCall: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleDeafen?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
}

export function DMVoiceControls({
  isInCall,
  isMuted,
  isDeafened = false,
  isVideoOn = false,
  isScreenSharing = false,
  callPhase = 'idle',
  remoteParticipantLeft = false,
  onCall,
  onHangup,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
}: DMVoiceControlsProps) {
  if (!isInCall) {
    return (
      <Tooltip label="Start Voice Call" position="bottom" withArrow>
        <ActionIcon aria-label="Start Voice Call" variant="subtle" color="green" size={28} onClick={onCall}>
          <IconPhone size={16} />
        </ActionIcon>
      </Tooltip>
    );
  }

  // Call phase text
  const phaseText =
    remoteParticipantLeft ? 'User left the call' :
    callPhase === 'notifying' ? 'Ringing...' :
    callPhase === 'waiting' ? 'No answer yet...' :
    null;

  return (
    <div>
      {phaseText && (
        <Text
          size="xs"
          c={remoteParticipantLeft ? 'red' : 'dimmed'}
          ta="center"
          mb={4}
          style={{ fontSize: '0.65rem', fontStyle: 'italic' }}
        >
          {phaseText}
        </Text>
      )}
      <Group gap={4}>
        <Tooltip label={isMuted ? 'Unmute' : 'Mute'} position="bottom" withArrow>
          <ActionIcon
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            variant={isMuted ? 'filled' : 'subtle'}
            color={isMuted ? 'red' : 'gray'}
            size={28}
            onClick={onToggleMute}
          >
            {isMuted ? <IconMicrophoneOff size={16} /> : <IconMicrophone size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isDeafened ? 'Undeafen' : 'Deafen'} position="bottom" withArrow>
          <ActionIcon
            aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
            variant={isDeafened ? 'filled' : 'subtle'}
            color={isDeafened ? 'red' : 'gray'}
            size={28}
            onClick={onToggleDeafen}
          >
            {isDeafened ? <IconHeadphonesOff size={16} /> : <IconHeadphones size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'} position="bottom" withArrow>
          <ActionIcon
            aria-label={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            variant={isVideoOn ? 'filled' : 'subtle'}
            color={isVideoOn ? 'brand' : 'gray'}
            size={28}
            onClick={onToggleVideo}
          >
            {isVideoOn ? <IconVideo size={16} /> : <IconVideoOff size={16} />}
          </ActionIcon>
        </Tooltip>
        {callPhase === 'connected' && (
          <Tooltip label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'} position="bottom" withArrow>
            <ActionIcon
              aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              variant={isScreenSharing ? 'filled' : 'subtle'}
              color={isScreenSharing ? 'violet' : 'gray'}
              size={28}
              onClick={onToggleScreenShare}
            >
              {isScreenSharing ? <IconScreenShareOff size={16} /> : <IconScreenShare size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label="End Call" position="bottom" withArrow>
          <ActionIcon aria-label="End Call" variant="filled" color="red" size={28} onClick={onHangup}>
            <IconPhoneOff size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
