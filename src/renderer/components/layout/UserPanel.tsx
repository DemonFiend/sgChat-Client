import { ActionIcon, Avatar, Group, Indicator, Text, Tooltip } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconHeadphones, IconHeadphonesOff, IconSettings } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useUIStore } from '../../stores/uiStore';

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const setView = useUIStore((s) => s.setView);

  if (!user) return null;

  const statusColor = {
    online: 'green',
    idle: 'yellow',
    dnd: 'red',
    offline: 'gray',
  }[usePresenceStore((s) => s.getStatus(user.id))] || 'gray';

  return (
    <div style={{
      height: 52,
      background: '#1a1b1e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      gap: 8,
      flexShrink: 0,
    }}>
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={600} truncate>{user.username}</Text>
        <Text size="xs" c="dimmed" truncate>Online</Text>
      </div>

      <Group gap={2}>
        <Tooltip label="Mute" position="top" withArrow>
          <ActionIcon variant="subtle" color="gray" size={28}>
            <IconMicrophone size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Deafen" position="top" withArrow>
          <ActionIcon variant="subtle" color="gray" size={28}>
            <IconHeadphones size={16} />
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
