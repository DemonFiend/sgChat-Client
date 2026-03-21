import { useQuery } from '@tanstack/react-query';
import { Group, Stack, Text } from '@mantine/core';
import { api } from '../../../lib/api';
import { type AuditEntry } from './types';

export function AuditLogPanel({ serverId }: { serverId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['audit-log', serverId],
    queryFn: () => api.getArray<AuditEntry>(`/api/servers/${serverId}/audit-log`),
  });

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Audit Log</Text>
      <Text size="sm" c="dimmed">Recent administrative actions on this server.</Text>

      {isLoading && <Text size="sm" c="dimmed">Loading...</Text>}

      {!isLoading && (entries || []).length > 0 ? (
        <Stack gap={4}>
          {entries!.map((entry) => (
            <Group key={entry.id} gap={8} px={12} py={8} style={{ borderRadius: 4, background: 'var(--bg-hover)' }} wrap="nowrap">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm">
                  <Text component="span" fw={600}>{entry.actor_username || 'System'}</Text>
                  {' '}
                  <Text component="span" c="dimmed">{entry.action.replace(/_/g, ' ')}</Text>
                </Text>
              </div>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      ) : (
        !isLoading && <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No audit log entries.</Text>
      )}
    </Stack>
  );
}
