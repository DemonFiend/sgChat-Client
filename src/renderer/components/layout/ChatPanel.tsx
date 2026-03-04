import { useRef, useState } from 'react';
import { ActionIcon, Group, Skeleton, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconHash, IconUsers, IconSearch } from '@tabler/icons-react';
import { useMessages, type Message } from '../../hooks/useMessages';
import { useUIStore } from '../../stores/uiStore';
import { useChannels } from '../../hooks/useChannels';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import { TypingIndicator } from '../messages/TypingIndicator';
import { SearchPanel } from '../ui/SearchPanel';

export function ChatPanel() {
  const activeChannelId = useUIStore((s) => s.activeChannelId);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const toggleMemberList = useUIStore((s) => s.toggleMemberList);
  const memberListVisible = useUIStore((s) => s.memberListVisible);
  const { data: channels } = useChannels(activeServerId);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  if (!activeChannelId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <Text c="dimmed" size="lg">Select a channel to start chatting</Text>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      minWidth: 0,
    }}>
      {/* Channel header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 8,
      }}>
        <IconHash size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
          {activeChannel?.name || 'Channel'}
        </Text>
        {activeChannel?.topic && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <Text size="xs" c="dimmed" truncate style={{ flex: 1, maxWidth: 300 }}>
              {activeChannel.topic}
            </Text>
          </>
        )}
        <Tooltip label="Search" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={28}
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={memberListVisible ? 'Hide Members' : 'Show Members'} position="bottom" withArrow>
          <ActionIcon
            variant={memberListVisible ? 'light' : 'subtle'}
            color={memberListVisible ? 'brand' : 'gray'}
            size={28}
            onClick={toggleMemberList}
          >
            <IconUsers size={18} />
          </ActionIcon>
        </Tooltip>
      </div>

      {/* Search panel */}
      {activeChannelId && (
        <SearchPanel
          opened={searchOpen}
          onClose={() => setSearchOpen(false)}
          channelId={activeChannelId}
        />
      )}

      {/* Messages */}
      <MessageList channelId={activeChannelId} />

      {/* Typing indicator */}
      <TypingIndicator channelId={activeChannelId} />

      {/* Message input */}
      <MessageInput channelId={activeChannelId} channelName={activeChannel?.name || 'channel'} />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <Stack gap={16} p={16}>
      {[...Array(6)].map((_, i) => (
        <Group key={i} gap={12} align="flex-start">
          <Skeleton circle height={40} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Group gap={8}>
              <Skeleton height={12} width={100} radius="sm" />
              <Skeleton height={10} width={60} radius="sm" />
            </Group>
            <Skeleton height={12} width={`${60 + Math.random() * 35}%`} radius="sm" />
            {i % 2 === 0 && <Skeleton height={12} width={`${40 + Math.random() * 30}%`} radius="sm" />}
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

function MessageList({ channelId }: { channelId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(channelId);
  const viewportRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <MessageSkeleton />;

  const messages = data?.pages.flatMap((page) => page).reverse() || [];

  // Group consecutive messages from same author
  const groups: Message[][] = [];
  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].author.id === msg.author.id) {
      const timeDiff = new Date(msg.created_at).getTime() - new Date(lastGroup[lastGroup.length - 1].created_at).getTime();
      if (timeDiff < 5 * 60 * 1000) { // 5 min grouping
        lastGroup.push(msg);
        continue;
      }
    }
    groups.push([msg]);
  }

  return (
    <ScrollArea
      style={{ flex: 1 }}
      viewportRef={viewportRef}
      scrollbarSize={6}
      type="hover"
    >
      <Stack gap={0} p={16} pb={4}>
        {hasNextPage && (
          <Text
            size="xs"
            c="dimmed"
            ta="center"
            py={8}
            style={{ cursor: 'pointer' }}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more messages'}
          </Text>
        )}
        {groups.map((group, i) => (
          <MessageGroup key={group[0].id} messages={group} channelId={channelId} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
