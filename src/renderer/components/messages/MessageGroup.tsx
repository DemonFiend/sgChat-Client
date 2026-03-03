import { Avatar, Group, Text } from '@mantine/core';
import { MessageItem } from './MessageItem';
import type { Message } from '../../hooks/useMessages';

interface MessageGroupProps {
  messages: Message[];
}

export function MessageGroup({ messages }: MessageGroupProps) {
  const firstMsg = messages[0];
  const date = new Date(firstMsg.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      style={{
        padding: '4px 0',
        display: 'flex',
        gap: 16,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#2e3035'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <Avatar
        src={firstMsg.author.avatar_url}
        size={40}
        radius="xl"
        color="brand"
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        {firstMsg.author.username.charAt(0).toUpperCase()}
      </Avatar>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Group gap={8} align="baseline">
          <Text fw={600} size="sm" style={{ color: '#e1e1e6' }}>
            {firstMsg.author.username}
          </Text>
          <Text size="xs" c="dimmed">
            {timeStr}
          </Text>
        </Group>

        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
