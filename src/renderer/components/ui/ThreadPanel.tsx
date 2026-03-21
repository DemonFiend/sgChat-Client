import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Group, ScrollArea, Skeleton, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconArchive, IconLock, IconLockOpen, IconTrash, IconX } from '@tabler/icons-react';
import {
  useThread, useThreadMessages, useSendThreadMessage,
  useUpdateThread, useChannelThreads, type Thread,
} from '../../hooks/useThreads';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import type { Message } from '../../hooks/useMessages';

interface ThreadPanelProps {
  threadId: string;
  channelId: string;
  onClose: () => void;
}

export function ThreadPanel({ threadId, channelId, onClose }: ThreadPanelProps) {
  const { data: thread } = useThread(threadId);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useThreadMessages(threadId);
  const sendMessage = useSendThreadMessage(threadId);
  const updateThread = useUpdateThread(threadId);
  const endRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  const messages = data?.pages ? [...data.pages].reverse().flatMap((page) => page) : [];

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      endRef.current?.scrollIntoView({ behavior: prevLengthRef.current === 0 ? 'instant' : 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Group consecutive messages from same author (5-min window)
  const groups: Message[][] = [];
  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && msg.author?.id && !msg.system_event && !lastGroup[0].system_event
        && lastGroup[0].author?.id && lastGroup[0].author.id === msg.author.id) {
      const timeDiff = new Date(msg.created_at).getTime() - new Date(lastGroup[lastGroup.length - 1].created_at).getTime();
      if (timeDiff < 5 * 60 * 1000) {
        lastGroup.push(msg);
        continue;
      }
    }
    groups.push([msg]);
  }

  return (
    <div style={{
      width: 380,
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        gap: 8,
        flexShrink: 0,
      }}>
        <Tooltip label="Back" position="bottom" withArrow>
          <ActionIcon variant="subtle" color="gray" size={28} onClick={onClose}>
            <IconArrowLeft size={16} />
          </ActionIcon>
        </Tooltip>
        <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
          <Text size="sm" fw={600} truncate>{thread?.name || 'Thread'}</Text>
          <Text size="xs" c="dimmed">{thread?.reply_count ?? messages.length} replies</Text>
        </Stack>
        <Group gap={4}>
          {thread && !thread.archived && (
            <Tooltip label={thread.locked ? 'Unlock' : 'Lock'} position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                color={thread.locked ? 'yellow' : 'gray'}
                size={24}
                onClick={() => updateThread.mutate({ locked: !thread.locked })}
              >
                {thread.locked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={thread?.archived ? 'Unarchive' : 'Archive'} position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              color={thread?.archived ? 'yellow' : 'gray'}
              size={24}
              onClick={() => updateThread.mutate({ archived: !thread?.archived })}
            >
              <IconArchive size={14} />
            </ActionIcon>
          </Tooltip>
          <ActionIcon variant="subtle" color="gray" size={24} onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </div>

      {/* Messages */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
        <Stack gap={0} p={12} pb={4}>
          {hasNextPage && (
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              py={8}
              style={{ cursor: 'pointer' }}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
            </Text>
          )}
          {isLoading ? (
            <Stack gap={12} py={16}>
              {[...Array(3)].map((_, i) => (
                <Group key={i} gap={8} align="flex-start">
                  <Skeleton circle height={32} />
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Skeleton height={10} width={80} radius="sm" />
                    <Skeleton height={10} width="70%" radius="sm" />
                  </Stack>
                </Group>
              ))}
            </Stack>
          ) : messages.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={32}>No messages in this thread yet</Text>
          ) : (
            groups.map((group) => (
              <MessageGroup key={group[0].id} messages={group} channelId={channelId} />
            ))
          )}
          <div ref={endRef} />
        </Stack>
      </ScrollArea>

      {/* Input */}
      {thread && !thread.archived && !thread.locked && (
        <div style={{ padding: '0 8px 8px 8px', flexShrink: 0 }}>
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: 8,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <TextInput
              placeholder="Reply to thread..."
              variant="unstyled"
              style={{ flex: 1 }}
              styles={{ input: { color: 'var(--text-primary)', fontSize: '0.85rem' } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    sendMessage.mutate({ content: val });
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      )}
      {thread?.archived && (
        <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          <Text size="xs" c="dimmed">This thread is archived</Text>
        </div>
      )}
      {thread?.locked && !thread.archived && (
        <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          <Text size="xs" c="dimmed">This thread is locked</Text>
        </div>
      )}
    </div>
  );
}

/* ─── Thread List (for showing threads in channel header) ─── */

interface ThreadListProps {
  channelId: string;
  onSelectThread: (threadId: string) => void;
}

export function ThreadList({ channelId, onSelectThread }: ThreadListProps) {
  const { data: threads, isLoading } = useChannelThreads(channelId);

  if (isLoading) return <Text size="xs" c="dimmed" p={8}>Loading threads...</Text>;
  if (!threads || threads.length === 0) return <Text size="xs" c="dimmed" p={8}>No threads</Text>;

  return (
    <Stack gap={2} p={8}>
      {threads.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: 6,
            cursor: 'pointer',
            borderLeft: t.archived ? '3px solid var(--text-muted)' : '3px solid var(--accent)',
          }}
          onClick={() => onSelectThread(t.id)}
        >
          <Group justify="space-between">
            <Text size="sm" fw={500} truncate style={{ flex: 1 }}>{t.name}</Text>
            {t.archived && <IconArchive size={14} style={{ color: 'var(--text-muted)' }} />}
            {t.locked && <IconLock size={14} style={{ color: 'var(--text-muted)' }} />}
          </Group>
          <Text size="xs" c="dimmed">{t.reply_count ?? 0} replies</Text>
        </div>
      ))}
    </Stack>
  );
}
