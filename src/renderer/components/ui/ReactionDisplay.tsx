import { useState } from 'react';
import { Group, Popover, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import type { MessageReaction } from '../../hooks/useMessages';

interface ReactionDisplayProps {
  reactions: MessageReaction[];
  onToggle: (emoji: string, hasReacted: boolean) => void;
}

export function ReactionDisplay({ reactions, onToggle }: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <Group gap={4} mt={4}>
      {reactions.map((r) => (
        <ReactionBadge key={r.emoji} reaction={r} onToggle={onToggle} />
      ))}
    </Group>
  );
}

function ReactionBadge({ reaction: r, onToggle }: { reaction: MessageReaction; onToggle: (emoji: string, hasReacted: boolean) => void }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <Popover opened={viewerOpen} onChange={setViewerOpen} position="top" withArrow shadow="md" width={200}>
      <Popover.Target>
        <UnstyledButton
          onClick={() => onToggle(r.emoji, r.me)}
          onContextMenu={(e) => { e.preventDefault(); setViewerOpen(true); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 4,
            border: r.me ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: r.me ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-secondary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <span>{r.emoji}</span>
          <Text size="xs" fw={500} style={{ color: r.me ? 'var(--accent)' : 'var(--text-muted)' }}>
            {r.count}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <Text size="sm" fw={600}>
            {r.emoji} <Text component="span" size="xs" c="dimmed" ml={4}>{r.count}</Text>
          </Text>
        </div>
        <ScrollArea.Autosize mah={160} type="hover" scrollbarSize={4}>
          <Stack gap={0} p={4}>
            {r.users.map((username) => (
              <Text key={username} size="sm" px={8} py={4} style={{ color: 'var(--text-primary)' }}>
                {username}
              </Text>
            ))}
            {r.users.length === 0 && (
              <Text size="xs" c="dimmed" px={8} py={4}>No users</Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
