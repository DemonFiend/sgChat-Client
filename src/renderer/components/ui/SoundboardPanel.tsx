import { useState } from 'react';
import { Button, Group, Paper, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconMusic, IconX } from '@tabler/icons-react';
import { soundService } from '../../lib/soundService';

const SOUNDBOARD_SOUNDS = [
  { id: 'join', label: 'Join', emoji: '👋' },
  { id: 'leave', label: 'Leave', emoji: '👋' },
  { id: 'notification', label: 'Ping', emoji: '🔔' },
  { id: 'mute', label: 'Mute', emoji: '🔇' },
  { id: 'unmute', label: 'Unmute', emoji: '🔊' },
];

interface SoundboardPanelProps {
  opened: boolean;
  onClose: () => void;
}

export function SoundboardPanel({ opened, onClose }: SoundboardPanelProps) {
  if (!opened) return null;

  return (
    <Paper
      shadow="lg"
      radius="md"
      style={{
        position: 'absolute',
        bottom: 60,
        left: 16,
        width: 250,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        zIndex: 100,
      }}
    >
      <Group gap={8} px={12} py={8} style={{ borderBottom: '1px solid var(--border)' }}>
        <IconMusic size={16} style={{ color: 'var(--accent)' }} />
        <Text size="sm" fw={600} style={{ flex: 1 }}>Soundboard</Text>
        <Button variant="subtle" color="gray" size="xs" onClick={onClose} p={0} w={24} h={24}>
          <IconX size={12} />
        </Button>
      </Group>

      <ScrollArea mah={200} scrollbarSize={4} type="hover">
        <Stack gap={4} p={8}>
          {SOUNDBOARD_SOUNDS.map((sound) => (
            <Tooltip key={sound.id} label={sound.label} position="right" withArrow>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                fullWidth
                justify="flex-start"
                leftSection={<span>{sound.emoji}</span>}
                onClick={() => soundService.play(sound.id)}
              >
                {sound.label}
              </Button>
            </Tooltip>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
