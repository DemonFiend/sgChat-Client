import { ActionIcon, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { IconCheck, IconTrash, IconX } from '@tabler/icons-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '../../hooks/useNotifications';

export function NotificationPanel() {
  const panelOpen = useNotificationStore((s) => s.panelOpen);
  const closePanel = useNotificationStore((s) => s.closePanel);
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  if (!panelOpen) return null;

  const unread = notifications?.filter((n) => !n.read) || [];
  const read = notifications?.filter((n) => n.read) || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 36,
        right: 140,
        width: 360,
        maxHeight: 480,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Group justify="space-between" px={12} py={8} style={{ borderBottom: '1px solid var(--border)' }}>
        <Text size="sm" fw={600}>Notifications</Text>
        <Group gap={4}>
          {unread.length > 0 && (
            <Button size="xs" variant="subtle" color="gray" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
          <ActionIcon aria-label="Close" variant="subtle" color="gray" size={24} onClick={closePanel}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Content */}
      <ScrollArea style={{ flex: 1, maxHeight: 420 }} scrollbarSize={6}>
        <Stack gap={0} p={8}>
          {isLoading && <Text size="xs" c="dimmed" ta="center" py={16}>Loading...</Text>}

          {!isLoading && (!notifications || notifications.length === 0) && (
            <Text size="xs" c="dimmed" ta="center" py={32}>No notifications</Text>
          )}

          {unread.map((notif) => (
            <div
              key={notif.id}
              style={{
                padding: '8px 10px',
                borderRadius: 4,
                background: 'var(--bg-secondary)',
                marginBottom: 4,
                borderLeft: '3px solid var(--accent)',
              }}
            >
              <Group justify="space-between" mb={2}>
                <Text size="xs" fw={600}>{notif.data?.title || notif.type}</Text>
                <Group gap={2}>
                  <ActionIcon aria-label="Mark as read" variant="subtle" color="gray" size={18} onClick={() => markRead.mutate(notif.id)}>
                    <IconCheck size={12} />
                  </ActionIcon>
                  <ActionIcon aria-label="Delete notification" variant="subtle" color="red" size={18} onClick={() => deleteNotif.mutate(notif.id)}>
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2}>{notif.data?.message || notif.data?.body || ''}</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {new Date(notif.created_at).toLocaleString()}
              </Text>
            </div>
          ))}

          {read.length > 0 && unread.length > 0 && (
            <Text size="xs" c="dimmed" ta="center" py={4}>Earlier</Text>
          )}

          {read.map((notif) => (
            <div
              key={notif.id}
              style={{
                padding: '8px 10px',
                borderRadius: 4,
                marginBottom: 4,
                opacity: 0.7,
              }}
            >
              <Group justify="space-between" mb={2}>
                <Text size="xs" fw={500}>{notif.data?.title || notif.type}</Text>
                <ActionIcon aria-label="Delete notification" variant="subtle" color="red" size={18} onClick={() => deleteNotif.mutate(notif.id)}>
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2}>{notif.data?.message || notif.data?.body || ''}</Text>
            </div>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
