import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Button, Divider, Group, Modal, ScrollArea, Stack, Text,
  TextInput, Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { ChannelPermissionEditor } from './PermissionEditor';

interface CategorySettingsModalProps {
  opened: boolean;
  onClose: () => void;
  categoryId: string;
  serverId: string;
}

interface CategoryData {
  id: string;
  name: string;
  position: number;
}

interface PermissionOverride {
  id: string;
  category_id: string;
  type: 'role' | 'user';
  target_id: string;
  target_name: string;
  target_color: string | null;
  text_allow: string;
  text_deny: string;
  voice_allow: string;
  voice_deny: string;
}

interface Role {
  id: string;
  name: string;
  color?: string | null;
  position: number;
}

export function CategorySettingsModal({ opened, onClose, categoryId, serverId }: CategorySettingsModalProps) {
  const { data: categories } = useQuery({
    queryKey: ['categories', serverId],
    queryFn: () => api.getArray<CategoryData>(`/api/servers/${serverId}/categories`),
    enabled: opened && !!serverId,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.getArray<Role>(`/api/servers/${serverId}/roles`),
    enabled: opened && !!serverId,
  });

  const category = categories?.find((c) => c.id === categoryId);

  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [expandedOverrideId, setExpandedOverrideId] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
    }
  }, [category]);

  // Fetch permission overrides
  useEffect(() => {
    if (opened && categoryId && serverId) {
      api.get<{ overrides: PermissionOverride[] }>(`/api/servers/${serverId}/categories/${categoryId}/permissions`)
        .then((data) => setOverrides(data.overrides || []))
        .catch(() => {});
    }
  }, [opened, categoryId, serverId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/servers/${serverId}/categories/${categoryId}`, { name: name.trim() });
      queryClient.invalidateQueries({ queryKey: ['categories', serverId] });
      onClose();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/servers/${serverId}/categories/${categoryId}`);
      queryClient.invalidateQueries({ queryKey: ['categories', serverId] });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      onClose();
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const handleAddRoleOverride = async (roleId: string) => {
    try {
      await api.put(`/api/servers/${serverId}/categories/${categoryId}/permissions/roles/${roleId}`, {
        text_allow: '0', text_deny: '0', voice_allow: '0', voice_deny: '0',
      });
      const data = await api.get<{ overrides: PermissionOverride[] }>(`/api/servers/${serverId}/categories/${categoryId}/permissions`);
      setOverrides(data.overrides || []);
    } catch { /* silently fail */ }
  };

  const handleRemoveOverride = async (override: PermissionOverride) => {
    try {
      await api.delete(`/api/servers/${serverId}/categories/${categoryId}/permissions/roles/${override.target_id}`);
      setOverrides((prev) => prev.filter((o) => o.id !== override.id));
      if (expandedOverrideId === override.id) setExpandedOverrideId(null);
    } catch { /* silently fail */ }
  };

  const availableRoles = (roles || [])
    .filter((r) => !overrides.some((o) => o.type === 'role' && o.target_id === r.id))
    .sort((a, b) => b.position - a.position);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Category Settings — ${category?.name || ''}`}
      centered
      size="lg"
      transitionProps={{ transition: 'pop', duration: 200 }}
    >
      {/* Tabs */}
      <Group gap={0} mb={16} style={{ borderBottom: '1px solid var(--border)' }}>
        <Button
          variant="subtle"
          color={activeTab === 'general' ? 'violet' : 'gray'}
          size="sm"
          onClick={() => setActiveTab('general')}
          style={{
            borderBottom: activeTab === 'general' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
            borderRadius: 0,
          }}
        >
          General
        </Button>
        <Button
          variant="subtle"
          color={activeTab === 'permissions' ? 'violet' : 'gray'}
          size="sm"
          onClick={() => setActiveTab('permissions')}
          style={{
            borderBottom: activeTab === 'permissions' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
            borderRadius: 0,
          }}
        >
          Permissions
        </Button>
      </Group>

      {activeTab === 'general' && (
        <Stack gap={16}>
          <TextInput
            label="Category Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />

          <Group>
            <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
              Save Changes
            </Button>
          </Group>

          <Divider style={{ borderColor: 'var(--border)' }} />

          <div style={{
            padding: 12,
            borderRadius: 6,
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
          }}>
            <Text size="sm" fw={600} mb={8}>Danger Zone</Text>
            {!deleteConfirm ? (
              <Button
                color="red"
                variant="outline"
                leftSection={<IconTrash size={14} />}
                onClick={() => setDeleteConfirm(true)}
              >
                Delete Category
              </Button>
            ) : (
              <Stack gap={8}>
                <Text size="sm">Are you sure? Channels in this category will become uncategorized.</Text>
                <Group gap={8}>
                  <Button color="red" onClick={handleDelete} loading={deleting}>
                    Yes, Delete
                  </Button>
                  <Button variant="subtle" color="gray" onClick={() => setDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </Group>
              </Stack>
            )}
          </div>
        </Stack>
      )}

      {activeTab === 'permissions' && (
        <Stack gap={16}>
          <Text size="xs" c="dimmed">
            Category permissions apply to all channels within. Shows both text and voice permissions since categories contain both types.
          </Text>

          {/* Existing overrides */}
          {overrides.length > 0 ? (
            <Stack gap={4}>
              {overrides.map((override) => (
                <div key={override.id}>
                  <Group
                    gap={8}
                    px={12}
                    py={8}
                    style={{
                      borderRadius: expandedOverrideId === override.id ? '4px 4px 0 0' : 4,
                      background: 'var(--bg-hover)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedOverrideId(
                      expandedOverrideId === override.id ? null : override.id,
                    )}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: override.target_color || 'var(--text-muted)',
                      flexShrink: 0,
                    }} />
                    <Text size="sm" style={{ flex: 1 }}>{override.target_name}</Text>
                    <Badge size="xs" variant="light" color="gray">{override.type}</Badge>
                    <Tooltip label="Remove Override" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size={20}
                        onClick={(e) => { e.stopPropagation(); handleRemoveOverride(override); }}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                    {expandedOverrideId === override.id
                      ? <IconChevronUp size={14} color="var(--text-muted)" />
                      : <IconChevronDown size={14} color="var(--text-muted)" />}
                  </Group>

                  {expandedOverrideId === override.id && (
                    <div style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: '0 0 4px 4px',
                      padding: '0 8px',
                      borderTop: '1px solid var(--border)',
                    }}>
                      <ScrollArea.Autosize mah={400}>
                        <ChannelPermissionEditor
                          channelType="category"
                          textAllow={override.text_allow}
                          textDeny={override.text_deny}
                          voiceAllow={override.voice_allow}
                          voiceDeny={override.voice_deny}
                          onSave={async (values) => {
                            await api.put(
                              `/api/servers/${serverId}/categories/${categoryId}/permissions/roles/${override.target_id}`,
                              values,
                            );
                            const data = await api.get<{ overrides: PermissionOverride[] }>(
                              `/api/servers/${serverId}/categories/${categoryId}/permissions`,
                            );
                            setOverrides(data.overrides || []);
                          }}
                        />
                      </ScrollArea.Autosize>
                    </div>
                  )}
                </div>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic', textAlign: 'center', padding: 16 }}>
              No permission overrides configured for this category.
            </Text>
          )}

          {/* Add role override */}
          {availableRoles.length > 0 && (
            <>
              <Divider label="Add Role Override" labelPosition="left" />
              <Stack gap={2}>
                {availableRoles.map((role) => (
                  <Group
                    key={role.id}
                    gap={8}
                    px={12}
                    py={6}
                    style={{ borderRadius: 4, cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => handleAddRoleOverride(role.id)}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: role.color || 'var(--text-muted)', flexShrink: 0,
                    }} />
                    <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
                    <IconPlus size={14} color="var(--text-muted)" />
                  </Group>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Modal>
  );
}
