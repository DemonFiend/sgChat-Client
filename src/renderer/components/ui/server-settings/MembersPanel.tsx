import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Avatar, Badge, Button, Checkbox, Divider,
  Group, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Textarea, Tooltip,
} from '@mantine/core';
import { IconBan, IconClock, IconClockOff, IconUserMinus } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { toastStore } from '../../../stores/toastNotifications';
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

const TIMEOUT_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '1h', seconds: 3600 },
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
];

const TIMEOUT_UNIT_OPTIONS = [
  { value: '60', label: 'Min' },
  { value: '3600', label: 'Hr' },
  { value: '86400', label: 'Day' },
];

function InlineTimeoutPanel({
  serverId,
  memberId,
  username,
  onDone,
}: {
  serverId: string;
  memberId: string;
  username: string;
  onDone: () => void;
}) {
  const [duration, setDuration] = useState(600);
  const [customVal, setCustomVal] = useState<number | ''>(10);
  const [customUnit, setCustomUnit] = useState('60');
  const [useCustom, setUseCustom] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveDuration = useCustom
    ? (typeof customVal === 'number' ? customVal * Number(customUnit) : 0)
    : duration;

  const handleSubmit = async () => {
    if (effectiveDuration <= 0) return;
    setLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${memberId}/timeout`, {
        duration: effectiveDuration,
        reason: reason.trim() || undefined,
      });
      toastStore.addToast({
        type: 'system',
        title: 'User Timed Out',
        message: `${username} has been timed out.`,
      });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      onDone();
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Timeout Failed',
        message: (err as Error)?.message || 'Could not timeout user.',
      });
    } finally {
      setLoading(false);
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
      <Text size="sm" fw={600}>Timeout {username}</Text>

      <SimpleGrid cols={3} spacing={4}>
        {TIMEOUT_PRESETS.map((p) => (
          <Button
            key={p.seconds}
            variant={!useCustom && duration === p.seconds ? 'filled' : 'light'}
            color={!useCustom && duration === p.seconds ? 'yellow' : 'gray'}
            size="compact-xs"
            onClick={() => { setDuration(p.seconds); setUseCustom(false); }}
          >
            {p.label}
          </Button>
        ))}
      </SimpleGrid>

      <Group gap={4}>
        <NumberInput
          size="xs"
          placeholder="Custom"
          value={customVal}
          onChange={(v) => { setCustomVal(typeof v === 'number' ? v : ''); setUseCustom(true); }}
          min={1}
          max={9999}
          style={{ flex: 1 }}
        />
        <Select
          size="xs"
          data={TIMEOUT_UNIT_OPTIONS}
          value={customUnit}
          onChange={(v) => { if (v) { setCustomUnit(v); setUseCustom(true); } }}
          allowDeselect={false}
          style={{ width: 70 }}
        />
      </Group>

      <Textarea
        size="xs"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        maxLength={256}
        minRows={2}
        maxRows={3}
        autosize
      />

      <Group gap={4}>
        <Button size="compact-xs" color="yellow" onClick={handleSubmit} loading={loading} disabled={effectiveDuration <= 0} style={{ flex: 1 }}>
          Timeout
        </Button>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={onDone}>
          Cancel
        </Button>
      </Group>
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
  const [timeoutMemberId, setTimeoutMemberId] = useState<string | null>(null);

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

  const handleToggleTimeout = (userId: string) => {
    setTimeoutMemberId(timeoutMemberId === userId ? null : userId);
    // Close role panel if timeout panel is opening
    if (timeoutMemberId !== userId) setSelectedMemberId(null);
  };

  const handleRemoveTimeout = async (userId: string) => {
    try {
      await api.patch(`/api/servers/${serverId}/members/${userId}/timeout`, { timeout_until: null });
      toastStore.addToast({
        type: 'system',
        title: 'Timeout Removed',
        message: 'Timeout has been removed from the user.',
      });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Remove Timeout Failed',
        message: (err as Error)?.message || 'Could not remove timeout.',
      });
    }
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
                onClick={() => { setSelectedMemberId(isSelected ? null : memberId); setTimeoutMemberId(null); }}
              >
                <Avatar src={member.avatar_url} size={28} radius="xl" color="brand">
                  {member.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" truncate>{member.display_name || member.username}</Text>
                </div>
                <Group gap={4}>
                  {member.timeout_until && new Date(member.timeout_until) > new Date() ? (
                    <Tooltip label="Remove Timeout" withArrow>
                      <ActionIcon
                        variant="light"
                        color="green"
                        size={24}
                        onClick={(e) => { e.stopPropagation(); handleRemoveTimeout(memberId); }}
                      >
                        <IconClockOff size={14} />
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <Tooltip label="Timeout" withArrow>
                      <ActionIcon
                        variant={timeoutMemberId === memberId ? 'light' : 'subtle'}
                        color="yellow"
                        size={24}
                        onClick={(e) => { e.stopPropagation(); handleToggleTimeout(memberId); }}
                      >
                        <IconClock size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
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

        {/* Inline timeout panel */}
        {timeoutMemberId && (
          <InlineTimeoutPanel
            serverId={serverId}
            memberId={timeoutMemberId}
            username={
              (members || []).find((m) => (m.user_id || m.id) === timeoutMemberId)?.username || 'User'
            }
            onDone={() => setTimeoutMemberId(null)}
          />
        )}

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
