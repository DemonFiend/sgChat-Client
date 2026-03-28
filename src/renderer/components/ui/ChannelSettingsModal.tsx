import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Button, Divider, Group, Loader, Modal, NumberInput, Progress, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Text,
  TextInput, Textarea, Tooltip,
} from '@mantine/core';
import { IconDatabase, IconDownload, IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconNetwork } from '@tabler/icons-react';
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
  bitrate?: number;
  user_limit?: number;
  voice_relay_policy?: string;
  preferred_relay_id?: string;
}

interface Relay {
  id: string;
  name: string;
  region: string;
  status: string;
  last_health_status: string;
  livekit_url: string;
}

const VOICE_CHANNEL_TYPES = ['voice', 'temp_voice', 'music', 'stage'];
const BITRATE_PRESETS = [32, 64, 96, 128, 256];

function snapToPreset(kbps: number): number {
  let closest = BITRATE_PRESETS[0];
  let minDiff = Math.abs(kbps - closest);
  for (const p of BITRATE_PRESETS) {
    const diff = Math.abs(kbps - p);
    if (diff < minDiff) { closest = p; minDiff = diff; }
  }
  return closest;
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

  const isVoiceChannel = VOICE_CHANNEL_TYPES.includes(channel?.type || '');

  const { data: relays } = useQuery({
    queryKey: ['relays'],
    queryFn: () => api.get<Relay[]>('/api/relays'),
    enabled: opened && isVoiceChannel,
  });

  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'segments' | 'retention' | 'export' | 'storage'>('general');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [bitrate, setBitrate] = useState(64);
  const [userLimit, setUserLimit] = useState(0);
  const [voiceRelayPolicy, setVoiceRelayPolicy] = useState<string>('auto');
  const [preferredRelayId, setPreferredRelayId] = useState<string | null>(null);
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
      setBitrate(snapToPreset(channel.bitrate ?? 64));
      setUserLimit(channel.user_limit ?? 0);
      setVoiceRelayPolicy(channel.voice_relay_policy ?? 'auto');
      setPreferredRelayId(channel.preferred_relay_id ?? null);
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
      const body: Record<string, any> = {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        topic: topic.trim(),
      };
      if (isVoiceChannel) {
        body.bitrate = bitrate;
        body.user_limit = userLimit;
        body.voice_relay_policy = voiceRelayPolicy;
        body.preferred_relay_id = voiceRelayPolicy === 'specific' ? preferredRelayId : null;
      }
      await api.patch(`/api/channels/${channelId}`, body);
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
        <Button
          variant="subtle"
          color={activeTab === 'export' ? 'violet' : 'gray'}
          size="sm"
          onClick={() => setActiveTab('export')}
          style={{
            borderBottom: activeTab === 'export' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
            borderRadius: 0,
          }}
        >
          Export
        </Button>
        {!isVoiceChannel && (
          <Button
            variant="subtle"
            color={activeTab === 'storage' ? 'violet' : 'gray'}
            size="sm"
            onClick={() => setActiveTab('storage')}
            style={{
              borderBottom: activeTab === 'storage' ? '2px solid var(--mantine-color-violet-5)' : '2px solid transparent',
              borderRadius: 0,
            }}
          >
            Storage
          </Button>
        )}
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

          {isVoiceChannel && (
            <>
              <Divider label="Voice Settings" labelPosition="left" style={{ borderColor: 'var(--border)' }} />

              <div>
                <Text size="sm" fw={500} mb={4}>Voice Quality — {bitrate} kbps</Text>
                <Text size="xs" c="dimmed" mb={8}>Higher bitrate uses more bandwidth but improves audio clarity</Text>
                <SegmentedControl
                  value={String(bitrate)}
                  onChange={(v) => setBitrate(Number(v))}
                  fullWidth
                  data={[
                    { value: '32', label: '32 kbps\nLow' },
                    { value: '64', label: '64 kbps\nNormal' },
                    { value: '96', label: '96 kbps\nHigh' },
                    { value: '128', label: '128 kbps\nVery High' },
                    { value: '256', label: '256 kbps\nStudio' },
                  ]}
                  styles={{
                    label: { whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.3, fontSize: 'var(--mantine-font-size-xs)', padding: '6px 4px' },
                  }}
                />
              </div>

              <div>
                <Text size="sm" fw={500} mb={4}>User Limit — {userLimit === 0 ? 'Unlimited' : userLimit}</Text>
                <Slider
                  value={userLimit}
                  onChange={setUserLimit}
                  min={0}
                  max={99}
                  step={1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 99, label: '99' },
                  ]}
                  label={(v) => v === 0 ? 'Unlimited' : `${v}`}
                />
              </div>

              <Select
                label="Voice Relay Policy"
                description="How the server picks a voice relay for this channel"
                value={voiceRelayPolicy}
                onChange={(v) => setVoiceRelayPolicy(v || 'auto')}
                data={[
                  { value: 'master', label: 'Main Server' },
                  { value: 'auto', label: 'Best Relay (Lowest Latency)' },
                  { value: 'specific', label: 'Specific Relay' },
                ]}
              />

              {voiceRelayPolicy === 'specific' && (
                <Select
                  label="Preferred Relay"
                  description="Select the relay server to use for this channel"
                  placeholder="Choose a relay..."
                  value={preferredRelayId}
                  onChange={setPreferredRelayId}
                  leftSection={<IconNetwork size={14} />}
                  data={(relays || []).map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.region})`,
                    disabled: r.status !== 'trusted' || r.last_health_status === 'unreachable',
                  }))}
                />
              )}
            </>
          )}

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

      {activeTab === 'export' && (
        <ChannelExportTab channelId={channelId} />
      )}

      {activeTab === 'storage' && !isVoiceChannel && (
        <ChannelStorageTab channelId={channelId} />
      )}
    </Modal>
  );
}

/* ─── Channel Storage Stats Tab ─── */

interface StorageStats {
  message_count: number;
  total_size_bytes: number;
  segment_count: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function ChannelStorageTab({ channelId }: { channelId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['channel-storage-stats', channelId],
    queryFn: async (): Promise<StorageStats> => {
      try {
        return await api.get<StorageStats>(`/api/channels/${channelId}/storage-stats`);
      } catch {
        // Endpoint may not exist — return zeroed stats
        return { message_count: 0, total_size_bytes: 0, segment_count: 0 };
      }
    },
    enabled: !!channelId,
  });

  if (isLoading) return <Loader size="sm" />;

  const stats = data ?? { message_count: 0, total_size_bytes: 0, segment_count: 0 };
  // Cap progress at a reasonable reference size (100 MB)
  const SIZE_CAP = 100 * 1024 * 1024;
  const sizePercent = Math.min((stats.total_size_bytes / SIZE_CAP) * 100, 100);

  return (
    <Stack gap={16}>
      <Group gap={8}>
        <IconDatabase size={18} style={{ color: 'var(--mantine-color-violet-5)' }} />
        <Text size="lg" fw={600}>Storage Statistics</Text>
      </Group>

      {isError || (stats.message_count === 0 && stats.total_size_bytes === 0 && stats.segment_count === 0) ? (
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          Storage statistics are not available for this channel. The server may not support this endpoint yet.
        </Text>
      ) : null}

      <div style={{
        padding: 16,
        borderRadius: 8,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}>
        <Stack gap={16}>
          {/* Message Count */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>Messages</Text>
              <Text size="sm" c="dimmed">{stats.message_count.toLocaleString()}</Text>
            </Group>
          </div>

          {/* Total Size */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>Total Size</Text>
              <Text size="sm" c="dimmed">{formatBytes(stats.total_size_bytes)}</Text>
            </Group>
            <Progress
              value={sizePercent}
              size="sm"
              radius="xl"
              color={sizePercent > 80 ? 'red' : sizePercent > 50 ? 'yellow' : 'violet'}
            />
            <Text size="xs" c="dimmed" mt={2}>
              {sizePercent.toFixed(1)}% of 100 MB reference cap
            </Text>
          </div>

          {/* Segment Count */}
          <div>
            <Group justify="space-between">
              <Text size="sm" fw={500}>Segments</Text>
              <Text size="sm" c="dimmed">{stats.segment_count.toLocaleString()}</Text>
            </Group>
          </div>
        </Stack>
      </div>
    </Stack>
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

/* ─── Channel Export Tab ─── */

interface ExportEntry {
  path: string;
  created_at: string;
  size: number;
}

function ChannelExportTab({ channelId }: { channelId: string }) {
  const [exporting, setExporting] = useState(false);
  const { data: exports, refetch } = useQuery({
    queryKey: ['channel-exports', channelId],
    queryFn: async () => {
      const res = await api.get<ExportEntry[] | { exports: ExportEntry[] }>(`/api/channels/${channelId}/exports`);
      return Array.isArray(res) ? res : (res.exports || []);
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.post(`/api/channels/${channelId}/export`);
      toastStore.addToast({ type: 'success', title: 'Export Started', message: 'Message export is being generated.' });
      // Poll for completion
      setTimeout(() => refetch(), 3000);
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Export Failed', message: 'Could not start export.' });
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (exportPath: string) => {
    try {
      const data = await api.get<any>(`/api/channels/${channelId}/exports/${encodeURIComponent(exportPath)}/download`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportPath;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Download Failed', message: 'Could not download export.' });
    }
  };

  const handleDelete = async (exportPath: string) => {
    try {
      await api.delete(`/api/channels/${channelId}/exports/${encodeURIComponent(exportPath)}`);
      refetch();
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Delete Failed', message: 'Could not delete export.' });
    }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={600}>Message Export</Text>
      <Text size="xs" c="dimmed">Export all messages in this channel to a downloadable file.</Text>

      <Button
        leftSection={<IconDownload size={14} />}
        onClick={handleExport}
        loading={exporting}
      >
        Export Messages
      </Button>

      {exports && exports.length > 0 && (
        <>
          <Divider style={{ borderColor: 'var(--border)' }} />
          <Text size="sm" fw={600}>Previous Exports</Text>
          <Stack gap={4}>
            {exports.map((exp) => (
              <Group key={exp.path} justify="space-between" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                <Stack gap={0}>
                  <Text size="sm" fw={500}>{exp.path}</Text>
                  <Text size="xs" c="dimmed">
                    {new Date(exp.created_at).toLocaleString()} — {(exp.size / 1024).toFixed(1)} KB
                  </Text>
                </Stack>
                <Group gap={4}>
                  <Button variant="subtle" size="xs" onClick={() => handleDownload(exp.path)}>Download</Button>
                  <ActionIcon variant="subtle" color="red" size={24} onClick={() => handleDelete(exp.path)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
