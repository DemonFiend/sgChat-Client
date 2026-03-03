import { useState, useCallback } from 'react';
import { ActionIcon, Group, Modal, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';

interface SearchResult {
  id: string;
  content: string;
  author: { id: string; username: string };
  channel_id: string;
  created_at: string;
}

interface SearchPanelProps {
  opened: boolean;
  onClose: () => void;
  channelId: string;
}

export function SearchPanel({ opened, onClose, channelId }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const setActiveChannel = useUIStore((s) => s.setActiveChannel);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', channelId, query],
    queryFn: () => api.get<SearchResult[]>(
      `/api/channels/${channelId}/messages?search=${encodeURIComponent(query)}&limit=25`
    ),
    enabled: opened && query.length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    setActiveChannel(result.channel_id);
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
