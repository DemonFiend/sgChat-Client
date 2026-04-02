import { useState } from 'react';
import { ActionIcon, Group, Switch, Text, Tooltip } from '@mantine/core';
import { IconHandStop, IconMicrophone, IconMicrophoneOff, IconUsers } from '@tabler/icons-react';
import { getSocket } from '../../api/socket';
import { useVoiceStore } from '../../stores/voiceStore';

interface StageControlsProps {
  isSpeaker: boolean;
  isHandRaised: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  /** Whether the current user has MANAGE_STAGE permission */
  canManageStage?: boolean;
}

export function StageControls({
  isSpeaker,
  isHandRaised,
  isMuted,
  onToggleMute,
  onRaiseHand,
  onLowerHand,
  canManageStage,
}: StageControlsProps) {
  const [allowAllToSpeak, setAllowAllToSpeak] = useState(false);
  const channelId = useVoiceStore((s) => s.channelId);

  const handleToggleAllSpeak = () => {
    if (!channelId) return;
    const newValue = !allowAllToSpeak;
    setAllowAllToSpeak(newValue);
    getSocket()?.emit('voice:setAllowAllSpeak', {
      channel_id: channelId,
      allow: newValue,
    });
  };

  return (
    <div style={{ marginBottom: 8 }}>
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
              aria-label={isMuted ? 'Unmute' : 'Mute'}
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
              aria-label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
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

      {/* Moderator controls: quick toggle to allow all participants to speak */}
      {canManageStage && (
        <Group gap={8} px={12} py={6} mt={4} style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <IconUsers size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <Text size="xs" c="dimmed" style={{ flex: 1 }}>Allow all to speak</Text>
          <Switch
            size="xs"
            checked={allowAllToSpeak}
            onChange={handleToggleAllSpeak}
            styles={{
              track: { cursor: 'pointer' },
            }}
          />
        </Group>
      )}
    </div>
  );
}
