import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Avatar, Badge, Button, Checkbox, Divider,
  Group, Stack, Text, TextInput, Tooltip,
} from '@mantine/core';
import { IconBan, IconClock, IconUserMinus } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { TransferOwnershipModal } from '../TransferOwnershipModal';
import { useAuthStore } from '../../../stores/authStore';
import { type Role, type Member } from './types';

function MemberRolePanel({
  serverId,
  memberId,
  allRoles,
}: {
  serverId: string;
  memberId: string;
  allRoles: Role[];
}) {
  const { data: memberRoles, isLoading } = useQuery({
    queryKey: ['member-roles', serverId, memberId],
    queryFn: () => api.getArray<{ id: string; name: string; color?: string | null; position: number }>(
      `/api/servers/${serverId}/members/${memberId}/roles`,
    ),
  });

  const [busy, setBusy] = useState<string | null>(null);

  const memberRoleIds = new Set((memberRoles || []).map((r) => r.id));

  const handleToggleRole = async (roleId: string) => {
    setBusy(roleId);
    try {
      if (memberRoleIds.has(roleId)) {
        await api.delete(`/api/servers/${serverId}/members/${memberId}/roles/${roleId}`);
      } else {
        await api.post(`/api/servers/${serverId}/members/${memberId}/roles/${roleId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['member-roles', serverId, memberId] });
    } catch {
      // silently fail
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack
      gap={8}
      style={{
        width: 220,
        flexShrink: 0,
        padding: 12,
        borderRadius: 8,
        background: 'var(--bg-secondary, rgba(0,0,0,0.15))',
      }}
    >
      <Text size="sm" fw={600}>Roles</Text>

      {isLoading && <Text size="xs" c="dimmed">Loading roles...</Text>}

      {/* Current roles as badges */}
      {!isLoading && memberRoles && memberRoles.length > 0 && (
        <Group gap={4}>
          {memberRoles.map((r) => (
            <Badge key={r.id} size="sm" variant="dot" color={r.color || 'gray'}>
              {r.name}
            </Badge>
          ))}
        </Group>
      )}

      {!isLoading && (!memberRoles || memberRoles.length === 0) && (
        <Text size="xs" c="dimmed" fs="italic">No roles assigned</Text>
      )}

      <Divider />

      <Text size="xs" c="dimmed">Toggle roles:</Text>
      <Stack gap={2}>
        {allRoles.map((role) => (
          <Checkbox
            key={role.id}
            label={
              <Group gap={6}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: role.color || 'var(--text-muted)', flexShrink: 0,
                }} />
                <Text size="xs">{role.name}</Text>
              </Group>
            }
            checked={memberRoleIds.has(role.id)}
            onChange={() => handleToggleRole(role.id)}
            disabled={busy === role.id}
            size="xs"
          />
        ))}
        {allRoles.length === 0 && (
          <Text size="xs" c="dimmed" fs="italic">No assignable roles</Text>
        )}
      </Stack>
    </Stack>
  );
}

export function MembersPanel({ serverId }: { serverId: string }) {
  const { data: members } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => api.getArray<Member>(`/api/servers/${serverId}/members`),
  });

  const { data: allRoles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.getArray<Role>(`/api/servers/${serverId}/roles`),
  });

  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => api.get<any>(`/api/servers/${serverId}`),
  });

  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwner = server?.owner_id === currentUserId;
  const [transferOpen, setTransferOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filtered = (members || []).filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const assignableRoles = [...(allRoles || [])].filter((r) => r.name !== '@everyone').sort((a, b) => b.position - a.position);

  const handleKick = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/kick`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  const handleBan = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/ban`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  const handleTimeout = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/timeout`, { duration: 600 });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Text size="lg" fw={700}>Members</Text>
        <Text size="sm" c="dimmed">{members?.length || 0} members</Text>
      </Group>

      <TextInput
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Member list */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {filtered.map((member) => {
            const memberId = member.user_id || member.id;
            const isSelected = selectedMemberId === memberId;
            return (
              <Group
                key={memberId}
                gap={8}
                px={12}
                py={8}
                style={{
                  borderRadius: 4,
                  background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                  border: isSelected ? '1px solid var(--mantine-color-violet-5)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedMemberId(isSelected ? null : memberId)}
              >
                <Avatar src={member.avatar_url} size={28} radius="xl" color="brand">
                  {member.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" truncate>{member.display_name || member.username}</Text>
                </div>
                <Group gap={4}>
                  <Tooltip label="Timeout (10 min)" withArrow>
                    <ActionIcon variant="subtle" color="yellow" size={24} onClick={(e) => { e.stopPropagation(); handleTimeout(memberId); }}>
                      <IconClock size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Kick" withArrow>
                    <ActionIcon variant="subtle" color="orange" size={24} onClick={(e) => { e.stopPropagation(); handleKick(memberId); }}>
                      <IconUserMinus size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Ban" withArrow>
                    <ActionIcon variant="subtle" color="red" size={24} onClick={(e) => { e.stopPropagation(); handleBan(memberId); }}>
                      <IconBan size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            );
          })}
          {filtered.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" py={16}>
              {search ? 'No members match your search.' : 'No members found.'}
            </Text>
          )}
        </Stack>

        {/* Member detail panel */}
        {selectedMemberId && (
          <MemberRolePanel serverId={serverId} memberId={selectedMemberId} allRoles={assignableRoles} />
        )}
      </div>

      {/* Transfer Ownership — owner only */}
      {isOwner && (
        <>
          <Divider label="Danger Zone" labelPosition="left" color="red" />
          <Button
            color="red"
            variant="outline"
            onClick={() => setTransferOpen(true)}
          >
            Transfer Ownership
          </Button>
          <TransferOwnershipModal
            opened={transferOpen}
            onClose={() => setTransferOpen(false)}
            serverId={serverId}
            currentOwnerId={currentUserId!}
            members={(members || []).map((m) => ({
              id: m.user_id || m.id,
              username: m.username,
              display_name: m.display_name,
              avatar_url: m.avatar_url,
            }))}
          />
        </>
      )}
    </Stack>
  );
}
