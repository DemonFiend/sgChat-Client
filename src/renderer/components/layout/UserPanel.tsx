import { useState, useEffect, useRef, useCallback } from 'react';
import { ActionIcon, Avatar, Button, Group, Indicator, Menu, Popover, Select, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconMicrophone, IconHeadphones, IconSettings, IconCircleFilled, IconDeviceGamepad2, IconX } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useActivityStore, type UserActivity } from '../../stores/activityStore';
import { useUIStore } from '../../stores/uiStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { emitPresenceUpdate, emitActivityUpdate, emitActivityClear } from '../../api/socket';
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
  const currentStatus = usePresenceStore((s) => (user ? s.statuses[user.id] : undefined) || 'offline');
  const statusComment = usePresenceStore((s) => (user ? s.statusComments[user.id] : undefined) || '');
  const myActivity = useActivityStore((s) => s.myActivity);
  const setMyActivity = useActivityStore((s) => s.setMyActivity);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityType, setActivityType] = useState<string>('playing');
  const [activityName, setActivityName] = useState('');
  const [activityDetails, setActivityDetails] = useState('');

  // Activity heartbeat — re-send every 10 min to prevent server auto-clear
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (myActivity) {
      heartbeatRef.current = setInterval(() => {
        emitActivityUpdate({
          type: myActivity.type,
          name: myActivity.name,
          details: myActivity.details,
          state: myActivity.state,
          started_at: myActivity.started_at,
        });
      }, 10 * 60 * 1000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [myActivity]);

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

  const handleSetActivity = () => {
    if (!activityName.trim()) return;
    const activity: UserActivity = {
      type: activityType as UserActivity['type'],
      name: activityName.trim(),
      details: activityDetails.trim() || null,
      started_at: new Date().toISOString(),
    };
    setMyActivity(activity);
    useActivityStore.getState().updateActivity(user.id, activity);
    emitActivityUpdate(activity);
    setActivityOpen(false);
  };

  const handleClearActivity = () => {
    setMyActivity(null);
    useActivityStore.getState().updateActivity(user.id, null);
    emitActivityClear();
    setActivityOpen(false);
    setActivityName('');
    setActivityDetails('');
  };

  const displayText = myActivity
    ? `${({ playing: 'Playing', listening: 'Listening to', watching: 'Watching', streaming: 'Streaming', competing: 'Competing in', custom: '' }[myActivity.type] || '')} ${myActivity.name}`.trim()
    : statusComment || 'Online';

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
              styles={{ indicator: { transition: 'background-color 300ms ease' } }}
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

      <Popover opened={activityOpen} onChange={setActivityOpen} position="top-start" withArrow width={260}>
        <Popover.Target>
          <div
            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => setActivityOpen((v) => !v)}
          >
            <Text size="xs" fw={600} truncate>{user.username}</Text>
            <Text size="xs" c={myActivity ? 'var(--accent)' : 'dimmed'} truncate>{displayText}</Text>
          </div>
        </Popover.Target>
        <Popover.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <Stack gap={8}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Set Activity</Text>
            <Select
              size="xs"
              value={activityType}
              onChange={(v) => v && setActivityType(v)}
              data={[
                { value: 'playing', label: 'Playing' },
                { value: 'listening', label: 'Listening to' },
                { value: 'watching', label: 'Watching' },
                { value: 'streaming', label: 'Streaming' },
                { value: 'competing', label: 'Competing in' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <TextInput
              size="xs"
              placeholder="Activity name..."
              value={activityName}
              onChange={(e) => setActivityName(e.currentTarget.value)}
              maxLength={128}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetActivity(); }}
            />
            <TextInput
              size="xs"
              placeholder="Details (optional)"
              value={activityDetails}
              onChange={(e) => setActivityDetails(e.currentTarget.value)}
              maxLength={128}
            />
            <Group gap={4}>
              <Button size="xs" onClick={handleSetActivity} disabled={!activityName.trim()} style={{ flex: 1 }}>
                {myActivity ? 'Update' : 'Start'}
              </Button>
              {myActivity && (
                <Button size="xs" variant="light" color="red" onClick={handleClearActivity}>
                  <IconX size={14} />
                </Button>
              )}
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>

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
