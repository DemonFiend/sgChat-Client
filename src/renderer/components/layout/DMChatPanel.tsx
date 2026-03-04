import { useRef, useState } from 'react';
import { ActionIcon, Avatar, Group, Indicator, ScrollArea, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconPhone, IconPhoneOff } from '@tabler/icons-react';
import { useDMConversations, useDMMessages, useSendDM } from '../../hooks/useDMConversations';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import type { Message } from '../../hooks/useMessages';

const STATUS_COLORS: Record<string, string> = {
  online: 'green',
  idle: 'yellow',
  dnd: 'red',
  offline: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

interface DMChatPanelProps {
  conversationId: string;
}

export function DMChatPanel({ conversationId }: DMChatPanelProps) {
  const user = useAuthStore((s) => s.user);
  const { data: conversations } = useDMConversations();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useDMMessages(conversationId);
  const sendDM = useSendDM(conversationId);

  const conversation = conversations?.find((c) => c.id === conversationId);
  const otherUser = conversation?.participants.find((p) => p.id !== user?.id) || conversation?.participants[0];
  const status = usePresenceStore((s) => otherUser ? s.getStatus(otherUser.id) : 'offline');
  const statusColor = STATUS_COLORS[status] || 'gray';

  const handleSendMessage = (content: string) => {
    sendDM.mutate(content);
  };

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <DMHeader username={otherUser?.username} status={status} statusColor={statusColor} avatarUrl={otherUser?.avatar_url} />
        <MessageSkeleton />
      </div>
    );
  }

  const messages = data?.pages.flatMap((page) => page).reverse() || [];

  // Group consecutive messages from same author
  const groups: Message[][] = [];
  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].author.id === msg.author.id) {
      const timeDiff = new Date(msg.created_at).getTime() - new Date(lastGroup[lastGroup.length - 1].created_at).getTime();
      if (timeDiff < 5 * 60 * 1000) {
        lastGroup.push(msg);
        continue;
      }
    }
    groups.push([msg]);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', minWidth: 0 }}>
      {/* Header */}
      <DMHeader
        username={otherUser?.username}
        status={status}
        statusColor={statusColor}
        avatarUrl={otherUser?.avatar_url}
      />

      {/* Messages */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
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

          {messages.length === 0 && (
            <Stack align="center" gap={8} py={32}>
              {otherUser && (
                <Avatar src={otherUser.avatar_url} size={64} radius="xl" color="brand">
                  {otherUser.username.charAt(0).toUpperCase()}
                </Avatar>
              )}
              <Text fw={600}>{otherUser?.username}</Text>
              <Text size="sm" c="dimmed">
                This is the beginning of your conversation with {otherUser?.username}.
              </Text>
            </Stack>
          )}

          {groups.map((group) => (
            <MessageGroup key={group[0].id} messages={group} />
          ))}
        </Stack>
      </ScrollArea>

      {/* Message input */}
      <MessageInput
        channelId={conversationId}
        channelName={otherUser?.username || 'DM'}
        onSendOverride={handleSendMessage}
      />
    </div>
  );
}

function DMHeader({ username, status, statusColor, avatarUrl }: {
  username?: string;
  status: string;
  statusColor: string;
  avatarUrl?: string;
}) {
  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      gap: 10,
    }}>
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={avatarUrl} size={28} radius="xl" color="brand">
          {username?.charAt(0).toUpperCase() || '?'}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm" truncate>{username || 'Unknown'}</Text>
      </div>
      <Text size="xs" c="dimmed">{STATUS_LABELS[status] || 'Offline'}</Text>
      <Tooltip label="Start Voice Call" position="bottom" withArrow>
        <ActionIcon variant="subtle" color="gray" size={28}>
          <IconPhone size={16} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <Stack gap={16} p={16} style={{ flex: 1 }}>
      {[...Array(4)].map((_, i) => (
        <Group key={i} gap={12} align="flex-start">
          <Skeleton circle height={40} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Group gap={8}>
              <Skeleton height={12} width={100} radius="sm" />
              <Skeleton height={10} width={60} radius="sm" />
            </Group>
            <Skeleton height={12} width={`${60 + Math.random() * 35}%`} radius="sm" />
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}
