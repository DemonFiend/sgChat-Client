import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Button, Divider, Group, Loader, Modal, NumberInput, ScrollArea, Select, Stack, Switch, Text,
  TextInput, Textarea, Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useUIStore } from '../../stores/uiStore';
import { ChannelPermissionEditor } from './PermissionEditor';
import { SegmentBrowser } from './SegmentBrowser';
import { toastStore } from '../../stores/toastNotifications';

interface ChannelSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  channelId: string;
  serverId: string;
}

interface ChannelData {
  id: string;
  name: string;
  topic?: string;
  type: string;
  position: number;
  category_id?: string;
}

interface PermissionOverride {
  id: string;
  channel_id: string;
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

export function ChannelSettingsModal({ opened, onClose, channelId, serverId }: ChannelSettingsModalProps) {
  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api.get<ChannelData>(`/api/channels/${channelId}`),
    enabled: opened && !!channelId,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.get<Role[]>(`/api/servers/${serverId}/roles`),
    enabled: opened && !!serverId,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'segments' | 'retention'>('general');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [expandedOverrideId, setExpandedOverrideId] = useState<string | null>(null);

  const setActiveChannel = useUIStore((s) => s.setActiveChannel);

  useEffect(() => {
    if (channel) {
      setName(channel.name || '');
      setTopic(channel.topic || '');
    }
  }, [channel]);

  // Fetch permission overrides when modal opens
  useEffect(() => {
    if (opened && channelId) {
      api.get<{ overrides: PermissionOverride[] }>(`/api/channels/${channelId}/permissions`)
        .then((data) => setOverrides(data.overrides || []))
        .catch(() => {});
    }
  }, [opened, channelId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/channels/${channelId}`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        topic: topic.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
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
      await api.delete(`/api/channels/${channelId}`);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      setActiveChannel(null);
      onClose();
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  const handleAddRoleOverride = async (roleId: string) => {
    try {
      await api.put(`/api/channels/${channelId}/permissions/roles/${roleId}`, {
        text_allow: '0', text_deny: '0', voice_allow: '0', voice_deny: '0',
      });
      const data = await api.get<{ overrides: PermissionOverride[] }>(`/api/channels/${channelId}/permissions`);
      setOverrides(data.overrides || []);
    } catch { /* silently fail */ }
  };

  const handleRemoveOverride = async (override: PermissionOverride) => {
    try {
      const path = override.type === 'role' ? 'roles' : 'users';
      await api.delete(`/api/channels/${channelId}/permissions/${path}/${override.target_id}`);
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
      title={`Channel Settings — #${channel?.name || ''}`}
      centered
      size="lg"
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
        <Button
          variant="subtle"
          color={activeTab === 'segments' ? 'violet' : 'gray'}
          size="sm"
          onClick={() => setActiveTab('segments')}
          style={{
            borderBottom: activeTab === 'segments' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
            borderRadius: 0,
          }}
        >
          Segments
        </Button>
        <Button
          variant="subtle"
          color={activeTab === 'retention' ? 'violet' : 'gray'}
          size="sm"
          onClick={() => setActiveTab('retention')}
          style={{
            borderBottom: activeTab === 'retention' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
            borderRadius: 0,
          }}
        >
          Retention
        </Button>
      </Group>

      {activeTab === 'general' && (
        <Stack gap={16}>
          <TextInput
            label="Channel Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            description="Lowercase, no spaces (hyphens will replace spaces)"
          />

          <Textarea
            label="Channel Topic"
            description="Describe what this channel is for"
            value={topic}
            onChange={(e) => setTopic(e.currentTarget.value)}
            minRows={2}
            maxRows={4}
            autosize
          />

          <Group>
            <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
              Save Changes
            </Button>
          </Group>

          <Divider style={{ borderColor: 'var(--border)' }} />

          {/* Danger zone */}
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
                Delete Channel
              </Button>
            ) : (
              <Stack gap={8}>
                <Text size="sm">Are you sure? This will permanently delete <strong>#{channel?.name}</strong> and all its messages.</Text>
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
                          channelType={channel?.type || 'text'}
                          textAllow={override.text_allow}
                          textDeny={override.text_deny}
                          voiceAllow={override.voice_allow}
                          voiceDeny={override.voice_deny}
                          onSave={async (values) => {
                            const path = override.type === 'role' ? 'roles' : 'users';
                            await api.put(`/api/channels/${channelId}/permissions/${path}/${override.target_id}`, values);
                            const data = await api.get<{ overrides: PermissionOverride[] }>(`/api/channels/${channelId}/permissions`);
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
              No permission overrides configured for this channel.
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

      {activeTab === 'segments' && (
        <SegmentBrowser channelId={channelId} />
      )}

      {activeTab === 'retention' && (
        <ChannelRetentionTab channelId={channelId} />
      )}
    </Modal>
  );
}

function ChannelRetentionTab({ channelId }: { channelId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['channel-retention', channelId],
    queryFn: () => api.get<any>(`/api/channels/${channelId}/retention`),
    enabled: !!channelId,
  });

  const [retentionDays, setRetentionDays] = useState<number | string>('');
  const [sizeLimitMb, setSizeLimitMb] = useState<number | string>('');
  const [retentionNever, setRetentionNever] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setRetentionDays(data.retention_days ?? '');
      setSizeLimitMb(data.size_limit_bytes ? Math.round(data.size_limit_bytes / (1024 * 1024)) : '');
      setRetentionNever(data.retention_never ?? false);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/channels/${channelId}/retention`, {
        retention_days: retentionDays || null,
        size_limit_bytes: sizeLimitMb ? Number(sizeLimitMb) * 1024 * 1024 : null,
        retention_never: retentionNever,
      });
      queryClient.invalidateQueries({ queryKey: ['channel-retention', channelId] });
      toastStore.addToast({ type: 'system', title: 'Saved', message: 'Retention settings updated.' });
    } catch (err) {
      toastStore.addToast({ type: 'warning', title: 'Save Failed', message: (err as any)?.message || 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Loader size="sm" />;

  return (
    <Stack gap={16}>
      <Switch
        label="Exempt from retention"
        description="Messages in this channel are never auto-deleted"
        checked={retentionNever}
        onChange={(e) => setRetentionNever(e.currentTarget.checked)}
      />

      {!retentionNever && (
        <>
          <NumberInput
            label="Retention Days"
            description="Messages older than this are auto-deleted (leave empty for server default)"
            value={retentionDays}
            onChange={setRetentionDays}
            min={1}
            max={3650}
          />
          <NumberInput
            label="Size Limit (MB)"
            description="Max storage for this channel (leave empty for no limit)"
            value={sizeLimitMb}
            onChange={setSizeLimitMb}
            min={1}
          />
        </>
      )}

      <Button onClick={handleSave} loading={saving}>
        Save Retention Settings
      </Button>
    </Stack>
  );
}
