import { useEffect } from 'react';
import { ActionIcon, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { IconCheck, IconPhoneOff, IconTrash, IconX } from '@tabler/icons-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '../../hooks/useNotifications';
import { useUIStore } from '../../stores/uiStore';

interface Notification {
  id: string;
  type: string;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

/** Type-aware notification title */
function getNotifTitle(notif: Notification): string {
  if (notif.type === 'missed_call') {
    return `Missed Call from ${notif.data?.caller_name || 'Unknown'}`;
  }
  if (notif.type === 'friend_request') {
    return `Friend Request from ${notif.data?.from_username || notif.data?.username || 'Someone'}`;
  }
  return notif.data?.title || notif.type;
}

/** Type-aware notification message */
function getNotifMessage(notif: Notification): string {
  if (notif.type === 'missed_call') {
    return 'Click to open conversation';
  }
  return notif.data?.message || notif.data?.body || '';
}

/** Click handler — navigate for actionable notifications */
function handleNotifClick(notif: Notification, closePanel: () => void) {
  if (notif.type === 'missed_call' && notif.data?.dm_channel_id) {
    useUIStore.getState().setActiveDM(notif.data.dm_channel_id);
    closePanel();
  }
}

export function NotificationPanel() {
  const panelOpen = useNotificationStore((s) => s.panelOpen);
  const closePanel = useNotificationStore((s) => s.closePanel);
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unread = notifications?.filter((n: Notification) => !n.read) || [];
  const read = notifications?.filter((n: Notification) => n.read) || [];

  // Auto-mark-read after 1.5s of panel being open with unread items
  useEffect(() => {
    if (panelOpen && unread.length > 0) {
      const timer = setTimeout(() => {
        markAllRead.mutate();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [panelOpen, unread.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!panelOpen) return null;

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

          {unread.map((notif: Notification) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif, closePanel)}
              style={{
                padding: '8px 10px',
                borderRadius: 4,
                background: 'var(--bg-secondary)',
                marginBottom: 4,
                borderLeft: `3px solid ${notif.type === 'missed_call' ? 'var(--mantine-color-red-5)' : 'var(--accent)'}`,
                cursor: notif.type === 'missed_call' ? 'pointer' : undefined,
              }}
            >
              <Group justify="space-between" mb={2}>
                <Group gap={6}>
                  {notif.type === 'missed_call' && (
                    <IconPhoneOff size={14} style={{ color: 'var(--mantine-color-red-5)' }} />
                  )}
                  <Text size="xs" fw={600}>{getNotifTitle(notif)}</Text>
                </Group>
                <Group gap={2}>
                  <ActionIcon aria-label="Mark as read" variant="subtle" color="gray" size={18} onClick={(e) => { e.stopPropagation(); markRead.mutate(notif.id); }}>
                    <IconCheck size={12} />
                  </ActionIcon>
                  <ActionIcon aria-label="Delete notification" variant="subtle" color="red" size={18} onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(notif.id); }}>
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2}>{getNotifMessage(notif)}</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {new Date(notif.created_at).toLocaleString()}
              </Text>
            </div>
          ))}

          {read.length > 0 && unread.length > 0 && (
            <Text size="xs" c="dimmed" ta="center" py={4}>Earlier</Text>
          )}

          {read.map((notif: Notification) => (
            <div
              key={notif.id}
              onClick={() => handleNotifClick(notif, closePanel)}
              style={{
                padding: '8px 10px',
                borderRadius: 4,
                marginBottom: 4,
                opacity: 0.7,
                cursor: notif.type === 'missed_call' ? 'pointer' : undefined,
              }}
            >
              <Group justify="space-between" mb={2}>
                <Group gap={6}>
                  {notif.type === 'missed_call' && (
                    <IconPhoneOff size={14} style={{ color: 'var(--mantine-color-red-5)', opacity: 0.6 }} />
                  )}
                  <Text size="xs" fw={500}>{getNotifTitle(notif)}</Text>
                </Group>
                <ActionIcon aria-label="Delete notification" variant="subtle" color="red" size={18} onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(notif.id); }}>
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2}>{getNotifMessage(notif)}</Text>
            </div>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
