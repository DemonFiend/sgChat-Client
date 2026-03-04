import { useState } from 'react';
import { ActionIcon, Avatar, Group, Indicator, Menu, Text, TextInput, Tooltip } from '@mantine/core';
import { IconMicrophone, IconHeadphones, IconSettings, IconCircleFilled } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useUIStore } from '../../stores/uiStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { emitPresenceUpdate } from '../../api/socket';
import { api } from '../../lib/api';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: 'var(--status-online)' },
  { value: 'idle', label: 'Idle', color: 'var(--status-idle)' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'var(--status-dnd)' },
  { value: 'offline', label: 'Invisible', color: 'var(--status-offline)' },
];

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const setView = useUIStore((s) => s.setView);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState('');
  const updateStatus = useAuthStore((s) => s.updateStatus);
  const updateCustomStatus = useAuthStore((s) => s.updateCustomStatus);
  const muted = useVoiceStore((s) => s.muted);
  const deafened = useVoiceStore((s) => s.deafened);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleDeafen = useVoiceStore((s) => s.toggleDeafen);
  const currentStatus = usePresenceStore((s) => user ? s.getStatus(user.id) : 'offline');
  const statusComment = usePresenceStore((s) => user ? (s.statusComments[user.id] || '') : '');

  if (!user) return null;

  const statusColor = { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[currentStatus] || 'gray';

  const handleStatusChange = (status: string) => {
    emitPresenceUpdate(status);
    updateStatus(status as any);
    setStatusMenuOpen(false);
  };

  const handleCustomStatusSubmit = () => {
    if (customStatus.trim()) {
      api.patch('/api/users/@me/status-comment', { status_comment: customStatus.trim() }).catch(() => {});
      updateCustomStatus(customStatus.trim());
    }
    setStatusMenuOpen(false);
  };

  return (
    <div style={{
      height: 52,
      background: 'var(--bg-tertiary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: 8,
      flexShrink: 0,
    }}>
      <Menu opened={statusMenuOpen} onChange={setStatusMenuOpen} position="top-start" withArrow>
        <Menu.Target>
          <div style={{ cursor: 'pointer' }}>
            <Indicator
              color={statusColor as any}
              size={10}
              offset={4}
              position="bottom-end"
              withBorder
            >
              <Avatar
                src={user.avatar_url}
                size={32}
                radius="xl"
                color="brand"
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            </Indicator>
          </div>
        </Menu.Target>
        <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <Menu.Label>Status</Menu.Label>
          {STATUS_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt.value}
              leftSection={<IconCircleFilled size={10} style={{ color: opt.color }} />}
              onClick={() => handleStatusChange(opt.value)}
            >
              {opt.label}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Label>Custom Status</Menu.Label>
          <div style={{ padding: '4px 12px 8px' }}>
            <TextInput
              size="xs"
              placeholder="What are you up to?"
              value={customStatus || statusComment}
              onChange={(e) => setCustomStatus(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomStatusSubmit(); }}
            />
          </div>
        </Menu.Dropdown>
      </Menu>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={600} truncate>{user.username}</Text>
        <Text size="xs" c="dimmed" truncate>{statusComment || 'Online'}</Text>
      </div>

      <Group gap={2}>
        <Tooltip label={muted ? 'Unmute' : 'Mute'} position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color={muted ? 'red' : 'gray'}
            size={28}
            onClick={() => toggleMute()}
          >
            <IconMicrophone size={16} style={muted ? { textDecoration: 'line-through' } : undefined} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={deafened ? 'Undeafen' : 'Deafen'} position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color={deafened ? 'red' : 'gray'}
            size={28}
            onClick={() => toggleDeafen()}
          >
            <IconHeadphones size={16} style={deafened ? { textDecoration: 'line-through' } : undefined} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Settings" position="top" withArrow>
          <ActionIcon variant="subtle" color="gray" size={28} onClick={() => setView('settings')}>
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
