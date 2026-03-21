import { useState } from 'react';
import { Avatar, Group, Text, UnstyledButton } from '@mantine/core';
import { IconArrowRight, IconEyeOff, IconLock } from '@tabler/icons-react';
import { MessageItem } from './MessageItem';
import type { Message } from '../../hooks/useMessages';
import { useBlockedUsersStore } from '../../stores/blockedUsersStore';
import { useIgnoredUsersStore } from '../../stores/ignoredUsersStore';

interface MessageGroupProps {
  messages: Message[];
  channelId: string;
  /** Whether this group arrived via real-time (socket), not initial fetch */
  isNew?: boolean;
}

export function MessageGroup({ messages, channelId, isNew }: MessageGroupProps) {
  const [hovered, setHovered] = useState(false);
  const [blockedRevealed, setBlockedRevealed] = useState(false);
  const [ignoredRevealed, setIgnoredRevealed] = useState(false);
  const firstMsg = messages[0];
  const date = new Date(firstMsg.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Safe selectors: select the function ref (stable)
  const isBlocked = useBlockedUsersStore((s) => s.isBlocked);
  const isIgnored = useIgnoredUsersStore((s) => s.isIgnored);

  const authorId = firstMsg.author?.id;
  const blocked = authorId ? isBlocked(authorId) : false;
  const ignored = !blocked && authorId ? isIgnored(authorId) : false;

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

  // Blocked user — collapsed placeholder
  if (blocked && !blockedRevealed) {
    return (
      <UnstyledButton
        onClick={() => setBlockedRevealed(true)}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 16px',
          margin: '2px 0',
          background: 'var(--bg-secondary)',
          borderRadius: 4,
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
      >
        <Group gap={8}>
          <IconLock size={14} style={{ color: 'var(--text-muted)' }} />
          <Text size="sm" c="dimmed" fs="italic">
            Blocked message — click to reveal
          </Text>
        </Group>
      </UnstyledButton>
    );
  }

  // Build the actual message content
  const messageContent = (
    <div
      className={isNew ? 'message-fade-in' : undefined}
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
          {blockedRevealed && (
            <UnstyledButton onClick={() => setBlockedRevealed(false)}>
              <Text size="xs" c="dimmed" td="underline">hide</Text>
            </UnstyledButton>
          )}
          {ignoredRevealed && (
            <UnstyledButton onClick={() => setIgnoredRevealed(false)}>
              <Text size="xs" c="dimmed" td="underline">hide</Text>
            </UnstyledButton>
          )}
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

  // Ignored user — blurred overlay
  if (ignored && !ignoredRevealed) {
    return (
      <div style={{ position: 'relative', margin: '2px 0' }}>
        <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
          {messageContent}
        </div>
        <UnstyledButton
          onClick={() => setIgnoredRevealed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <Group gap={6}>
            <IconEyeOff size={14} style={{ color: 'var(--text-muted)' }} />
            <Text size="sm" c="dimmed" fs="italic" fw={500}>
              Message from ignored user — click to reveal
            </Text>
          </Group>
        </UnstyledButton>
      </div>
    );
  }

  return messageContent;
}
