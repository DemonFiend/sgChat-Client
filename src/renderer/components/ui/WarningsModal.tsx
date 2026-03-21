import { useQuery } from '@tanstack/react-query';
import { Badge, Group, Modal, ScrollArea, Stack, Text, Timeline } from '@mantine/core';
import { IconAlertTriangle, IconClock, IconUserMinus, IconBan } from '@tabler/icons-react';
import { api } from '../../lib/api';

interface Warning {
  id?: string;
  type?: 'warn' | 'timeout' | 'kick' | 'ban';
  reason?: string;
  created_at: string;
  warned_by_username?: string;
  moderator_username?: string;
  duration?: number;
}

interface WarningsModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  serverId: string;
}

const ACTION_CONFIG: Record<string, { color: string; icon: typeof IconAlertTriangle; label: string }> = {
  warn: { color: '#f0ad4e', icon: IconAlertTriangle, label: 'Warning' },
  timeout: { color: '#f59f00', icon: IconClock, label: 'Timeout' },
  kick: { color: '#e64980', icon: IconUserMinus, label: 'Kick' },
  ban: { color: '#e03131', icon: IconBan, label: 'Ban' },
};

export function WarningsModal({ opened, onClose, userId, username, serverId }: WarningsModalProps) {
  const { data: warnings, isLoading } = useQuery({
    queryKey: ['warnings', serverId, userId],
    queryFn: () => api.getArray<Warning>(`/api/servers/${serverId}/members/${userId}/warnings`),
    enabled: opened && !!serverId && !!userId,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Action History — ${username}`}
      centered
      size="md"
      styles={{
        content: { background: 'var(--bg-primary)' },
        header: { background: 'var(--bg-primary)' },
      }}
    >
      <ScrollArea mah={400} scrollbarSize={4} type="hover">
        <Stack gap={8}>
          {isLoading && <Text size="sm" c="dimmed">Loading...</Text>}
          {!isLoading && (!warnings || warnings.length === 0) && (
            <Text size="sm" c="dimmed" ta="center" py="lg">No actions on record</Text>
          )}
          {warnings && warnings.length > 0 && (
            <Timeline bulletSize={24} lineWidth={2}>
              {warnings.map((w, i) => {
                const actionType = w.type || 'warn';
                const config = ACTION_CONFIG[actionType] || ACTION_CONFIG.warn;
                const ActionIcon = config.icon;

                return (
                  <Timeline.Item
                    key={w.id || i}
                    bullet={<ActionIcon size={12} />}
                    color={config.color}
                  >
                    <Group justify="space-between" mb={4}>
                      <Group gap={8}>
                        <Badge
                          size="xs"
                          variant="light"
                          color={config.color}
                        >
                          {config.label}
                        </Badge>
                        <Text size="xs" fw={600}>#{i + 1}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {new Date(w.created_at).toLocaleString()}
                      </Text>
                    </Group>
                    {w.reason && <Text size="sm">{w.reason}</Text>}
                    {w.duration && actionType === 'timeout' && (
                      <Text size="xs" c="dimmed">Duration: {formatDuration(w.duration)}</Text>
                    )}
                    {(w.warned_by_username || w.moderator_username) && (
                      <Text size="xs" c="dimmed">
                        By: {w.warned_by_username || w.moderator_username}
                      </Text>
                    )}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          )}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}

function formatDuration(seconds: number): string {
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)} day(s)`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hour(s)`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} minute(s)`;
  return `${seconds} second(s)`;
}
