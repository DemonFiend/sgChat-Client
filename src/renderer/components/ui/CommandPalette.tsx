import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Avatar, Group, Modal, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import {
  IconHash, IconSearch, IconVolume, IconSettings,
  IconMicrophone, IconHeadphones, IconMessage, IconPlugConnectedX,
} from '@tabler/icons-react';
import { useChannels, type Channel } from '../../hooks/useChannels';
import { useUIStore } from '../../stores/uiStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { api, ensureArray } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────

interface PaletteMember {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  role_color?: string;
}

type ResultType = 'channel' | 'member' | 'action';

interface PaletteResult {
  id: string;
  type: ResultType;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  data?: Channel | PaletteMember | QuickAction;
}

interface QuickAction {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  action: () => void;
}

interface ResultSection {
  type: ResultType;
  label: string;
  items: (PaletteResult & { globalIdx: number })[];
}

// ── Status dot ───────────────────────────────────────────
function StatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    online: '#22c55e',
    idle: '#eab308',
    dnd: '#ef4444',
    offline: '#6b7280',
  };
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status || 'offline'] || colors.offline,
        flexShrink: 0,
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────

export function CommandPalette() {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [members, setMembers] = useState<PaletteMember[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const activeServerId = useUIStore((s) => s.activeServerId);
  const setActiveChannel = useUIStore((s) => s.setActiveChannel);
  const setView = useUIStore((s) => s.setView);
  const { data: channels } = useChannels(activeServerId);

  // Listen for Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpened(true);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && opened) {
        setOpened(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opened]);

  // Fetch members when opened
  useEffect(() => {
    if (opened && activeServerId) {
      api.get(`/api/servers/${activeServerId}/members`)
        .then((data) => {
          const arr = ensureArray<PaletteMember>(data);
          setMembers(arr);
        })
        .catch(() => setMembers([]));
    }
  }, [opened, activeServerId]);

  // ── Quick actions (context-aware) ─────────────────────
  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      {
        id: 'settings',
        label: 'User Settings',
        sublabel: 'Open your settings',
        icon: <IconSettings size={16} style={{ color: 'var(--text-muted)' }} />,
        action: () => { /* handled externally */ },
      },
      {
        id: 'toggle-mute',
        label: 'Toggle Mute',
        sublabel: 'Mute or unmute your microphone',
        icon: <IconMicrophone size={16} style={{ color: 'var(--text-muted)' }} />,
        action: () => { /* handled externally */ },
      },
      {
        id: 'toggle-deafen',
        label: 'Toggle Deafen',
        sublabel: 'Deafen or undeafen audio',
        icon: <IconHeadphones size={16} style={{ color: 'var(--text-muted)' }} />,
        action: () => { /* handled externally */ },
      },
      {
        id: 'dms',
        label: 'Direct Messages',
        sublabel: 'Open your DMs',
        icon: <IconMessage size={16} style={{ color: 'var(--text-muted)' }} />,
        action: () => setView('dms'),
      },
      {
        id: 'disconnect-voice',
        label: 'Disconnect Voice',
        sublabel: 'Leave the current voice channel',
        icon: <IconPlugConnectedX size={16} style={{ color: 'var(--text-muted)' }} />,
        action: () => { /* handled externally */ },
      },
    ];
    return actions;
  }, [setView]);

  // ── Build results from channels, members, actions ─────
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const out: PaletteResult[] = [];

    // Channels
    const nonCategoryChannels = (channels || []).filter((c) => c.type !== ('category' as string));
    const matchedChannels = q
      ? nonCategoryChannels.filter((c) => c.name.toLowerCase().includes(q))
      : nonCategoryChannels;
    for (const c of matchedChannels.slice(0, 10)) {
      const isVoice = c.type === 'voice' || c.type === 'temp_voice' || c.type === 'stage' || c.type === 'music';
      out.push({
        id: `ch-${c.id}`,
        type: 'channel',
        label: c.name,
        sublabel: isVoice ? 'Voice Channel' : 'Text Channel',
        icon: isVoice
          ? <IconVolume size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <IconHash size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />,
        data: c,
      });
    }

    // Members
    const matchedMembers = q
      ? members.filter(
          (m) =>
            m.username.toLowerCase().includes(q) ||
            (m.display_name && m.display_name.toLowerCase().includes(q)),
        )
      : members;
    for (const m of matchedMembers.slice(0, 10)) {
      out.push({
        id: `usr-${m.id}`,
        type: 'member',
        label: m.display_name || m.username,
        sublabel: m.display_name ? `@${m.username}` : undefined,
        data: m,
      });
    }

    // Quick actions
    const matchedActions = q
      ? quickActions.filter(
          (a) =>
            a.label.toLowerCase().includes(q) ||
            a.sublabel.toLowerCase().includes(q),
        )
      : quickActions;
    for (const a of matchedActions) {
      out.push({
        id: `act-${a.id}`,
        type: 'action',
        label: a.label,
        sublabel: a.sublabel,
        icon: a.icon,
        data: a,
      });
    }

    return out;
  }, [query, channels, members, quickActions]);

  // ── Group results into sections ─────────────────────────
  const sections = useMemo(() => {
    const typeOrder: ResultType[] = ['channel', 'member', 'action'];
    const typeLabels: Record<ResultType, string> = {
      channel: 'Channels',
      member: 'Members',
      action: 'Quick Actions',
    };

    const out: ResultSection[] = [];
    let idx = 0;
    for (const type of typeOrder) {
      const items = results.filter((r) => r.type === type);
      if (items.length > 0) {
        out.push({
          type,
          label: typeLabels[type],
          items: items.map((item) => ({ ...item, globalIdx: idx++ })),
        });
      }
    }
    return out;
  }, [results]);

  // Clamp selectedIndex
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeResult = useCallback(
    (result: PaletteResult) => {
      if (result.type === 'channel') {
        const ch = result.data as Channel;
        setActiveChannel(ch.id);
        useUnreadStore.getState().markRead(ch.id);
      } else if (result.type === 'member') {
        // Navigate to DM or show profile — for now, just close
      } else if (result.type === 'action') {
        const act = result.data as QuickAction;
        act.action();
      }
      setOpened(false);
    },
    [setActiveChannel],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) executeResult(results[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setOpened(false);
          break;
      }
    },
    [results, selectedIndex, executeResult],
  );

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      withCloseButton={false}
      padding={0}
      size="md"
      centered
      styles={{
        body: { overflow: 'hidden' },
      }}
    >
      <TextInput
        placeholder="Search channels, members, or actions..."
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(e) => {
          setQuery(e.currentTarget.value);
          setSelectedIndex(0);
        }}
        autoFocus
        variant="unstyled"
        styles={{
          input: {
            padding: '12px 16px',
            fontSize: '0.95rem',
            borderBottom: '1px solid var(--border)',
          },
        }}
        onKeyDown={handleKeyDown}
      />

      <ScrollArea style={{ maxHeight: 400 }} ref={listRef}>
        {results.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py={20}>
            {query ? 'No results found' : 'Start typing to search...'}
          </Text>
        ) : (
          <Stack gap={0} p={4}>
            {sections.map((section) => (
              <div key={section.type}>
                {/* Section header */}
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={12} py={6}>
                  {section.label}
                </Text>
                {section.items.map((result) => (
                  <Group
                    key={result.id}
                    data-idx={result.globalIdx}
                    gap={8}
                    px={12}
                    py={6}
                    style={{
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: result.globalIdx === selectedIndex
                        ? 'var(--bg-secondary)'
                        : 'transparent',
                    }}
                    onClick={() => executeResult(result)}
                    onMouseEnter={() => setSelectedIndex(result.globalIdx)}
                  >
                    {/* Icon/Avatar */}
                    {result.type === 'member' ? (
                      <Group gap={4}>
                        <Avatar
                          src={(result.data as PaletteMember).avatar_url}
                          size={24}
                          radius="xl"
                        >
                          {((result.data as PaletteMember).username || '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <StatusDot status={(result.data as PaletteMember).status} />
                      </Group>
                    ) : (
                      result.icon
                    )}

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="sm"
                        fw={500}
                        truncate="end"
                        style={
                          result.type === 'member' && (result.data as PaletteMember).role_color
                            ? { color: (result.data as PaletteMember).role_color as string }
                            : undefined
                        }
                      >
                        {result.type === 'channel' ? `#${result.label}` : result.label}
                      </Text>
                      {result.sublabel && (
                        <Text size="xs" c="dimmed" truncate="end">{result.sublabel}</Text>
                      )}
                    </div>

                    {/* Hint */}
                    {result.type === 'channel' && result.globalIdx === selectedIndex && (
                      <Text size="xs" c="dimmed">Enter</Text>
                    )}
                  </Group>
                ))}
              </div>
            ))}
          </Stack>
        )}
      </ScrollArea>

      {/* Footer hints */}
      <Group gap={16} px={12} py={6} style={{ borderTop: '1px solid var(--border)' }}>
        <Text size="xs" c="dimmed">
          <kbd style={{ padding: '1px 4px', background: 'var(--bg-secondary)', borderRadius: 3, border: '1px solid var(--border)', fontSize: 10 }}>
            ↑↓
          </kbd>{' '}Navigate
        </Text>
        <Text size="xs" c="dimmed">
          <kbd style={{ padding: '1px 4px', background: 'var(--bg-secondary)', borderRadius: 3, border: '1px solid var(--border)', fontSize: 10 }}>
            ↵
          </kbd>{' '}Select
        </Text>
        <Text size="xs" c="dimmed">
          <kbd style={{ padding: '1px 4px', background: 'var(--bg-secondary)', borderRadius: 3, border: '1px solid var(--border)', fontSize: 10 }}>
            Esc
          </kbd>{' '}Close
        </Text>
      </Group>
    </Modal>
  );
}
