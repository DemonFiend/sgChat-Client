import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Group, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconHash, IconPin, IconPinnedOff, IconUsers, IconSearch, IconCalendar, IconMessage2 } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMessages, usePinnedMessages, useUnpinMessage, type Message } from '../../hooks/useMessages';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useChannels } from '../../hooks/useChannels';
import { useServers } from '../../hooks/useServers';
import { api, resolveAssetUrl } from '../../lib/api';
import { MentionProvider } from '../../contexts/MentionContext';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import { TypingIndicator } from '../messages/TypingIndicator';
import { SearchPanel } from '../ui/SearchPanel';
import { ServerEventsPanel } from '../ui/ServerEventsPanel';
import { ThreadPanel, ThreadList } from '../ui/ThreadPanel';

export function ChatPanel() {
  const activeChannelId = useUIStore((s) => s.activeChannelId);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const toggleMemberList = useUIStore((s) => s.toggleMemberList);
  const memberListVisible = useUIStore((s) => s.memberListVisible);
  const { data: channels } = useChannels(activeServerId);
  const { data: servers } = useServers();
  const activeServer = servers?.find((s) => s.id === activeServerId);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const openThread = useUIStore((s) => s.openThread);
  const closeThread = useUIStore((s) => s.closeThread);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const eventsOpen = useUIStore((s) => s.eventsOpen);
  const toggleEventsPanel = useUIStore((s) => s.toggleEventsPanel);

  // Fetch roles & members for mention resolution (distinct query keys to avoid colliding with MemberList's transformations)
  const { data: roles } = useQuery({
    queryKey: ['mention-roles', activeServerId],
    queryFn: () => api.getArray<{ id: string; name: string; color?: string }>(`/api/servers/${activeServerId}/roles`),
    enabled: !!activeServerId,
    staleTime: 60_000,
  });

  const { data: members } = useQuery({
    queryKey: ['mention-members', activeServerId],
    queryFn: async () => {
      const raw = await api.getArray<any>(`/api/servers/${activeServerId}/members`);
      return raw.map((m: any) => ({ id: m.user_id || m.id, username: m.username, display_name: m.display_name, avatar_url: m.avatar_url }));
    },
    enabled: !!activeServerId,
    staleTime: 60_000,
  });

  const rolesMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string | null }>();
    try {
      if (roles) for (const r of roles) if (r?.id) m.set(r.id, { name: r.name || 'Unknown', color: r.color || null });
    } catch { /* ignore malformed role data */ }
    return m;
  }, [roles]);

  const membersMap = useMemo(() => {
    const m = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();
    try {
      if (members) for (const u of members) if (u?.id) m.set(u.id, { username: u.username || 'Unknown', display_name: u.display_name || null, avatar_url: u.avatar_url || null });
    } catch { /* ignore malformed member data */ }
    return m;
  }, [members]);

  const channelsMap = useMemo(() => {
    const m = new Map<string, { name: string; type: string }>();
    try {
      if (channels) for (const c of channels) if (c?.id) m.set(c.id, { name: c.name || 'unknown', type: c.type || 'text' });
    } catch { /* ignore malformed channel data */ }
    return m;
  }, [channels]);

  const mentionValue = useMemo(() => ({
    members: membersMap,
    channels: channelsMap,
    roles: rolesMap,
    currentUserId,
  }), [membersMap, channelsMap, rolesMap, currentUserId]);

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
    <MentionProvider value={mentionValue}>
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* Channel header */}
      <div style={{
        height: activeServer?.banner_url ? 80 : 48,
        display: 'flex',
        alignItems: activeServer?.banner_url ? 'flex-end' : 'center',
        padding: activeServer?.banner_url ? '0 16px 8px' : '0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {activeServer?.banner_url && (
          <>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${resolveAssetUrl(activeServer.banner_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 0,
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%)',
              zIndex: 1,
            }} />
          </>
        )}
        <IconHash size={20} style={{ color: 'var(--text-muted)', flexShrink: 0, position: 'relative', zIndex: 2 }} />
        <Text fw={600} size="sm" truncate style={{ flex: 1, position: 'relative', zIndex: 2 }}>
          {activeChannel?.name || 'Channel'}
        </Text>
        {activeChannel?.topic && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', position: 'relative', zIndex: 2 }} />
            <Text size="xs" c="dimmed" truncate style={{ flex: 1, maxWidth: 300, position: 'relative', zIndex: 2 }}>
              {activeChannel.topic}
            </Text>
          </>
        )}
        <Tooltip label={eventsOpen ? 'Hide Events' : 'Server Events'} position="bottom" withArrow>
          <ActionIcon
            variant={eventsOpen ? 'light' : 'subtle'}
            color={eventsOpen ? 'brand' : 'gray'}
            size={28}
            onClick={toggleEventsPanel}
            style={{ position: 'relative', zIndex: 2 }}
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
            style={{ position: 'relative', zIndex: 2 }}
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
            style={{ position: 'relative', zIndex: 2 }}
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
            style={{ position: 'relative', zIndex: 2 }}
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
            style={{ position: 'relative', zIndex: 2 }}
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
        <div className="panel-slide-enter" style={{
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
        <div className="panel-slide-enter" style={{
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
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Chat / Events column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {eventsOpen && activeServerId ? (
            <ServerEventsPanel serverId={activeServerId} />
          ) : (
            <>
              <MessageList channelId={activeChannelId} channelName={activeChannel?.name} channelTopic={activeChannel?.topic} />
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
    </MentionProvider>
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

/**
 * Virtualised message list using @tanstack/react-virtual.
 * Handles variable-height message groups, scroll-to-bottom on new messages,
 * and loading older messages when scrolling up.
 */
function MessageList({ channelId, channelName, channelTopic }: { channelId: string; channelName?: string; channelTopic?: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(channelId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevGroupCountRef = useRef(0);
  const newMessageThresholdRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const initialScrollDone = useRef(false);

  // Reset scroll state when channel changes
  useEffect(() => {
    initialScrollDone.current = false;
    prevGroupCountRef.current = 0;
    newMessageThresholdRef.current = 0;
    isAtBottomRef.current = true;
  }, [channelId]);

  // Pages are fetched newest-first; reverse page order so oldest page comes first, then flatten
  const messages = useMemo(
    () => data?.pages ? [...data.pages].reverse().flatMap((page) => page) : [],
    [data?.pages],
  );

  // Group consecutive messages from same author (memoised to keep stable references)
  const groups = useMemo(() => {
    const result: Message[][] = [];
    for (const msg of messages) {
      const lastGroup = result[result.length - 1];
      if (lastGroup && msg.author?.id && !msg.system_event && !lastGroup[0].system_event
          && lastGroup[0].author?.id && lastGroup[0].author.id === msg.author.id) {
        const timeDiff = new Date(msg.created_at).getTime() - new Date(lastGroup[lastGroup.length - 1].created_at).getTime();
        if (timeDiff < 5 * 60 * 1000) {
          lastGroup.push(msg);
          continue;
        }
      }
      result.push([msg]);
    }
    return result;
  }, [messages]);

  // We prepend one virtual item for the header (welcome card or load-more button)
  const HEADER_INDEX = 0;
  const totalCount = groups.length + 1; // +1 for header

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback((index: number) => {
      if (index === HEADER_INDEX) return hasNextPage ? 40 : 180;
      return 64; // Estimated height for a message group
    }, [hasNextPage]),
    overscan: 10,
  });

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    const prevCount = prevGroupCountRef.current;
    const newCount = groups.length;
    prevGroupCountRef.current = newCount;

    if (newCount === 0) {
      initialScrollDone.current = false;
      return;
    }

    if (!initialScrollDone.current) {
      // Initial load — jump to bottom
      virtualizer.scrollToIndex(totalCount - 1, { align: 'end' });
      initialScrollDone.current = true;
      return;
    }

    if (newCount > prevCount && prevCount > 0) {
      // New messages arrived
      newMessageThresholdRef.current = prevCount;
      if (isAtBottomRef.current) {
        // Only auto-scroll if user was at bottom
        virtualizer.scrollToIndex(totalCount - 1, { align: 'end' });
      }
    }
  }, [groups.length, totalCount, virtualizer]);

  // Track whether user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    // Load older messages when scrolled near the top
    if (el.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <MessageSkeleton />;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflow: 'auto',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          // Header item — welcome card or load-more
          if (virtualRow.index === HEADER_INDEX) {
            return (
              <div
                key="header"
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  padding: '0 16px',
                }}
              >
                {hasNextPage ? (
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
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px 24px',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      marginBottom: 12,
                    }}>
                      <IconHash size={36} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <Text fw={700} size="xl" style={{ color: 'var(--text-primary)' }}>
                      Welcome to #{channelName || 'channel'}
                    </Text>
                    {channelTopic && (
                      <Text size="sm" c="dimmed" mt={4}>
                        {channelTopic}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed" mt={8}>
                      This is the beginning of #{channelName || 'channel'}.
                    </Text>
                  </div>
                )}
              </div>
            );
          }

          // Message group items
          const groupIndex = virtualRow.index - 1;
          const group = groups[groupIndex];
          if (!group) return null;

          const groupEndIndex = messages.indexOf(group[group.length - 1]);
          const isNew = newMessageThresholdRef.current > 0 && groupEndIndex >= newMessageThresholdRef.current;

          return (
            <div
              key={group[0].id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                padding: '0 16px',
              }}
            >
              <MessageGroup messages={group} channelId={channelId} isNew={isNew} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
