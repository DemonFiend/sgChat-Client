import { useState, useCallback } from 'react';
import { ActionIcon, Button, Checkbox, Group, Modal, ScrollArea, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';

interface SearchResult {
  id: string;
  content: string;
  highlighted_content?: string;
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

const PAGE_SIZE = 25;

/** Render highlighted_content with <mark> tag support. */
function HighlightedContent({ content, highlighted }: { content: string; highlighted?: string }) {
  if (!highlighted) {
    return (
      <Text size="sm" lineClamp={2} style={{ color: 'var(--text-primary)' }}>
        {content}
      </Text>
    );
  }

  // Server returns highlighted_content with <mark>...</mark> tags
  const parts = highlighted.split(/(<mark>.*?<\/mark>)/g);
  return (
    <Text size="sm" lineClamp={2} style={{ color: 'var(--text-primary)' }}>
      {parts.map((part, i) => {
        const markMatch = part.match(/^<mark>(.*?)<\/mark>$/);
        if (markMatch) {
          return (
            <mark
              key={i}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 2,
                padding: '0 2px',
              }}
            >
              {markMatch[1]}
            </mark>
          );
        }
        return part;
      })}
    </Text>
  );
}

export function SearchPanel({ opened, onClose, channelId }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'channel' | 'server' | 'dms'>('channel');
  const [page, setPage] = useState(0);
  const [hasFiles, setHasFiles] = useState(false);
  const setActiveChannel = useUIStore((s) => s.setActiveChannel);
  const activeDMId = useUIStore((s) => s.activeDMId);

  // Reset page when query, scope, or filter changes
  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setPage(0);
  }, []);

  const handleScopeChange = useCallback((val: string) => {
    setScope(val as 'channel' | 'server' | 'dms');
    setPage(0);
  }, []);

  const handleHasFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasFiles(e.currentTarget.checked);
    setPage(0);
  }, []);

  const offset = page * PAGE_SIZE;

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', scope, scope === 'channel' ? channelId : scope === 'dms' ? activeDMId : 'global', query, offset, hasFiles],
    queryFn: () => {
      const q = encodeURIComponent(query);
      const fileParam = hasFiles ? '&has_files=true' : '';
      if (scope === 'server') {
        return api.get<SearchResult[]>(`/api/search/messages?q=${q}&limit=${PAGE_SIZE}&offset=${offset}${fileParam}`);
      }
      if (scope === 'dms' && activeDMId) {
        return api.get<SearchResult[]>(`/api/dms/${activeDMId}/messages/search?q=${q}&limit=${PAGE_SIZE}&offset=${offset}${fileParam}`);
      }
      return api.get<SearchResult[]>(
        `/api/channels/${channelId}/messages?search=${q}&limit=${PAGE_SIZE}&offset=${offset}${fileParam}`
      );
    },
    enabled: opened && query.length >= 2,
  });

  const handleResultClick = (result: SearchResult) => {
    if (result.channel_id) setActiveChannel(result.channel_id);
    onClose();
  };

  const hasMore = results && results.length === PAGE_SIZE;

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
          onChange={handleScopeChange}
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
          onChange={(e) => handleQueryChange(e.currentTarget.value)}
          autoFocus
          rightSection={
            query ? (
              <ActionIcon aria-label="Clear search" variant="subtle" color="gray" size={20} onClick={() => handleQueryChange('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
        />

        <Checkbox
          label="Has files"
          size="xs"
          checked={hasFiles}
          onChange={handleHasFilesChange}
          styles={{
            label: { color: 'var(--text-secondary)', fontSize: 12 },
          }}
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
                <HighlightedContent
                  content={result.content}
                  highlighted={result.highlighted_content}
                />
              </div>
            ))}
          </Stack>

          {/* Pagination controls */}
          {query.length >= 2 && !isFetching && (results?.length ?? 0) > 0 && (
            <Group justify="center" mt={12} gap={8}>
              {page > 0 && (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
              )}
              <Text size="xs" c="dimmed">
                Page {page + 1}
              </Text>
              {hasMore && (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Load more
                </Button>
              )}
            </Group>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
