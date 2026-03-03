import { useState } from 'react';
import { Avatar, Group, Text } from '@mantine/core';
import { MessageItem } from './MessageItem';
import type { Message } from '../../hooks/useMessages';

interface MessageGroupProps {
  messages: Message[];
  channelId: string;
}

export function MessageGroup({ messages, channelId }: MessageGroupProps) {
  const [hovered, setHovered] = useState(false);
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
        background: hovered ? 'var(--bg-hover)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          <Text fw={600} size="sm" style={{ color: 'var(--text-primary)' }}>
            {firstMsg.author.username}
          </Text>
          <Text size="xs" c="dimmed">
            {timeStr}
          </Text>
        </Group>

        {messages.map((msg, i) => (
          <MessageItem
            key={msg.id}
            message={msg}
            channelId={channelId}
            hovered={hovered && i === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
