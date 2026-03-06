import { useState } from 'react';
import { Badge, Group, Loader, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconArchive, IconMessages } from '@tabler/icons-react';
import { useChannelSegments, useSegmentMessages } from '../../hooks/useServerInfo';

interface SegmentBrowserProps {
  channelId: string;
}

export function SegmentBrowser({ channelId }: SegmentBrowserProps) {
  const { data: segments, isLoading } = useChannelSegments(channelId);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  if (isLoading) return <Loader size="sm" />;
  if (!segments || segments.length === 0) {
    return <Text size="sm" c="dimmed">No segments available for this channel.</Text>;
  }

  return (
    <Stack gap={12}>
      <Text size="sm" fw={600}>Message Segments</Text>
      <ScrollArea mah={200}>
        <Stack gap={4}>
          {segments.map((seg: any) => (
            <UnstyledButton
              key={seg.segment_id || seg.id}
              onClick={() => setSelectedSegmentId(seg.segment_id || seg.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: (seg.segment_id || seg.id) === selectedSegmentId ? 'var(--bg-active)' : 'var(--bg-secondary)',
                transition: 'background 0.1s',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text size="xs" fw={500}>
                    {new Date(seg.segment_start).toLocaleDateString()} — {new Date(seg.segment_end).toLocaleDateString()}
                  </Text>
                  <Group gap={8} mt={2}>
                    <Text size="xs" c="dimmed">
                      <IconMessages size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                      {seg.message_count ?? 0} messages
                    </Text>
                    {seg.total_size_bytes != null && (
                      <Text size="xs" c="dimmed">
                        {(seg.total_size_bytes / 1024).toFixed(0)} KB
                      </Text>
                    )}
                  </Group>
                </div>
                {seg.is_archived && (
                  <Badge size="xs" variant="light" color="gray" leftSection={<IconArchive size={10} />}>
                    Archived
                  </Badge>
                )}
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea>

      {selectedSegmentId && (
        <SegmentMessages channelId={channelId} segmentId={selectedSegmentId} />
      )}
    </Stack>
  );
}

function SegmentMessages({ channelId, segmentId }: { channelId: string; segmentId: string }) {
  const { data: messages, isLoading } = useSegmentMessages(channelId, segmentId);

  if (isLoading) return <Loader size="sm" />;
  if (!messages || messages.length === 0) {
    return <Text size="sm" c="dimmed">No messages in this segment.</Text>;
  }

  return (
    <ScrollArea mah={300}>
      <Stack gap={4}>
        {messages.map((msg: any) => (
          <div key={msg.id} style={{ padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
            <Group gap={6}>
              <Text size="xs" fw={600}>{msg.author?.username || 'Unknown'}</Text>
              <Text size="xs" c="dimmed">{new Date(msg.created_at).toLocaleString()}</Text>
            </Group>
            <Text size="sm">{msg.content}</Text>
          </div>
        ))}
      </Stack>
    </ScrollArea>
  );
}
