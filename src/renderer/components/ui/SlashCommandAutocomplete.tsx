import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Text, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface SlashCommand {
  name: string;
  description: string;
}

interface SlashCommandAutocompleteProps {
  text: string;
  cursorPosition: number;
  onSelect: (commandName: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function SlashCommandAutocomplete({ text, cursorPosition, onSelect, inputRef }: SlashCommandAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: commands } = useQuery({
    queryKey: ['slash-commands'],
    queryFn: () => api.get<SlashCommand[]>('/api/channels/commands'),
    staleTime: 5 * 60 * 1000,
  });

  // Check if user is typing a slash command at the start of input
  const isSlashTrigger = text.startsWith('/') && cursorPosition > 0 && !text.includes(' ');
  const searchTerm = isSlashTrigger ? text.slice(1).toLowerCase() : '';

  const filtered = useMemo(
    () => isSlashTrigger && commands
      ? commands.filter((c) => c.name.toLowerCase().startsWith(searchTerm)).slice(0, 8)
      : [],
    [isSlashTrigger, commands, searchTerm],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (filtered.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filtered[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(`/${filtered[selectedIndex].name} `);
        }
      } else if (e.key === 'Escape') {
        // Let parent handle
      }
    };
    const el = inputRef.current;
    el?.addEventListener('keydown', handler, true);
    return () => el?.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, onSelect, inputRef]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 4,
        zIndex: 100,
        maxHeight: 240,
        overflow: 'auto',
        marginBottom: 4,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <Stack gap={0}>
        {filtered.map((cmd, i) => (
          <div
            key={cmd.name}
            onClick={() => onSelect(`/${cmd.name} `)}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              background: i === selectedIndex ? 'var(--bg-active)' : 'transparent',
            }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <Group gap={8}>
              <Text size="sm" fw={600} style={{ color: 'var(--accent)' }}>/{cmd.name}</Text>
              <Text size="xs" c="dimmed">{cmd.description}</Text>
            </Group>
          </div>
        ))}
      </Stack>
    </div>
  );
}
