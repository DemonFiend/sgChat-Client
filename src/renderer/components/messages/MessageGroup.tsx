import { useState } from 'react';
import { Avatar, Group, Text } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
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

  // System message — centered italic text, no avatar
  if (firstMsg.system_event || !firstMsg.author) {
    return (
      <div style={{ padding: '4px 48px', textAlign: 'center' }}>
        <Group gap={6} justify="center">
          <IconArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          <Text size="xs" c="dimmed" fs="italic">{firstMsg.content}</Text>
          <Text size="xs" c="dimmed">{timeStr}</Text>
        </Group>
      </div>
    );
  }

  const displayName = firstMsg.author.display_name || firstMsg.author.username;
  const nameColor = firstMsg.author.role_color || 'var(--text-primary)';

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
        {displayName.charAt(0).toUpperCase()}
      </Avatar>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Group gap={8} align="baseline">
          <Text fw={600} size="sm" style={{ color: nameColor }}>
            {displayName}
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
