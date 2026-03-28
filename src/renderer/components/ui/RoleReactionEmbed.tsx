import { useState } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';

interface RoleInfo {
  id: string;
  name: string;
  color: string | null;
  emoji: string;
}

interface RoleReactionEmbedProps {
  roles: RoleInfo[];
  serverId: string;
  userRoleIds: string[] | Set<string>;
}

export function RoleReactionEmbed({ roles, serverId, userRoleIds }: RoleReactionEmbedProps) {
  const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set());
  const roleIdSet = userRoleIds instanceof Set ? userRoleIds : new Set(userRoleIds);

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

  if (roles.length === 0) return null;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Text size="xs" fw={600} c="dimmed" mb={8}>
        Pick your roles
      </Text>
      <Group gap={8} wrap="wrap">
        {roles.map((role) => {
          const hasRole = roleIdSet.has(role.id);
          const isToggling = togglingRoles.has(role.id);
          const roleColor = role.color || 'var(--text-muted)';

          return (
            <Button
              key={role.id}
              variant={hasRole ? 'filled' : 'outline'}
              size="xs"
              radius="xl"
              loading={isToggling}
              onClick={() => handleToggle(role.id)}
              style={{
                borderColor: roleColor,
                color: hasRole ? '#fff' : roleColor,
                backgroundColor: hasRole ? roleColor : 'transparent',
                fontWeight: 500,
              }}
              styles={{
                root: {
                  '&:hover': {
                    backgroundColor: hasRole ? roleColor : `${roleColor}22`,
                  },
                },
              }}
            >
              {role.emoji && <span style={{ marginRight: 4 }}>{role.emoji}</span>}
              {role.name}
            </Button>
          );
        })}
      </Group>
    </div>
  );
}
