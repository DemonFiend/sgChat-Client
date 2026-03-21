import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Button,
  Group, Select, Stack, Switch, Text, TextInput, Tooltip,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconEdit, IconLock, IconMessageCircle, IconTrash, IconWand } from '@tabler/icons-react';
import { api } from '../../../lib/api';
import {
  useRoleReactions, useCreateRoleReactionGroup, useDeleteRoleReactionGroup,
  useToggleRoleReactionGroup, useAddRoleReactionMapping, useDeleteRoleReactionMapping,
  useFormatRoleReactionChannel, useSetupDefaultRoleReactions, useUpdateRoleReactionGroup,
  useReorderRoleReactionMappings,
  type RoleReactionMapping,
} from '../../../hooks/useRoleReactions';
import { useChannels } from '../../../hooks/useChannels';
import { useEmojiStore, type CustomEmoji } from '../../../stores/emojiStore';
import { resolveAssetUrl } from '../../../lib/api';
import { type Role } from './types';

/** Render an emoji — either a unicode character or a custom emoji image */
function EmojiDisplay({ mapping }: { mapping: RoleReactionMapping }) {
  const manifest = useEmojiStore((s) => s.manifest);

  if (mapping.emoji_type === 'unicode') {
    return <Text size="lg" style={{ lineHeight: 1 }}>{mapping.emoji}</Text>;
  }

  // Custom emoji — look up from manifest or construct URL
  let customEmoji: CustomEmoji | undefined;
  if (mapping.custom_emoji_id && manifest) {
    customEmoji = manifest.emojis.find((e) => e.id === mapping.custom_emoji_id);
  }

  if (customEmoji && customEmoji.image_url) {
    return (
      <Tooltip label={`:${customEmoji.shortcode}:`} position="top" withArrow>
        <img
          src={resolveAssetUrl(customEmoji.image_url)}
          alt={customEmoji.shortcode || ''}
          width={22}
          height={22}
          style={{ objectFit: 'contain', verticalAlign: 'middle' }}
        />
      </Tooltip>
    );
  }

  // Fallback: show the emoji field if available, or a placeholder
  return <Text size="sm" c="dimmed">{mapping.emoji || '?'}</Text>;
}

export function RoleReactionsPanel({ serverId }: { serverId: string }) {
  const { data: groups, isLoading } = useRoleReactions(serverId);
  const { data: channels } = useChannels(serverId);
  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.getArray<Role>(`/api/servers/${serverId}/roles`),
  });
  const createGroup = useCreateRoleReactionGroup(serverId);
  const deleteGroup = useDeleteRoleReactionGroup(serverId);
  const toggleGroup = useToggleRoleReactionGroup(serverId);
  const updateGroup = useUpdateRoleReactionGroup(serverId);
  const addMapping = useAddRoleReactionMapping(serverId);
  const deleteMapping = useDeleteRoleReactionMapping(serverId);
  const formatChannel = useFormatRoleReactionChannel(serverId);
  const setupDefaults = useSetupDefaultRoleReactions(serverId);
  const reorderMappings = useReorderRoleReactionMappings(serverId);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChannelId, setNewGroupChannelId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [mappingEmoji, setMappingEmoji] = useState('');
  const [mappingRoleId, setMappingRoleId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editChannelId, setEditChannelId] = useState<string | null>(null);
  const [editExclusive, setEditExclusive] = useState(false);

  const textChannels = (channels || []).filter((c: any) => c.type === 'text');
  const channelOptions = textChannels.map((c: any) => ({ value: c.id, label: `#${c.name}` }));
  const roleOptions = (roles || []).map((r) => ({ value: r.id, label: r.name }));

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupChannelId) return;
    createGroup.mutate(
      { name: newGroupName.trim(), channel_id: newGroupChannelId },
      { onSuccess: () => { setNewGroupName(''); setNewGroupChannelId(null); } },
    );
  };

  const handleAddMapping = (groupId: string) => {
    if (!mappingEmoji.trim() || !mappingRoleId) return;
    addMapping.mutate(
      { groupId, emoji: mappingEmoji.trim(), emoji_type: 'unicode', role_id: mappingRoleId },
      { onSuccess: () => { setMappingEmoji(''); setMappingRoleId(null); } },
    );
  };

  const startEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditChannelId(group.channel_id);
    setEditExclusive(group.exclusive ?? false);
  };

  const saveEditGroup = () => {
    if (!editingGroupId || !editName.trim()) return;
    updateGroup.mutate(
      { groupId: editingGroupId, name: editName.trim(), description: editDescription.trim() || undefined, channel_id: editChannelId || undefined, exclusive: editExclusive },
      { onSuccess: () => setEditingGroupId(null) },
    );
  };

  const handleReorder = (group: any, mappingIndex: number, direction: 'up' | 'down') => {
    const mappings: RoleReactionMapping[] = [...(group.mappings || [])];
    const targetIndex = direction === 'up' ? mappingIndex - 1 : mappingIndex + 1;
    if (targetIndex < 0 || targetIndex >= mappings.length) return;
    // Swap
    [mappings[mappingIndex], mappings[targetIndex]] = [mappings[targetIndex], mappings[mappingIndex]];
    const mappingIds = mappings.map((m) => m.id);
    reorderMappings.mutate({ groupId: group.id, mappingIds });
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>Role Reactions</Text>
      <Text size="xs" c="dimmed">
        Let members self-assign roles by reacting to messages with specific emojis.
      </Text>

      {/* Setup defaults button when no groups exist */}
      {!isLoading && (!groups || groups.length === 0) && (
        <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
          <Text size="sm" c="dimmed" mb={12}>No reaction groups configured yet.</Text>
          <Button
            leftSection={<IconWand size={16} />}
            variant="light"
            onClick={() => setupDefaults.mutate()}
            loading={setupDefaults.isPending}
          >
            Setup Default Reactions
          </Button>
        </div>
      )}

      {/* Create group */}
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" fw={500} mb={8}>Create Reaction Group</Text>
        <Group gap={8} align="flex-end">
          <TextInput label="Name" placeholder="e.g. Color Roles" value={newGroupName} onChange={(e) => setNewGroupName(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
          <Select label="Channel" data={channelOptions} value={newGroupChannelId} onChange={setNewGroupChannelId} placeholder="Target channel" style={{ flex: 1 }} size="sm" />
          <Button size="xs" onClick={handleCreateGroup} loading={createGroup.isPending} disabled={!newGroupName.trim() || !newGroupChannelId}>
            Create
          </Button>
        </Group>
      </div>

      {/* Groups list */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Loading...</Text>
      ) : groups && groups.length > 0 ? (
        <Stack gap={8}>
          {groups.map((group: any) => (
            <div key={group.id} style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Group header */}
              <div
                style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              >
                <Text size="sm" fw={600} style={{ flex: 1 }}>{group.name}</Text>
                <Badge size="xs" variant="light" color={group.is_active ? 'green' : 'gray'}>
                  {group.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {group.exclusive && (
                  <Tooltip label="Exclusive — members can only pick one role from this group" position="top" withArrow>
                    <Badge size="xs" variant="light" color="violet" leftSection={<IconLock size={10} />}>
                      Exclusive
                    </Badge>
                  </Tooltip>
                )}
                <Text size="xs" c="dimmed">{group.mappings?.length || 0} mappings</Text>
                <Switch
                  size="xs"
                  checked={group.is_active}
                  onChange={() => toggleGroup.mutate({ groupId: group.id, enabled: !group.is_active })}
                  onClick={(e: any) => e.stopPropagation()}
                />
                <Tooltip label="Edit Group" position="top" withArrow>
                  <ActionIcon variant="subtle" color="blue" size={24} onClick={(e: any) => { e.stopPropagation(); startEditGroup(group); setExpandedGroup(group.id); }}>
                    <IconEdit size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Format Channel" position="top" withArrow>
                  <ActionIcon variant="subtle" color="brand" size={24} onClick={(e: any) => { e.stopPropagation(); formatChannel.mutate(group.channel_id); }}>
                    <IconMessageCircle size={14} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon variant="subtle" color="red" size={24} onClick={(e: any) => { e.stopPropagation(); deleteGroup.mutate(group.id); }}>
                  <IconTrash size={14} />
                </ActionIcon>
              </div>

              {/* Expanded mappings */}
              {expandedGroup === group.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
                  {/* Inline edit form */}
                  {editingGroupId === group.id && (
                    <div style={{ marginBottom: 12, padding: 8, background: 'var(--bg-primary)', borderRadius: 6 }}>
                      <Text size="xs" fw={600} mb={4}>Edit Group</Text>
                      <Stack gap={6}>
                        <TextInput label="Name" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} size="xs" />
                        <TextInput label="Description" value={editDescription} onChange={(e) => setEditDescription(e.currentTarget.value)} placeholder="Optional description" size="xs" />
                        <Select label="Channel" data={channelOptions} value={editChannelId} onChange={setEditChannelId} size="xs" />
                        <Switch
                          label="Exclusive — members can only select one role from this group"
                          checked={editExclusive}
                          onChange={(e) => setEditExclusive(e.currentTarget.checked)}
                          size="xs"
                        />
                        <Group gap={8}>
                          <Button size="xs" onClick={saveEditGroup} loading={updateGroup.isPending} disabled={!editName.trim()}>Save</Button>
                          <Button size="xs" variant="subtle" onClick={() => setEditingGroupId(null)}>Cancel</Button>
                        </Group>
                      </Stack>
                    </div>
                  )}

                  {group.mappings && group.mappings.length > 0 ? (
                    <Stack gap={4} mb={12}>
                      {group.mappings.map((m: RoleReactionMapping, idx: number) => (
                        <Group key={m.id} justify="space-between" style={{ padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: 4 }}>
                          <Group gap={8}>
                            <EmojiDisplay mapping={m} />
                            <Text size="xs" c="dimmed">-&gt;</Text>
                            <Badge size="sm" variant="light" color={m.role_color || 'gray'}>{m.role_name || 'Unknown Role'}</Badge>
                          </Group>
                          <Group gap={4}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size={20}
                              disabled={idx === 0}
                              onClick={() => handleReorder(group, idx, 'up')}
                            >
                              <IconArrowUp size={12} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size={20}
                              disabled={idx === group.mappings.length - 1}
                              onClick={() => handleReorder(group, idx, 'down')}
                            >
                              <IconArrowDown size={12} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" size={20} onClick={() => deleteMapping.mutate({ groupId: group.id, mappingId: m.id })}>
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed" mb={12}>No mappings yet</Text>
                  )}

                  {/* Add mapping */}
                  <Group gap={8} align="flex-end">
                    <TextInput label="Emoji" placeholder="e.g. &#x1F534;" value={mappingEmoji} onChange={(e) => setMappingEmoji(e.currentTarget.value)} style={{ width: 80 }} size="sm" />
                    <Select label="Role" data={roleOptions} value={mappingRoleId} onChange={setMappingRoleId} placeholder="Select role" style={{ flex: 1 }} size="sm" />
                    <Button size="xs" onClick={() => handleAddMapping(group.id)} disabled={!mappingEmoji.trim() || !mappingRoleId}>
                      Add
                    </Button>
                  </Group>
                </div>
              )}
            </div>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
