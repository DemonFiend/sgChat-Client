import { useState, useEffect, useMemo } from 'react';
import { Group, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconHash, IconMessageCircle, IconSearch, IconVolume } from '@tabler/icons-react';
import { useChannels, type Channel } from '../../hooks/useChannels';
import { useUIStore } from '../../stores/uiStore';
import { useUnreadStore } from '../../stores/unreadStore';

export function CommandPalette() {
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const { activeServerId, setActiveChannel, setView } = useUIStore();
  const { data: channels } = useChannels(activeServerId);

  // Listen for Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpened(true);
        setQuery('');
      }
      if (e.key === 'Escape' && opened) {
        setOpened(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opened]);

  const nonCategoryChannels = useMemo(
    () => (channels || []).filter((c) => c.type !== 'category'),
    [channels]
  );

  const filtered = useMemo(() => {
    if (!query) return nonCategoryChannels;
    const lower = query.toLowerCase();
    return nonCategoryChannels.filter((c) => c.name.toLowerCase().includes(lower));
  }, [nonCategoryChannels, query]);

  const handleSelect = (channel: Channel) => {
    if (channel.type === 'voice' || channel.type === 'temp_voice') {
      // Could join voice, but for now just navigate
    }
    setActiveChannel(channel.id);
    useUnreadStore.getState().markRead(channel.id);
    setOpened(false);
  };

  const getIcon = (type: string) => {
    if (type === 'voice' || type === 'temp_voice') return IconVolume;
    return IconHash;
  };

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
        placeholder="Jump to a channel..."
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        autoFocus
        variant="unstyled"
        styles={{
          input: {
            padding: '12px 16px',
            fontSize: '0.95rem',
            borderBottom: '1px solid var(--border)',
          },
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length > 0) {
            handleSelect(filtered[0]);
          }
        }}
      />

      <ScrollArea style={{ maxHeight: 300 }}>
        <Stack gap={0} p={4}>
          {filtered.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py={20}>
              No channels found
            </Text>
          )}
          {filtered.map((channel) => {
            const Icon = getIcon(channel.type);
            return (
              <UnstyledButton
                key={channel.id}
                onClick={() => handleSelect(channel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 4,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <Text size="sm" style={{ flex: 1 }}>{channel.name}</Text>
                <Text size="xs" c="dimmed">{channel.type}</Text>
              </UnstyledButton>
            );
          })}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
