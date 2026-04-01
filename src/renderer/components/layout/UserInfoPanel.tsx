import { useState, useEffect } from 'react';
import { ActionIcon, Avatar, Group, Indicator, Menu, Select, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCircleFilled, IconClock, IconSettings, IconWorld } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useUIStore } from '../../stores/uiStore';
import { emitPresenceUpdate, emitStatusCommentUpdate } from '../../api/socket';
import { api } from '../../lib/api';

const CLEAR_AFTER_OPTIONS = [
  { value: '', label: "Don't clear" },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
];

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: 'var(--status-online)' },
  { value: 'idle', label: 'Idle', color: 'var(--status-idle)' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'var(--status-dnd)' },
  { value: 'offline', label: 'Invisible', color: 'var(--status-offline)' },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  online: 'green',
  idle: 'yellow',
  dnd: 'red',
  offline: 'gray',
};

export function UserInfoPanel() {
  const user = useAuthStore((s) => s.user);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const setView = useUIStore((s) => s.setView);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState('');
  const [clearAfter, setClearAfter] = useState('');
  const updateStatus = useAuthStore((s) => s.updateStatus);
  const updateCustomStatus = useAuthStore((s) => s.updateCustomStatus);
  const currentStatus = usePresenceStore((s) => (user ? s.statuses[user.id] : undefined)) || user?.status || 'online';
  const statusComment = usePresenceStore((s) => (user ? s.statusComments[user.id] : undefined)) || user?.custom_status || '';

  // Live clock — updates every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Reuse cached server data for timezone
  const { data: serverData } = useQuery({
    queryKey: ['server', activeServerId],
    queryFn: () => api.get<any>(`/api/servers/${activeServerId}`),
    enabled: !!activeServerId,
  });

  if (!user) return null;

  const statusColor = STATUS_COLOR_MAP[currentStatus] || 'gray';
  const localTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const serverTimezone = serverData?.popup_config?.timezone || 'UTC';
  let serverTime: string;
  try {
    serverTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: serverTimezone });
  } catch {
    serverTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }

  const handleStatusChange = (status: string) => {
    emitPresenceUpdate(status);
    updateStatus(status as any);
    // Immediately update presenceStore so UI reflects change without waiting for server echo
    if (user) usePresenceStore.getState().updatePresence(user.id, status);
    setStatusMenuOpen(false);
  };

  const computeExpiresAt = (value: string): string | null => {
    if (!value) return null;
    const now = new Date();
    if (value === 'today') {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    if (value === 'week') {
      const end = new Date(now);
      const daysUntilSunday = (7 - end.getDay()) % 7 || 7;
      end.setDate(end.getDate() + daysUntilSunday);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    const minutes = parseInt(value, 10);
    if (!isNaN(minutes)) {
      return new Date(now.getTime() + minutes * 60_000).toISOString();
    }
    return null;
  };

  const handleCustomStatusSubmit = () => {
    const text = customStatus.trim();
    if (text) {
      const expiresAt = computeExpiresAt(clearAfter);
      emitStatusCommentUpdate(text, null, expiresAt);
      updateCustomStatus(text, expiresAt);
    }
    setClearAfter('');
    setStatusMenuOpen(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
      borderTop: '1px solid var(--border)',
      padding: '8px 10px',
      flexShrink: 0,
    }}>
      {/* Row 1: Avatar + Name + Status */}
      <Group gap={8} mb={4} wrap="nowrap">
        <Menu opened={statusMenuOpen} onChange={setStatusMenuOpen} position="top-start" withArrow>
          <Menu.Target>
            <div style={{ cursor: 'pointer', flexShrink: 0 }}>
              <Indicator
                color={statusColor as any}
                size={10}
                offset={4}
                position="bottom-end"
                withBorder
                styles={{ indicator: { transition: 'background-color 300ms ease, border-color 300ms ease' } }}
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
            <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <TextInput
                size="xs"
                placeholder="What are you up to?"
                value={customStatus || statusComment}
                onChange={(e) => setCustomStatus(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomStatusSubmit(); }}
              />
              <Select
                size="xs"
                label="Clear after"
                data={CLEAR_AFTER_OPTIONS}
                value={clearAfter}
                onChange={(v) => setClearAfter(v ?? '')}
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
                styles={{
                  label: { fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 },
                  input: { background: 'var(--bg-primary)', borderColor: 'var(--border)', fontSize: '0.7rem' },
                  dropdown: { background: 'var(--bg-tertiary)', borderColor: 'var(--border)' },
                }}
              />
            </div>
          </Menu.Dropdown>
        </Menu>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} truncate>{user.username}</Text>
          <Text size="xs" c="dimmed" truncate>{statusComment || user?.custom_status || 'Online'}</Text>
        </div>

        <Tooltip label="User Settings" position="top" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => setView('settings')}
            style={{ flexShrink: 0 }}
          >
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Row 2: Clocks */}
      <Group gap={12} mt={2} style={{ paddingLeft: 40 }}>
        <Group gap={4} wrap="nowrap">
          <IconClock size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
            {localTime}
          </Text>
        </Group>
        {serverData && (
          <Group gap={4} wrap="nowrap">
            <IconWorld size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
              {serverTime}
            </Text>
          </Group>
        )}
      </Group>
    </div>
  );
}
