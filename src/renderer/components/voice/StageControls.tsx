import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconHandStop, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';

interface StageControlsProps {
  isSpeaker: boolean;
  isHandRaised: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

export function StageControls({
  isSpeaker,
  isHandRaised,
  isMuted,
  onToggleMute,
  onRaiseHand,
  onLowerHand,
}: StageControlsProps) {
  return (
    <Group gap={8} px={12} py={8} style={{
      background: 'var(--bg-hover)',
      borderRadius: 4,
    }}>
      <Text size="xs" c="dimmed" style={{ flex: 1 }}>
        {isSpeaker ? 'You are a speaker' : 'You are a listener'}
      </Text>

      {isSpeaker ? (
        <Tooltip label={isMuted ? 'Unmute' : 'Mute'} withArrow>
          <ActionIcon
            variant={isMuted ? 'filled' : 'subtle'}
            color={isMuted ? 'red' : 'gray'}
            size={28}
            onClick={onToggleMute}
          >
            {isMuted ? <IconMicrophoneOff size={14} /> : <IconMicrophone size={14} />}
          </ActionIcon>
        </Tooltip>
      ) : (
        <Tooltip label={isHandRaised ? 'Lower Hand' : 'Raise Hand'} withArrow>
          <ActionIcon
            variant={isHandRaised ? 'filled' : 'subtle'}
            color={isHandRaised ? 'yellow' : 'gray'}
            size={28}
            onClick={isHandRaised ? onLowerHand : onRaiseHand}
          >
            <IconHandStop size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
