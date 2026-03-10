import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Group, Skeleton, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconHash, IconPin, IconPinnedOff, IconUsers, IconSearch, IconCalendar, IconMessage2 } from '@tabler/icons-react';
import { useMessages, usePinnedMessages, useUnpinMessage, type Message } from '../../hooks/useMessages';
import { useUIStore } from '../../stores/uiStore';
import { useChannels } from '../../hooks/useChannels';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import { TypingIndicator } from '../messages/TypingIndicator';
import { SearchPanel } from '../ui/SearchPanel';
import { ServerEventsPanel } from '../ui/ServerEventsPanel';
import { ThreadPanel, ThreadList } from '../ui/ThreadPanel';

export function ChatPanel() {
  const activeChannelId = useUIStore((s) => s.activeChannelId);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const toggleMemberList = useUIStore((s) => s.toggleMemberList);
  const memberListVisible = useUIStore((s) => s.memberListVisible);
  const { data: channels } = useChannels(activeServerId);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const openThread = useUIStore((s) => s.openThread);
  const closeThread = useUIStore((s) => s.closeThread);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  // Listen for toggle from server dropdown menu
  useEffect(() => {
    const handler = () => setEventsOpen((v) => !v);
    window.addEventListener('toggleServerEvents', handler);
    return () => window.removeEventListener('toggleServerEvents', handler);
  }, []);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const { data: pinnedMessages } = usePinnedMessages(activeChannelId);
  const unpinMessage = useUnpinMessage(activeChannelId || '');

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
        <Tooltip label={eventsOpen ? 'Hide Events' : 'Server Events'} position="bottom" withArrow>
          <ActionIcon
            variant={eventsOpen ? 'light' : 'subtle'}
            color={eventsOpen ? 'brand' : 'gray'}
            size={28}
            onClick={() => setEventsOpen((v) => !v)}
          >
            <IconCalendar size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={pinnedOpen ? 'Hide Pinned' : 'Pinned Messages'} position="bottom" withArrow>
          <ActionIcon
            variant={pinnedOpen ? 'light' : 'subtle'}
            color={pinnedOpen ? 'yellow' : 'gray'}
            size={28}
            onClick={() => setPinnedOpen((v) => !v)}
          >
            <IconPin size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={threadsOpen ? 'Hide Threads' : 'Threads'} position="bottom" withArrow>
          <ActionIcon
            variant={threadsOpen ? 'light' : 'subtle'}
            color={threadsOpen ? 'brand' : 'gray'}
            size={28}
            onClick={() => setThreadsOpen((v) => !v)}
          >
            <IconMessage2 size={18} />
          </ActionIcon>
        </Tooltip>
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

      {/* Pinned messages panel */}
      {pinnedOpen && (
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          maxHeight: 300,
          overflow: 'auto',
          padding: '8px 16px',
        }}>
          <Group justify="space-between" mb={8}>
            <Text size="sm" fw={600}>Pinned Messages</Text>
            <ActionIcon variant="subtle" color="gray" size={20} onClick={() => setPinnedOpen(false)}>
              <Text size="xs">×</Text>
            </ActionIcon>
          </Group>
          {(!pinnedMessages || pinnedMessages.length === 0) ? (
            <Text size="xs" c="dimmed" py={8}>No pinned messages</Text>
          ) : (
            <Stack gap={4}>
              {pinnedMessages.map((msg) => (
                <div key={msg.id} style={{
                  padding: '6px 8px',
                  background: 'var(--bg-primary)',
                  borderRadius: 4,
                  borderLeft: '3px solid var(--accent)',
                }}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" fw={600} c="dimmed" truncate>{msg.author?.username || 'Unknown'}</Text>
                    <Tooltip label="Unpin" position="left" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="yellow"
                        size={20}
                        onClick={() => unpinMessage.mutate(msg.id)}
                      >
                        <IconPinnedOff size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Text size="sm" lineClamp={2}>{msg.content}</Text>
                </div>
              ))}
            </Stack>
          )}
        </div>
      )}

      {/* Thread list dropdown */}
      {threadsOpen && activeChannelId && !activeThreadId && (
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          maxHeight: 260,
          overflow: 'auto',
        }}>
          <ThreadList
            channelId={activeChannelId}
            onSelectThread={(id) => { openThread(id); setThreadsOpen(false); }}
          />
        </div>
      )}

      {/* Main content area — chat + optional thread panel side by side */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Chat / Events column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {eventsOpen && activeServerId ? (
            <ServerEventsPanel serverId={activeServerId} />
          ) : (
            <>
              <MessageList channelId={activeChannelId} />
              <TypingIndicator channelId={activeChannelId} />
              <MessageInput channelId={activeChannelId} channelName={activeChannel?.name || 'channel'} />
            </>
          )}
        </div>

        {/* Thread panel (side panel) */}
        {activeThreadId && activeChannelId && (
          <ThreadPanel
            threadId={activeThreadId}
            channelId={activeChannelId}
            onClose={closeThread}
          />
        )}
      </div>
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
  const endRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Pages are fetched newest-first; reverse page order so oldest page comes first, then flatten
  const messages = data?.pages ? [...data.pages].reverse().flatMap((page) => page) : [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      endRef.current?.scrollIntoView({ behavior: prevLengthRef.current === 0 ? 'instant' : 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (isLoading) return <MessageSkeleton />;

  // Group consecutive messages from same author
  const groups: Message[][] = [];
  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && msg.author && !msg.system_event && !lastGroup[0].system_event
        && lastGroup[0].author?.id && lastGroup[0].author.id === msg.author.id) {
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
        <div ref={endRef} />
      </Stack>
    </ScrollArea>
  );
}
