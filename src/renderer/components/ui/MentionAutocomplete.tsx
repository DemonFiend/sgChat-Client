import { useEffect, useState, useRef, useMemo } from 'react';
import { Avatar, Badge, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api, ensureArray } from '../../lib/api';
import { useChannels } from '../../hooks/useChannels';

interface MentionAutocompleteProps {
  text: string;
  cursorPosition: number;
  serverId: string | null;
  onSelect: (wireFormat: string, triggerStart: number, triggerEnd: number) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface MemberItem {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function MentionAutocomplete({ text, cursorPosition, serverId, onSelect, inputRef }: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch members for this server (React Query deduplicates with MemberList)
  const { data: members } = useQuery({
    queryKey: ['members', serverId],
    queryFn: async () => {
      const raw = ensureArray<any>(await api.get(`/api/servers/${serverId}/members`));
      return raw.map((m) => ({
        id: m.user_id || m.id,
        username: m.username,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
      })) as MemberItem[];
    },
    enabled: !!serverId,
    staleTime: 60_000,
  });

  const { data: channels } = useChannels(serverId);

  // Fetch roles for this server
  const { data: roles } = useQuery({
    queryKey: ['mention-roles', serverId],
    queryFn: () => ensureArray<{ id: string; name: string; color?: string }>(
      api.get(`/api/servers/${serverId}/roles`),
    ),
    enabled: !!serverId,
    staleTime: 60_000,
  });

  // Detect @mention or #channel trigger
  const { query, triggerStart, triggerType } = useMemo(() => {
    const beforeCursor = text.slice(0, cursorPosition);

    // Find last @ or # that starts a mention
    let lastAt = -1;
    let lastHash = -1;
    for (let i = beforeCursor.length - 1; i >= 0; i--) {
      const ch = beforeCursor[i];
      if (ch === ' ' || ch === '\n') break; // stop at whitespace
      if (ch === '@' && lastAt === -1) lastAt = i;
      if (ch === '#' && lastHash === -1) lastHash = i;
    }

    // Pick the most recent trigger
    const triggerIdx = Math.max(lastAt, lastHash);
    if (triggerIdx === -1) return { query: null, triggerStart: -1, triggerType: null as 'user' | 'channel' | null };

    // Must be at start or preceded by space/newline
    if (triggerIdx > 0 && beforeCursor[triggerIdx - 1] !== ' ' && beforeCursor[triggerIdx - 1] !== '\n') {
      return { query: null, triggerStart: -1, triggerType: null as 'user' | 'channel' | null };
    }

    const partial = beforeCursor.slice(triggerIdx + 1);
    // Need at least 1 char (or show all with 0 for short member lists)
    if (partial.includes(' ')) return { query: null, triggerStart: -1, triggerType: null as 'user' | 'channel' | null };

    const type = triggerIdx === lastAt ? 'user' as const : 'channel' as const;
    return { query: partial, triggerStart: triggerIdx, triggerType: type };
  }, [text, cursorPosition]);

  const results = useMemo(() => {
    if (query === null || !triggerType) return [];
    const q = query.toLowerCase();

    if (triggerType === 'channel') {
      const textChannels = (channels || []).filter((c) => c.type === 'text' || c.type === 'announcement');
      return textChannels
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .slice(0, 10)
        .map((c) => ({ type: 'channel' as const, id: c.id, name: c.name }));
    }

    // @ trigger — users, roles, and broadcast mentions
    const items: Array<{
      type: 'user' | 'role' | 'broadcast';
      id: string;
      name: string;
      subtitle?: string;
      avatarUrl?: string | null;
      color?: string;
    }> = [];

    // Broadcast mentions (@everyone, @here)
    const broadcasts = [
      { id: 'everyone', name: 'everyone' },
      { id: 'here', name: 'here' },
    ];
    for (const b of broadcasts) {
      if (!q || b.name.includes(q)) {
        items.push({ type: 'broadcast', id: b.id, name: `@${b.name}` });
      }
    }

    // Role mentions
    for (const role of roles || []) {
      if (role.name === '@everyone') continue; // already covered by broadcast
      if (!q || role.name.toLowerCase().includes(q)) {
        items.push({ type: 'role', id: role.id, name: role.name, color: role.color });
      }
    }

    // User mentions
    for (const m of members || []) {
      if (!q || m.username.toLowerCase().includes(q) || (m.display_name?.toLowerCase().includes(q) ?? false)) {
        items.push({
          type: 'user',
          id: m.id,
          name: m.display_name || m.username,
          subtitle: m.display_name ? m.username : undefined,
          avatarUrl: m.avatar_url,
        });
      }
    }

    return items.slice(0, 15);
  }, [query, triggerType, members, channels, roles]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // Keyboard navigation
  useEffect(() => {
    if (results.length === 0 || !inputRef?.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (results.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const item = results[selectedIndex];
          const wire = itemToWire(item);
          onSelect(wire, triggerStart, cursorPosition);
        }
      } else if (e.key === 'Escape') {
        // Let parent handle
      }
    };

    const el = inputRef.current;
    el.addEventListener('keydown', handleKeyDown, true);
    return () => el.removeEventListener('keydown', handleKeyDown, true);
  }, [results, selectedIndex, triggerStart, cursorPosition, onSelect, inputRef]);

  /** Convert an autocomplete item to its wire format string */
  function itemToWire(item: { type: string; id: string }): string {
    switch (item.type) {
      case 'channel': return `<#${item.id}> `;
      case 'role': return `<@&${item.id}> `;
      case 'broadcast': return `@${item.id} `; // @everyone or @here
      case 'user':
      default: return `<@${item.id}> `;
    }
  }

  if (results.length === 0) return null;

  return (
    <Paper
      ref={listRef}
      shadow="lg"
      radius="md"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: 100,
        maxHeight: 240,
        overflowY: 'auto',
      }}
    >
      <Stack gap={0} p={4}>
        {results.map((item, index) => (
          <UnstyledButton
            key={`${item.type}-${item.id}`}
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              background: index === selectedIndex ? 'var(--bg-hover)' : 'transparent',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(itemToWire(item), triggerStart, cursorPosition);
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
              {item.type === 'role' && (
                <Badge size="xs" variant="light" style={{ flexShrink: 0, color: item.color || undefined }}>
                  @
                </Badge>
              )}
              {item.type === 'broadcast' && (
                <Text size="sm" c="yellow" fw={700}>@</Text>
              )}
              <div style={{ minWidth: 0 }}>
                <Text size="sm" truncate style={item.type === 'role' && item.color ? { color: item.color } : undefined}>
                  {item.type === 'channel' ? `#${item.name}` : item.name}
                </Text>
                {item.subtitle && <Text size="xs" c="dimmed" truncate>{item.subtitle}</Text>}
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
}
