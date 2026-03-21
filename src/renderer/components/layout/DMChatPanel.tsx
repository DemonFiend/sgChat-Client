import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Avatar, Group, Indicator, ScrollArea, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { IconPhone, IconPhoneOff, IconSettings } from '@tabler/icons-react';
import { useDMConversations, useDMMessages, useSendDM } from '../../hooks/useDMConversations';
import { useAuthStore } from '../../stores/authStore';
import { emitJoinDM, emitLeaveDM, emitDMAck } from '../../api/socket';
import { usePresenceStore } from '../../stores/presenceStore';
import { joinDMVoice, leaveDMVoice, toggleDMMute, toggleDMVideo, onDMVoiceEvent } from '../../lib/dmVoiceService';
import { DMVoiceControls } from '../ui/DMVoiceControls';
import { DMSettingsModal } from '../ui/DMSettingsModal';
import { toastStore } from '../../stores/toastNotifications';
import { MessageGroup } from '../messages/MessageGroup';
import { MessageInput } from '../messages/MessageInput';
import { DMCallArea } from '../ui/DMCallArea';
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
  const otherUser = conversation?.participants?.find((p) => p.id !== user?.id) || conversation?.participants?.[0];
  const status = usePresenceStore((s) => (otherUser ? s.statuses[otherUser.id] : undefined) || 'offline');
  const statusColor = STATUS_COLORS[status] || 'gray';

  // Pages are fetched newest-first; reverse page order so oldest page comes first, then flatten
  const messages = data?.pages ? [...data.pages].reverse().flatMap((page) => page) : [];

  // Subscribe to DM room on mount, unsubscribe on unmount or conversation change
  useEffect(() => {
    if (!otherUser?.id) return;
    emitJoinDM(otherUser.id);
    return () => { emitLeaveDM(otherUser.id); };
  }, [otherUser?.id]);

  // Acknowledge messages when they're loaded/viewed
  useEffect(() => {
    if (!messages.length) return;
    const unackedIds = messages.slice(-10).map((m) => m.id);
    if (unackedIds.length > 0) {
      emitDMAck(unackedIds);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = (content: string) => {
    sendDM.mutate(content);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      endRef.current?.scrollIntoView({ behavior: prevLengthRef.current === 0 ? 'instant' : 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <DMHeader username={otherUser?.username} status={status} statusColor={statusColor} avatarUrl={otherUser?.avatar_url} conversationId={conversationId} />
        <MessageSkeleton />
      </div>
    );
  }

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
        conversationId={conversationId}
      />

      {/* DM Call Area */}
      <DMCallArea
        dmChannelId={conversationId}
        friendName={otherUser?.username || 'Unknown'}
        friendAvatarUrl={otherUser?.avatar_url}
        currentUserAvatarUrl={user?.avatar_url}
        currentUserDisplayName={user?.display_name || user?.username}
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
          <div ref={endRef} />
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

function DMHeader({ username, status, statusColor, avatarUrl, conversationId }: {
  username?: string;
  status: string;
  statusColor: string;
  avatarUrl?: string;
  conversationId: string;
}) {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const cleanup = onDMVoiceEvent((event) => {
      switch (event) {
        case 'connected':
          setIsInCall(true);
          break;
        case 'disconnected':
          setIsInCall(false);
          setIsMuted(false);
          setIsVideoOn(false);
          break;
      }
    });
    return cleanup;
  }, []);

  const handleCall = async () => {
    const result = await joinDMVoice(conversationId);
    if (!result.success) {
      toastStore.addToast({ type: 'warning', title: 'Call Failed', message: result.error || 'Could not start call' });
    }
  };

  const handleToggleMute = async () => {
    const nowEnabled = await toggleDMMute();
    setIsMuted(!nowEnabled);
  };

  const handleToggleVideo = async () => {
    const nowEnabled = await toggleDMVideo();
    setIsVideoOn(nowEnabled);
  };

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
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder styles={{ indicator: { transition: 'background-color 300ms ease' } }}>
        <Avatar src={avatarUrl} size={28} radius="xl" color="brand">
          {username?.charAt(0).toUpperCase() || '?'}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm" truncate>{username || 'Unknown'}</Text>
      </div>
      <Text size="xs" c="dimmed">{STATUS_LABELS[status] || 'Offline'}</Text>
      <DMVoiceControls
        isInCall={isInCall}
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        onCall={handleCall}
        onHangup={leaveDMVoice}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
      />
      <Tooltip label="DM Settings" position="bottom" withArrow>
        <ActionIcon variant="subtle" color="gray" size={28} onClick={() => setSettingsOpen(true)}>
          <IconSettings size={16} />
        </ActionIcon>
      </Tooltip>
      <DMSettingsModal opened={settingsOpen} onClose={() => setSettingsOpen(false)} dmId={conversationId} />
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
