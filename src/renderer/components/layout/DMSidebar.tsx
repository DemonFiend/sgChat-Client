import { useState } from 'react';
import { ActionIcon, Avatar, Badge, Group, Indicator, ScrollArea, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPhone, IconPlus, IconSearch, IconUsers, IconX } from '@tabler/icons-react';
import { useDMConversations, type DMConversation } from '../../hooks/useDMConversations';
import { useDMVoiceStatus } from '../../hooks/useServerInfo';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useUIStore } from '../../stores/uiStore';
import { UserInfoPanel } from './UserInfoPanel';
import { VoiceBar } from '../voice/VoiceBar';

const STATUS_COLORS: Record<string, string> = {
  online: 'green',
  idle: 'yellow',
  dnd: 'red',
  offline: 'gray',
};

interface DMSidebarProps {
  onCreateDM: () => void;
}

export function DMSidebar({ onCreateDM }: DMSidebarProps) {
  const activeDMId = useUIStore((s) => s.activeDMId);
  const setActiveDM = useUIStore((s) => s.setActiveDM);
  const setView = useUIStore((s) => s.setView);
  const { data: conversations } = useDMConversations();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const filtered = conversations?.filter((conv) => {
    if (!search.trim()) return true;
    const other = conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];
    return other.username.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{
      width: 240,
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        gap: 8,
      }}>
        <TextInput
          placeholder="Find a conversation"
          size="xs"
          variant="filled"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          rightSection={search ? (
            <ActionIcon variant="subtle" size={16} onClick={() => setSearch('')}>
              <IconX size={10} />
            </ActionIcon>
          ) : null}
          style={{ flex: 1 }}
          styles={{ input: { background: 'var(--bg-tertiary)', border: 'none' } }}
        />
      </div>

      {/* Friends button + New DM */}
      <Group gap={4} px={8} pt={8}>
        <UnstyledButton
          onClick={() => setView('friends')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 4,
            flex: 1,
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <IconUsers size={18} />
          <Text size="sm" fw={500}>Friends</Text>
        </UnstyledButton>
        <Tooltip label="Create DM" position="right" withArrow>
          <ActionIcon variant="subtle" color="gray" size={28} onClick={onCreateDM}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* DM section header */}
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={16} py={8} style={{ letterSpacing: '0.5px' }}>
        Direct Messages
      </Text>

      {/* DM list */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
        <Stack gap={2} px={8}>
          {filtered?.map((conv) => {
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
          {filtered?.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py={16}>
              {search ? 'No conversations found' : 'No conversations yet'}
            </Text>
          )}
        </Stack>
      </ScrollArea>

      <VoiceBar compact />
      <UserInfoPanel />
    </div>
  );
}

function DMItem({ conversation, otherUser, active, onClick }: {
  conversation: DMConversation;
  otherUser: { id: string; username: string; avatar_url?: string };
  active: boolean;
  onClick: () => void;
}) {
  const status = usePresenceStore((s) => s.statuses[otherUser.id] || 'offline');
  const statusColor = STATUS_COLORS[status] || 'gray';
  const [hovered, setHovered] = useState(false);
  const { data: voiceStatus } = useDMVoiceStatus(conversation.id);
  const hasActiveCall = voiceStatus?.active === true;

  return (
    <UnstyledButton
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        background: active ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={otherUser.avatar_url} size={32} radius="xl" color="brand">
          {otherUser.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" truncate style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {otherUser.username}
        </Text>
        {conversation.last_message && (
          <Text size="xs" c="dimmed" truncate lineClamp={1}>
            {conversation.last_message.content}
          </Text>
        )}
      </div>
      {hasActiveCall && (
        <Tooltip label="Call in progress" withArrow position="right">
          <IconPhone size={14} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'pulse 2s infinite' }} />
        </Tooltip>
      )}
    </UnstyledButton>
  );
}
