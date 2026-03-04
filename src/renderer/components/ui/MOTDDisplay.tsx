import { ActionIcon, Group, Text } from '@mantine/core';
import { IconInfoCircle, IconX } from '@tabler/icons-react';

interface MOTDDisplayProps {
  motd: string;
  onDismiss?: () => void;
}

export function MOTDDisplay({ motd, onDismiss }: MOTDDisplayProps) {
  if (!motd) return null;

  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--bg-hover)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <Group gap={8} wrap="nowrap">
        <IconInfoCircle size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <Text size="xs" style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
          {motd}
        </Text>
        {onDismiss && (
          <ActionIcon variant="subtle" color="gray" size={20} onClick={onDismiss}>
            <IconX size={12} />
          </ActionIcon>
        )}
      </Group>
    </div>
  );
}
