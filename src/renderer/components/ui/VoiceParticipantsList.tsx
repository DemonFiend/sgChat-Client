import { Avatar, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconMicrophoneOff, IconHeadphonesOff } from '@tabler/icons-react';
import type { VoiceParticipant } from '../../lib/voiceService';
import { useStreamViewerStore } from '../../stores/streamViewer';
import { useVoiceStore } from '../../stores/voiceStore';

interface VoiceParticipantsListProps {
  participants: VoiceParticipant[];
  compact?: boolean;
}

export function VoiceParticipantsList({ participants, compact }: VoiceParticipantsListProps) {
  const openStream = useStreamViewerStore((s) => s.openStream);
  const channelId = useVoiceStore((s) => s.channelId);

  if (participants.length === 0) return null;

  return (
    <Stack gap={2}>
      {participants.map((p) => (
        <Group
          key={p.id}
          gap={6}
          px={compact ? 4 : 8}
          py={2}
          style={{
            borderRadius: 4,
            opacity: p.isMuted ? 0.6 : 1,
          }}
          wrap="nowrap"
        >
          <Avatar
            size={compact ? 20 : 24}
            radius="xl"
            color={p.isSpeaking ? 'green' : 'brand'}
            src={p.avatarUrl}
            style={{
              border: p.isSpeaking ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'border-color 0.15s',
            }}
          >
            {p.username.charAt(0).toUpperCase()}
          </Avatar>
          <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
            {p.username}
          </Text>
          {p.isMuted && (
            <Tooltip label="Muted" position="right" withArrow>
              <IconMicrophoneOff size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Tooltip>
          )}
          {p.isDeafened && (
            <Tooltip label="Deafened" position="right" withArrow>
              <IconHeadphonesOff size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Tooltip>
          )}
          {p.isStreaming && (
            <Tooltip label="Watch Stream" position="right" withArrow>
              <Badge
                size="xs"
                variant="filled"
                color="red"
                style={{ fontSize: '0.55rem', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => channelId && openStream(p.id, p.username, channelId)}
              >
                LIVE
              </Badge>
            </Tooltip>
          )}
        </Group>
      ))}
    </Stack>
  );
}
