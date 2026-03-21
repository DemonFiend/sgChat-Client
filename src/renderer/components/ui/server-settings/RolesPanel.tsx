import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Alert, Badge, Button, ColorInput, Divider,
  Group, Stack, Switch, Text, TextInput, Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconPlus, IconTrash, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { type Role, ROLE_PERMISSIONS, hasBit, setBit } from './types';

export function RolesPanel({ serverId }: { serverId: string }) {
  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.getArray<Role>(`/api/servers/${serverId}/roles`),
  });

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#4ade80');
  const [creating, setCreating] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editServerPerms, setEditServerPerms] = useState(0);
  const [editTextPerms, setEditTextPerms] = useState(0);
  const [editVoicePerms, setEditVoicePerms] = useState(0);
  const [editHoisted, setEditHoisted] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedRoles = [...(roles || [])].sort((a, b) => b.position - a.position);
  const selectedRole = sortedRoles.find((r) => r.id === selectedRoleId);

  const hasDuplicatePositions = useMemo(() => {
    if (!roles || roles.length <= 1) return false;
    const positions = roles.map((r) => r.position);
    return new Set(positions).size !== positions.length;
  }, [roles]);

  const [fixingPositions, setFixingPositions] = useState(false);
  const handleFixPositions = async () => {
    if (!roles || roles.length === 0) return;
    setFixingPositions(true);
    try {
      // sortedRoles is highest-position first; assign descending positions
      // @everyone gets position 0 (lowest), others get sequential positions above
      const everyoneRole = sortedRoles.find((r) => r.name === '@everyone');
      const nonEveryone = sortedRoles.filter((r) => r.name !== '@everyone');
      const reordered = nonEveryone.map((role, index) => ({
        id: role.id,
        position: nonEveryone.length - index, // highest first
      }));
      if (everyoneRole) {
        reordered.push({ id: everyoneRole.id, position: 0 });
      }
      await api.patch(`/api/servers/${serverId}/roles/reorder`, { roles: reordered });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // silently fail
    } finally {
      setFixingPositions(false);
    }
  };

  useEffect(() => {
    const role = (roles || []).find((r) => r.id === selectedRoleId);
    if (role) {
      setEditName(role.name);
      setEditColor(role.color || null);
      setEditServerPerms(Number(role.server_permissions || 0));
      setEditTextPerms(Number(role.text_permissions || 0));
      setEditVoicePerms(Number(role.voice_permissions || 0));
      setEditHoisted(role.hoist ?? role.is_hoisted ?? false);
      setEditMentionable(role.is_mentionable ?? false);
    }
  }, [selectedRoleId, roles]);

  const handleCreate = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      await api.post(`/api/servers/${serverId}/roles`, {
        name: newRoleName.trim(),
        color: newRoleColor,
      });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      setNewRoleName('');
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleMoveRole = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedRoles.length) return;
    const a = sortedRoles[index];
    const b = sortedRoles[newIndex];
    if (a.name === '@everyone' || b.name === '@everyone') return;
    try {
      await api.patch(`/api/servers/${serverId}/roles/reorder`, {
        roles: [
          { id: a.id, position: b.position },
          { id: b.id, position: a.position },
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch { /* silently fail */ }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/roles/${roleId}`);
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    } catch {
      // silently fail
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        server_permissions: editServerPerms,
        text_permissions: editTextPerms,
        voice_permissions: editVoicePerms,
        is_hoisted: editHoisted,
        is_mentionable: editMentionable,
      };
      if (selectedRole?.name !== '@everyone') {
        body.name = editName.trim();
      }
      if (editColor) body.color = editColor;
      else body.color = null;

      await api.patch(`/api/servers/${serverId}/roles/${selectedRoleId}`, body);
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Roles</Text>

      {/* Create role */}
      <Group gap={8} align="flex-end">
        <TextInput
          label="New Role"
          placeholder="Role name"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <ColorInput
          label="Color"
          value={newRoleColor}
          onChange={setNewRoleColor}
          style={{ width: 120 }}
        />
        <Button leftSection={<IconPlus size={14} />} onClick={handleCreate} loading={creating} disabled={!newRoleName.trim()}>
          Create
        </Button>
      </Group>

      {/* Duplicate position warning */}
      {hasDuplicatePositions && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          variant="light"
          title="Duplicate Positions Detected"
        >
          <Text size="xs" mb={8}>
            Multiple roles share the same position. This can cause hierarchy issues.
          </Text>
          <Button
            size="xs"
            variant="filled"
            color="yellow"
            loading={fixingPositions}
            onClick={handleFixPositions}
          >
            Fix Positions
          </Button>
        </Alert>
      )}

      {/* Role list */}
      {sortedRoles.length > 0 ? (
        <Stack gap={4}>
          {sortedRoles.map((role, index) => (
            <Group
              key={role.id}
              gap={8}
              px={12}
              py={8}
              style={{
                borderRadius: 4,
                background: selectedRoleId === role.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                border: selectedRoleId === role.id ? '1px solid var(--mantine-color-violet-5)' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
            >
              {role.name !== '@everyone' && (
                <Group gap={2} onClick={(e) => e.stopPropagation()}>
                  <ActionIcon variant="subtle" color="gray" size={20} disabled={index === 0} onClick={() => handleMoveRole(index, -1)}>
                    <IconArrowUp size={12} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" size={20} disabled={index === sortedRoles.length - 1 || sortedRoles[index + 1]?.name === '@everyone'} onClick={() => handleMoveRole(index, 1)}>
                    <IconArrowDown size={12} />
                  </ActionIcon>
                </Group>
              )}
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: role.color || 'var(--text-muted)', flexShrink: 0,
              }} />
              <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
              {(role.hoist || role.is_hoisted) && (
                <Badge size="xs" variant="outline" color="gray">Hoisted</Badge>
              )}
              <Text size="xs" c="dimmed">Pos: {role.position}</Text>
              {role.name !== '@everyone' && (
                <Tooltip label="Delete Role" withArrow>
                  <ActionIcon variant="subtle" color="red" size={24} onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No roles configured.</Text>
      )}

      {/* Role editor */}
      {selectedRole && (
        <>
          <Divider label={`Editing: ${selectedRole.name}`} labelPosition="left" />

          {selectedRole.name !== '@everyone' && (
            <Group gap={8} align="flex-end">
              <TextInput
                label="Role Name"
                value={editName}
                onChange={(e) => setEditName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <ColorInput
                label="Color"
                value={editColor || ''}
                onChange={setEditColor}
                style={{ width: 140 }}
              />
            </Group>
          )}

          <Divider label="Display" labelPosition="left" />
          <Switch
            label="Display Separately (Hoisted)"
            description="Show members with this role grouped separately in the member list"
            checked={editHoisted}
            onChange={(e) => setEditHoisted(e.currentTarget.checked)}
            size="xs"
          />
          <Switch
            label="Allow @mention"
            description="Allow anyone to mention this role"
            checked={editMentionable}
            onChange={(e) => setEditMentionable(e.currentTarget.checked)}
            size="xs"
          />

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Server Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.server.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editServerPerms, perm.bit)}
                onChange={(e) => setEditServerPerms(setBit(editServerPerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Text Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.text.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editTextPerms, perm.bit)}
                onChange={(e) => setEditTextPerms(setBit(editTextPerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Voice Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.voice.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editVoicePerms, perm.bit)}
                onChange={(e) => setEditVoicePerms(setBit(editVoicePerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Group>
            <Button onClick={handleSaveRole} loading={saving}>Save Role</Button>
            <Button variant="subtle" color="gray" onClick={() => setSelectedRoleId(null)}>Cancel</Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
