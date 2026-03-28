import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, Badge, Button, ColorInput, Divider,
  Group, Menu, SegmentedControl, Stack, Switch, Text, TextInput, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconGripVertical, IconPlus, IconSearch, IconTemplate, IconTrash,
} from '@tabler/icons-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { type Role, hasBit, setBit } from './types';
import { PERMISSION_GROUPS, DANGEROUS_PERM_KEYS, type PermissionDef } from './permissionMetadata';

type TriState = 'default' | 'allow' | 'deny';

// ── Sortable Role List Item ────────────────────────────────────────
function SortableRoleItem({
  role,
  isSelected,
  onSelect,
  isDragDisabled,
}: {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
  isDragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Group
      ref={setNodeRef}
      style={{
        ...style,
        borderRadius: 4,
        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
        border: isSelected ? '1px solid var(--mantine-color-violet-5)' : '1px solid transparent',
        cursor: 'pointer',
      }}
      gap={8}
      px={8}
      py={6}
      onClick={onSelect}
    >
      {!isDragDisabled ? (
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconGripVertical size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <div style={{ width: 14 }} />
      )}
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: role.color || 'var(--text-muted)', flexShrink: 0,
      }} />
      <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
      {(role.hoist || role.is_hoisted) && (
        <Badge size="xs" variant="outline" color="gray">Hoisted</Badge>
      )}
    </Group>
  );
}

// ── Tri-state permission control ─────────────────────────────────
function PermissionTriState({
  perm,
  value,
  onChange,
}: {
  perm: PermissionDef;
  value: TriState;
  onChange: (val: TriState) => void;
}) {
  const isDangerous = DANGEROUS_PERM_KEYS.has(perm.key);

  return (
    <Group
      gap={12}
      px={12}
      py={8}
      style={{
        borderRadius: 4,
        background: value === 'allow' && isDangerous
          ? 'rgba(239, 68, 68, 0.08)'
          : value === 'deny'
            ? 'rgba(239, 68, 68, 0.06)'
            : undefined,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="sm"
          fw={500}
          style={{ color: isDangerous ? 'var(--mantine-color-red-5)' : undefined }}
        >
          {perm.label}
          {isDangerous && (
            <IconAlertTriangle
              size={12}
              style={{ marginLeft: 4, verticalAlign: 'middle', color: 'var(--mantine-color-red-5)' }}
            />
          )}
        </Text>
        <Text size="xs" c="dimmed">{perm.description}</Text>
      </div>
      <SegmentedControl
        value={value}
        onChange={(val) => onChange(val as TriState)}
        size="xs"
        data={[
          { label: 'Deny', value: 'deny' },
          { label: 'Default', value: 'default' },
          { label: 'Allow', value: 'allow' },
        ]}
        styles={{
          root: { minWidth: 200 },
        }}
        color={value === 'allow' ? (isDangerous ? 'red' : 'green') : value === 'deny' ? 'red' : undefined}
      />
    </Group>
  );
}

// ── Role Templates ──────────────────────────────────────────────

function bitsFromList(bits: number[]): number {
  let mask = 0;
  for (const b of bits) mask |= (1 << b);
  return mask;
}

interface RoleTemplate {
  name: string;
  label: string;
  description: string;
  color: string;
  serverPerms: number;
  textPerms: number;
  voicePerms: number;
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Admin',
    label: 'Admin',
    description: 'All permissions enabled',
    color: '#ef4444',
    // All 25 server bits (0-24)
    serverPerms: bitsFromList(Array.from({ length: 25 }, (_, i) => i)),
    // All 21 text bits (0-20)
    textPerms: bitsFromList(Array.from({ length: 21 }, (_, i) => i)),
    // All 17 voice bits (0-16)
    voicePerms: bitsFromList(Array.from({ length: 17 }, (_, i) => i)),
  },
  {
    name: 'Moderator',
    label: 'Moderator',
    description: 'Ban, kick, mute, manage messages',
    color: '#f59e0b',
    // KICK_MEMBERS(5), BAN_MEMBERS(6), TIMEOUT_MEMBERS(7), MANAGE_NICKNAMES(8), VIEW_AUDIT_LOG(12), VIEW_SERVER_MEMBERS(23), MODERATE_MEMBERS(24)
    serverPerms: bitsFromList([5, 6, 7, 8, 12, 23, 24]),
    // VIEW_CHANNEL(0), SEND_MESSAGES(1), READ_MESSAGE_HISTORY(3), ADD_REACTIONS(8), MANAGE_MESSAGES(11), DELETE_OWN_MESSAGES(12), EDIT_OWN_MESSAGES(13), BYPASS_SLOWMODE(20)
    textPerms: bitsFromList([0, 1, 3, 8, 11, 12, 13, 20]),
    // CONNECT(0), VIEW_VOICE_CHANNEL(1), SPEAK(2), MUTE_MEMBERS(9), DEAFEN_MEMBERS(10), MOVE_MEMBERS(11), DISCONNECT_MEMBERS(12)
    voicePerms: bitsFromList([0, 1, 2, 9, 10, 11, 12]),
  },
  {
    name: 'Member',
    label: 'Member',
    description: 'Read, send, react, voice',
    color: '#4ade80',
    // CREATE_INVITES(9), CHANGE_NICKNAME(11), VIEW_SERVER_MEMBERS(23)
    serverPerms: bitsFromList([9, 11, 23]),
    // VIEW_CHANNEL(0), SEND_MESSAGES(1), READ_MESSAGE_HISTORY(3), EMBED_LINKS(4), ATTACH_FILES(5), USE_EXTERNAL_EMOJIS(6), ADD_REACTIONS(8), DELETE_OWN_MESSAGES(12), EDIT_OWN_MESSAGES(13)
    textPerms: bitsFromList([0, 1, 3, 4, 5, 6, 8, 12, 13]),
    // CONNECT(0), VIEW_VOICE_CHANNEL(1), SPEAK(2), VIDEO(3), STREAM(4), USE_VOICE_ACTIVITY(5), USE_SOUNDBOARD(7)
    voicePerms: bitsFromList([0, 1, 2, 3, 4, 5, 7]),
  },
  {
    name: 'Muted',
    label: 'Muted',
    description: 'Read only, no send',
    color: '#6b7280',
    serverPerms: bitsFromList([23]), // VIEW_SERVER_MEMBERS
    // VIEW_CHANNEL(0), READ_MESSAGE_HISTORY(3)
    textPerms: bitsFromList([0, 3]),
    // VIEW_VOICE_CHANNEL(1)
    voicePerms: bitsFromList([1]),
  },
];

// ── Main RolesPanel ──────────────────────────────────────────────
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
  const [roleSearch, setRoleSearch] = useState('');

  const sortedRoles = useMemo(
    () => [...(roles || [])].sort((a, b) => b.position - a.position),
    [roles],
  );

  const filteredRoles = useMemo(() => {
    if (!roleSearch) return sortedRoles;
    const q = roleSearch.toLowerCase();
    return sortedRoles.filter((r) => r.name.toLowerCase().includes(q));
  }, [sortedRoles, roleSearch]);

  const selectedRole = sortedRoles.find((r) => r.id === selectedRoleId);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleCreateFromTemplate = async (template: RoleTemplate) => {
    setCreating(true);
    try {
      // Step 1: Create the role
      const created = await api.post<{ id: string }>(`/api/servers/${serverId}/roles`, {
        name: template.name,
        color: template.color,
      });
      // Step 2: Apply template permissions
      if (created?.id) {
        await api.patch(`/api/servers/${serverId}/roles/${created.id}`, {
          server_permissions: template.serverPerms,
          text_permissions: template.textPerms,
          voice_permissions: template.voicePerms,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredRoles.findIndex((r) => r.id === active.id);
    const newIndex = filteredRoles.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered: Role[] = arrayMove(filteredRoles, oldIndex, newIndex);
    const everyoneRole = reordered.find((r: Role) => r.name === '@everyone');
    const nonEveryone = reordered.filter((r: Role) => r.name !== '@everyone');
    const positions = nonEveryone.map((role: Role, index: number) => ({
      id: role.id,
      position: nonEveryone.length - index,
    }));
    if (everyoneRole) {
      positions.push({ id: everyoneRole.id, position: 0 });
    }

    try {
      await api.patch(`/api/servers/${serverId}/roles/reorder`, { roles: positions });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // revert on failure
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    }
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
      const body: Record<string, unknown> = {
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

  // Helpers for tri-state permission get/set
  const getPermTriState = (perm: PermissionDef): TriState => {
    let perms: number;
    switch (perm.scope) {
      case 'server': perms = editServerPerms; break;
      case 'text': perms = editTextPerms; break;
      case 'voice': perms = editVoicePerms; break;
    }
    const isOn = hasBit(perms, perm.bit);
    // For tri-state: currently we map bitmask on = allow, off = default
    // Deny state uses a separate deny mask concept — for now, on = allow, off = default
    return isOn ? 'allow' : 'default';
  };

  const setPermTriState = (perm: PermissionDef, state: TriState) => {
    const isOn = state === 'allow';
    switch (perm.scope) {
      case 'server':
        setEditServerPerms((prev) => setBit(prev, perm.bit, isOn));
        break;
      case 'text':
        setEditTextPerms((prev) => setBit(prev, perm.bit, isOn));
        break;
      case 'voice':
        setEditVoicePerms((prev) => setBit(prev, perm.bit, isOn));
        break;
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
        <Menu shadow="md" width={220} position="bottom-end" withinPortal>
          <Menu.Target>
            <Button variant="light" leftSection={<IconTemplate size={14} />} loading={creating}>
              From Template
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Role Templates</Menu.Label>
            {ROLE_TEMPLATES.map((tpl) => (
              <Menu.Item
                key={tpl.name}
                onClick={() => handleCreateFromTemplate(tpl)}
                leftSection={
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: tpl.color, flexShrink: 0,
                  }} />
                }
              >
                <div>
                  <Text size="sm" fw={500}>{tpl.label}</Text>
                  <Text size="xs" c="dimmed">{tpl.description}</Text>
                </div>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Role search */}
      <TextInput
        placeholder="Search roles..."
        leftSection={<IconSearch size={14} />}
        value={roleSearch}
        onChange={(e) => setRoleSearch(e.currentTarget.value)}
        size="sm"
      />

      {/* Role list with DnD */}
      {filteredRoles.length > 0 ? (
        roleSearch ? (
          // When searching, disable DnD
          <Stack gap={4}>
            {filteredRoles.map((role) => (
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
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: role.color || 'var(--text-muted)', flexShrink: 0,
                }} />
                <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
                {role.name !== '@everyone' && (
                  <Tooltip label="Delete Role" withArrow>
                    <div onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }} style={{ cursor: 'pointer' }}>
                      <IconTrash size={14} style={{ color: 'var(--mantine-color-red-5)' }} />
                    </div>
                  </Tooltip>
                )}
              </Group>
            ))}
          </Stack>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredRoles.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap={4}>
                {filteredRoles.map((role) => (
                  <SortableRoleItem
                    key={role.id}
                    role={role}
                    isSelected={selectedRoleId === role.id}
                    onSelect={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
                    isDragDisabled={role.name === '@everyone'}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        )
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

          {/* Permission groups as Accordion */}
          <Divider label="Permissions" labelPosition="left" />

          <Accordion variant="separated" multiple>
            {PERMISSION_GROUPS.map((group) => {
              const allowCount = group.permissions.filter((p) => getPermTriState(p) === 'allow').length;
              const hasDangerous = group.permissions.some(
                (p) => p.dangerous && getPermTriState(p) === 'allow',
              );

              return (
                <Accordion.Item key={group.category} value={group.category}>
                  <Accordion.Control>
                    <Group gap={8}>
                      <Text size="sm" fw={600}>{group.name}</Text>
                      {allowCount > 0 && (
                        <Badge
                          size="xs"
                          variant="light"
                          color={hasDangerous ? 'red' : 'green'}
                        >
                          {allowCount} allowed
                        </Badge>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={2}>
                      {group.permissions.map((perm) => (
                        <PermissionTriState
                          key={perm.key}
                          perm={perm}
                          value={getPermTriState(perm)}
                          onChange={(val) => setPermTriState(perm, val)}
                        />
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>

          {/* Danger zone */}
          {selectedRole.name !== '@everyone' && (
            <>
              <Divider label="Danger Zone" labelPosition="left" color="red" />
              <Button
                variant="outline"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => handleDelete(selectedRole.id)}
              >
                Delete Role
              </Button>
            </>
          )}

          <Group>
            <Button onClick={handleSaveRole} loading={saving}>Save Role</Button>
            <Button variant="subtle" color="gray" onClick={() => setSelectedRoleId(null)}>Cancel</Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
