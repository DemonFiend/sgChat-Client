import { useRef, useCallback } from 'react';
import { ActionIcon, Group, ScrollArea, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { IconHash, IconUsers, IconPaperclip, IconMoodSmile, IconSend } from '@tabler/icons-react';
import { useMessages, useSendMessage, type Message } from '../../hooks/useMessages';
import { useUIStore } from '../../stores/uiStore';
import { useChannels } from '../../hooks/useChannels';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import { TypingIndicator } from '../messages/TypingIndicator';

export function ChatPanel() {
  const { activeChannelId, activeServerId, toggleMemberList, memberListVisible } = useUIStore();
  const { data: channels } = useChannels(activeServerId);

  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  if (!activeChannelId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#313338',
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
      background: '#313338',
      minWidth: 0,
    }}>
      {/* Channel header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #1a1b1e',
        flexShrink: 0,
        gap: 8,
      }}>
        <IconHash size={20} style={{ color: '#8e8e93', flexShrink: 0 }} />
        <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
          {activeChannel?.name || 'Channel'}
        </Text>
        {activeChannel?.topic && (
          <>
            <div style={{ width: 1, height: 20, background: '#3f4147' }} />
            <Text size="xs" c="dimmed" truncate style={{ flex: 1, maxWidth: 300 }}>
              {activeChannel.topic}
            </Text>
          </>
        )}
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

      {/* Messages */}
      <MessageList channelId={activeChannelId} />

      {/* Typing indicator */}
      <TypingIndicator channelId={activeChannelId} />

      {/* Message input */}
      <MessageInput channelId={activeChannelId} channelName={activeChannel?.name || 'channel'} />
    </div>
  );
}

function MessageList({ channelId }: { channelId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(channelId);
  const viewportRef = useRef<HTMLDivElement>(null);

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
          <MessageGroup key={group[0].id} messages={group} />
        ))}
      </Stack>
    </ScrollArea>
  );
}
