import { useState } from 'react';
import { ActionIcon, Group, Modal, ScrollArea, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';

interface SearchResult {
  id: string;
  content: string;
  author: { id: string; username: string };
  channel_id: string;
  channel_name?: string;
  created_at: string;
}

interface SearchPanelProps {
  opened: boolean;
  onClose: () => void;
  channelId: string;
}

export function SearchPanel({ opened, onClose, channelId }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'channel' | 'server' | 'dms'>('channel');
  const setActiveChannel = useUIStore((s) => s.setActiveChannel);
  const activeDMId = useUIStore((s) => s.activeDMId);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', scope, scope === 'channel' ? channelId : scope === 'dms' ? activeDMId : 'global', query],
    queryFn: () => {
      const q = encodeURIComponent(query);
      if (scope === 'server') {
        return api.get<SearchResult[]>(`/api/search/messages?q=${q}&limit=25`);
      }
      if (scope === 'dms' && activeDMId) {
        return api.get<SearchResult[]>(`/api/dms/${activeDMId}/messages/search?q=${q}&limit=25`);
      }
      return api.get<SearchResult[]>(
        `/api/channels/${channelId}/messages?search=${q}&limit=25`
      );
    },
    enabled: opened && query.length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    if (result.channel_id) setActiveChannel(result.channel_id);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Search Messages"
      centered
      size="lg"
    >
      <Stack gap={12}>
        <SegmentedControl
          value={scope}
          onChange={(v) => setScope(v as 'channel' | 'server' | 'dms')}
          data={[
            { label: 'This Channel', value: 'channel' },
            { label: 'All Channels', value: 'server' },
            { label: 'DMs', value: 'dms' },
          ]}
          size="xs"
        />
        <TextInput
          placeholder="Search messages..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          autoFocus
          rightSection={
            query ? (
              <ActionIcon variant="subtle" color="gray" size={20} onClick={() => setQuery('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
        />

        <ScrollArea style={{ maxHeight: 400 }}>
          {isFetching && (
            <Text size="sm" c="dimmed" ta="center" py={16}>Searching...</Text>
          )}

          {!isFetching && results && results.length === 0 && query.length >= 2 && (
            <Text size="sm" c="dimmed" ta="center" py={16}>No results found.</Text>
          )}

          {!isFetching && query.length < 2 && (
            <Text size="sm" c="dimmed" ta="center" py={16}>Type at least 2 characters to search.</Text>
          )}

          <Stack gap={4}>
            {(results || []).map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  background: 'var(--bg-hover)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              >
                <Group gap={8} mb={2}>
                  <Text size="xs" fw={600}>{result.author.username}</Text>
                  {result.channel_name && scope === 'server' && (
                    <Text size="xs" c="dimmed">#{result.channel_name}</Text>
                  )}
                  <Text size="xs" c="dimmed">
                    {new Date(result.created_at).toLocaleString()}
                  </Text>
                </Group>
                <Text size="sm" lineClamp={2} style={{ color: 'var(--text-primary)' }}>
                  {result.content}
                </Text>
              </div>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
