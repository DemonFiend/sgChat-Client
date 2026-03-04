import { useEffect, useState, useRef } from 'react';
import { Avatar, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMentionContext } from '../../contexts/MentionContext';

interface MentionAutocompleteProps {
  query: string;
  visible: boolean;
  onSelect: (type: 'user' | 'channel', id: string, displayText: string, wireFormat: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function MentionAutocomplete({ query, visible, onSelect, onClose, position }: MentionAutocompleteProps) {
  const { members, channels } = useMentionContext();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter results based on query
  const results: Array<{ type: 'user' | 'channel'; id: string; name: string; subtitle?: string; avatarUrl?: string | null }> = [];

  if (query.startsWith('#')) {
    const q = query.slice(1).toLowerCase();
    channels.forEach((ch, id) => {
      if (ch.name.toLowerCase().includes(q)) {
        results.push({ type: 'channel', id, name: ch.name });
      }
    });
  } else {
    const q = query.startsWith('@') ? query.slice(1).toLowerCase() : query.toLowerCase();
    members.forEach((member, id) => {
      const matchName = member.username.toLowerCase().includes(q) ||
        (member.display_name?.toLowerCase().includes(q) ?? false);
      if (matchName) {
        results.push({
          type: 'user',
          id,
          name: member.display_name || member.username,
          subtitle: member.display_name ? member.username : undefined,
          avatarUrl: member.avatar_url,
        });
      }
    });
  }

  // Limit to 8 results
  const filtered = results.slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) {
          const display = item.type === 'channel' ? `#${item.name}` : `@${item.name}`;
          const wire = item.type === 'channel' ? `<#${item.id}>` : `<@${item.id}>`;
          onSelect(item.type, item.id, display, wire);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <Paper
      ref={containerRef}
      shadow="lg"
      radius="md"
      style={{
        position: 'absolute',
        bottom: position?.top ?? '100%',
        left: position?.left ?? 0,
        zIndex: 50,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        maxHeight: 300,
        overflow: 'auto',
        minWidth: 220,
        marginBottom: 4,
      }}
    >
      <Stack gap={0} p={4}>
        {filtered.map((item, index) => (
          <UnstyledButton
            key={`${item.type}-${item.id}`}
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              background: index === selectedIndex ? 'var(--bg-hover)' : 'transparent',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => {
              const display = item.type === 'channel' ? `#${item.name}` : `@${item.name}`;
              const wire = item.type === 'channel' ? `<#${item.id}>` : `<@${item.id}>`;
              onSelect(item.type, item.id, display, wire);
            }}
          >
            <Group gap="sm" wrap="nowrap">
              {item.type === 'user' && (
                <Avatar src={item.avatarUrl} size={24} radius="xl" color="brand">
                  {item.name[0]?.toUpperCase()}
                </Avatar>
              )}
              {item.type === 'channel' && (
                <Text size="sm" c="dimmed" fw={700}>#</Text>
              )}
              <div style={{ minWidth: 0 }}>
                <Text size="sm" truncate>{item.name}</Text>
                {item.subtitle && <Text size="xs" c="dimmed" truncate>{item.subtitle}</Text>}
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
}
