import { Group, Text, Tooltip, UnstyledButton } from '@mantine/core';
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
        <Tooltip key={r.emoji} label={`${r.count} reaction${r.count !== 1 ? 's' : ''}`} position="top" withArrow>
          <UnstyledButton
            onClick={() => onToggle(r.emoji, r.me)}
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
        </Tooltip>
      ))}
    </Group>
  );
}
