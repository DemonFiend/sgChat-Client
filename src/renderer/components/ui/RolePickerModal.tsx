import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader, Modal, Stack, Switch, Text } from '@mantine/core';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';

interface RolePickerModalProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
}

interface SelfAssignableRole {
  id: string;
  role_id: string;
  role_name: string;
  role_color: string | null;
  emoji: string;
  assigned: boolean;
}

interface RoleReactionGroup {
  id: string;
  name: string;
  description?: string;
  mappings: Array<{
    id: string;
    role_id: string;
    role_name?: string;
    role_color?: string | null;
    emoji: string;
  }>;
}

export function RolePickerModal({ opened, onClose, serverId }: RolePickerModalProps) {
  const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set());

  const { data: groups, isLoading } = useQuery({
    queryKey: ['role-reactions', serverId],
    queryFn: async () => {
      const res = await api.get<{ groups: RoleReactionGroup[] }>(`/api/servers/${serverId}/role-reactions`);
      return res.groups || [];
    },
    enabled: opened && !!serverId,
  });

  const { data: myRoles } = useQuery({
    queryKey: ['my-roles', serverId],
    queryFn: () => api.get<{ role_ids: string[] }>(`/api/servers/${serverId}/members/@me/roles`),
    enabled: opened && !!serverId,
  });

  const myRoleIds = new Set(myRoles?.role_ids || []);

  const allMappings = (groups || []).flatMap((g) =>
    g.mappings.map((m) => ({
      ...m,
      groupName: g.name,
    })),
  );

  const handleToggle = async (roleId: string) => {
    setTogglingRoles((prev) => new Set(prev).add(roleId));
    try {
      await api.post(`/api/servers/${serverId}/roles/${roleId}/toggle`);
      queryClient.invalidateQueries({ queryKey: ['my-roles', serverId] });
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Role Toggle Failed',
        message: (err as any)?.message || 'Could not toggle role.',
      });
    } finally {
      setTogglingRoles((prev) => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Pick Your Roles"
      centered
      size="md"
    >
      {isLoading ? (
        <Stack align="center" py={32}>
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Loading roles...</Text>
        </Stack>
      ) : allMappings.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py={32} style={{ fontStyle: 'italic' }}>
          No self-assignable roles are available on this server.
        </Text>
      ) : (
        <Stack gap={8}>
          {allMappings.map((mapping) => (
            <div
              key={mapping.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--bg-secondary)',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: mapping.role_color || 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <Text size="sm" style={{ flex: 1 }}>
                {mapping.emoji && <span style={{ marginRight: 6 }}>{mapping.emoji}</span>}
                {mapping.role_name || 'Unknown Role'}
              </Text>
              <Switch
                checked={myRoleIds.has(mapping.role_id)}
                onChange={() => handleToggle(mapping.role_id)}
                disabled={togglingRoles.has(mapping.role_id)}
                size="sm"
              />
            </div>
          ))}
        </Stack>
      )}
    </Modal>
  );
}
