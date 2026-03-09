import { useState } from 'react';
import { Group, Popover, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import type { MessageReaction } from '../../hooks/useMessages';

interface ReactionDisplayProps {
  reactions: MessageReaction[];
  onToggle: (emoji: string, hasReacted: boolean, type?: 'unicode' | 'custom', emojiId?: string) => void;
}

export function ReactionDisplay({ reactions, onToggle }: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <Group gap={4} mt={4}>
      {reactions.map((r) => (
        <ReactionBadge key={r.emoji_id || r.emoji} reaction={r} onToggle={onToggle} />
      ))}
    </Group>
  );
}

function ReactionBadge({ reaction: r, onToggle }: { reaction: MessageReaction; onToggle: ReactionDisplayProps['onToggle'] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const isCustom = r.type === 'custom';

  const emojiContent = isCustom && r.image_url ? (
    <Tooltip label={`:${r.shortcode || r.emoji}:`} position="top" withArrow openDelay={200}>
      <img
        src={r.image_url}
        alt={r.shortcode || r.emoji}
        width={16}
        height={16}
        style={{ objectFit: 'contain', verticalAlign: 'text-bottom' }}
      />
    </Tooltip>
  ) : (
    <span>{r.emoji}</span>
  );

  return (
    <Popover opened={viewerOpen} onChange={setViewerOpen} position="top" withArrow shadow="md" width={200}>
      <Popover.Target>
        <UnstyledButton
          onClick={() => onToggle(r.emoji, r.me, r.type, r.emoji_id)}
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
          {emojiContent}
          <Text size="xs" fw={500} style={{ color: r.me ? 'var(--accent)' : 'var(--text-muted)' }}>
            {r.count}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {isCustom && r.image_url ? (
            <img src={r.image_url} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '1.2em' }}>{r.emoji}</span>
          )}
          <Text size="sm" fw={600}>
            {isCustom ? `:${r.shortcode || r.emoji}:` : r.emoji}
            <Text component="span" size="xs" c="dimmed" ml={4}>{r.count}</Text>
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
