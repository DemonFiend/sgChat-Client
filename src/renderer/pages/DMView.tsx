import { Avatar, Group, Indicator, ScrollArea, Stack, Text, Textarea, ActionIcon, UnstyledButton } from '@mantine/core';
import { IconHash, IconUsers, IconSend } from '@tabler/icons-react';
import { useState } from 'react';
import { useDMConversations, useDMMessages, useSendDM, type DMConversation } from '../hooks/useDMConversations';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { MessageGroup } from '../components/messages/MessageGroup';
import { UserPanel } from '../components/layout/UserPanel';

export function DMView() {
  const { activeDMId, setActiveDM, setView } = useUIStore();
  const { data: conversations } = useDMConversations();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* DM sidebar */}
      <div style={{
        width: 240,
        background: '#2b2d31',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #1a1b1e',
          flexShrink: 0,
        }}>
          <Text fw={600} size="sm">Direct Messages</Text>
        </div>

        {/* Friends button */}
        <UnstyledButton
          onClick={() => setView('friends')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            margin: '8px 8px 0',
            borderRadius: 4,
            color: '#e1e1e6',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#35373c'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <IconUsers size={20} />
          <Text size="sm" fw={500}>Friends</Text>
        </UnstyledButton>

        {/* DM list */}
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={16} py={8} style={{ letterSpacing: '0.5px' }}>
          Direct Messages
        </Text>
        <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
          <Stack gap={2} px={8}>
            {conversations?.map((conv) => {
              const otherUser = conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];
              return (
                <DMItem
                  key={conv.id}
                  conversation={conv}
                  otherUser={otherUser}
                  active={activeDMId === conv.id}
                  onClick={() => setActiveDM(conv.id)}
                />
              );
            })}
          </Stack>
        </ScrollArea>

        <UserPanel />
      </div>

      {/* DM chat area */}
      {activeDMId ? (
        <DMChat conversationId={activeDMId} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#313338',
        }}>
          <Text c="dimmed">Select a conversation</Text>
        </div>
      )}
    </>
  );
}

function DMItem({ conversation, otherUser, active, onClick }: {
  conversation: DMConversation;
  otherUser: { id: string; username: string; avatar_url?: string };
  active: boolean;
  onClick: () => void;
}) {
  const statusColor = usePresenceStore((s) => {
    const status = s.getStatus(otherUser.id);
    return { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';
  });

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        background: active ? '#35373c' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#2e3035'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? '#35373c' : 'transparent'; }}
    >
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={otherUser.avatar_url} size={32} radius="xl" color="brand">
          {otherUser.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <Text size="sm" truncate style={{ color: active ? '#e1e1e6' : '#8e8e93' }}>
        {otherUser.username}
      </Text>
    </UnstyledButton>
  );
}

function DMChat({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState('');
  const { data } = useDMMessages(conversationId);
  const sendDM = useSendDM(conversationId);

  const messages = data?.pages.flatMap((page) => page).reverse() || [];

  // Group consecutive messages from same author
  const groups: typeof messages extends (infer T)[] ? T[][] : never = [];
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

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || sendDM.isPending) return;
    sendDM.mutate(trimmed);
    setContent('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#313338' }}>
      {/* DM header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #1a1b1e',
        flexShrink: 0,
      }}>
        <Text fw={600} size="sm">Conversation</Text>
      </div>

      {/* Messages */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
        <Stack gap={0} p={16} pb={4}>
          {groups.map((group) => (
            <MessageGroup key={group[0].id} messages={group} />
          ))}
        </Stack>
      </ScrollArea>

      {/* Input */}
      <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
        <div style={{
          background: '#383a40',
          borderRadius: 8,
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Send a message"
            autosize
            minRows={1}
            maxRows={8}
            variant="unstyled"
            style={{ flex: 1 }}
            styles={{ input: { color: '#dcddde', fontSize: '0.9rem', padding: '6px 0', minHeight: 'unset' } }}
          />
          {content.trim() && (
            <ActionIcon variant="filled" color="brand" size={32} onClick={handleSend} loading={sendDM.isPending}>
              <IconSend size={16} />
            </ActionIcon>
          )}
        </div>
      </div>
    </div>
  );
}
