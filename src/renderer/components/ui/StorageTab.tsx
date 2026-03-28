import { useEffect, useState } from 'react';
import { Stack, Text, Group, Paper, Progress, Loader, Center, Button, NumberInput, Alert, Switch, Select, Modal } from '@mantine/core';
import { IconDatabase, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { api, ApiError } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';

interface StorageBreakdown {
  type: string;
  label: string;
  bytes: number;
  color: string;
}

interface StorageData {
  used: number;
  quota: number;
  breakdown: StorageBreakdown[];
}

interface PurgePreview {
  total_files: number;
  total_bytes: number;
  breakdown: Array<{ type: string; count: number; bytes: number }>;
}

interface RetentionSettings {
  auto_purge_enabled: boolean;
  retention_days: number;
  exempt_types: string[];
}

const TYPE_COLORS: Record<string, string> = {
  images: 'blue',
  files: 'teal',
  videos: 'grape',
  audio: 'orange',
  other: 'gray',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function StorageTab() {
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Storage limit editor
  const [quotaEditing, setQuotaEditing] = useState(false);
  const [newQuotaMB, setNewQuotaMB] = useState<number>(0);
  const [quotaSaving, setQuotaSaving] = useState(false);

  // Purge
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgePreview, setPurgePreview] = useState<PurgePreview | null>(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeType, setPurgeType] = useState<string | null>(null);
  const [purgeOlderThan, setPurgeOlderThan] = useState<number>(30);

  // Retention settings
  const [retention, setRetention] = useState<RetentionSettings | null>(null);
  const [retentionSaving, setRetentionSaving] = useState(false);

  const fetchStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<StorageData>('/api/users/storage');
      const breakdown = (data.breakdown ?? []).map((item) => ({
        ...item,
        color: TYPE_COLORS[item.type] ?? 'gray',
      }));
      setStorage({ ...data, breakdown });
      setNewQuotaMB(Math.round(data.quota / (1024 * 1024)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Storage information is not available on this server.');
      } else {
        setError('Failed to load storage information.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRetention = async () => {
    try {
      const data = await api.get<RetentionSettings>('/api/users/storage/retention');
      setRetention(data);
    } catch {
      // Retention endpoint may not exist — leave null
    }
  };

  useEffect(() => {
    fetchStorage();
    fetchRetention();
  }, []);

  const handleSaveQuota = async () => {
    setQuotaSaving(true);
    try {
      await api.patch('/api/users/storage/quota', { quota_bytes: newQuotaMB * 1024 * 1024 });
      toastStore.addToast({ type: 'system', title: 'Quota Updated', message: `Storage limit set to ${newQuotaMB} MB.` });
      setQuotaEditing(false);
      fetchStorage();
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Failed', message: 'Could not update storage quota.' });
    }
    setQuotaSaving(false);
  };

  const handlePurgeDryRun = async () => {
    setPurgeLoading(true);
    setPurgePreview(null);
    try {
      const params = new URLSearchParams({ dry_run: 'true', older_than_days: String(purgeOlderThan) });
      if (purgeType) params.set('type', purgeType);
      const preview = await api.get<PurgePreview>(`/api/users/storage/purge?${params}`);
      setPurgePreview(preview);
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Preview Failed', message: 'Could not preview purge operation.' });
    }
    setPurgeLoading(false);
  };

  const handlePurgeExecute = async () => {
    setPurgeLoading(true);
    try {
      const body: Record<string, unknown> = { older_than_days: purgeOlderThan };
      if (purgeType) body.type = purgeType;
      await api.post('/api/users/storage/purge', body);
      toastStore.addToast({ type: 'system', title: 'Purge Complete', message: 'Selected files have been removed.' });
      setPurgeModalOpen(false);
      setPurgePreview(null);
      fetchStorage();
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Purge Failed', message: 'Could not complete purge operation.' });
    }
    setPurgeLoading(false);
  };

  const handleSaveRetention = async () => {
    if (!retention) return;
    setRetentionSaving(true);
    try {
      await api.patch('/api/users/storage/retention', retention);
      toastStore.addToast({ type: 'system', title: 'Retention Updated', message: 'Retention settings saved.' });
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Failed', message: 'Could not save retention settings.' });
    }
    setRetentionSaving(false);
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          {error}
        </Text>
      </Paper>
    );
  }

  if (!storage) return null;

  const usedPercent = storage.quota > 0 ? (storage.used / storage.quota) * 100 : 0;
  const progressSections = storage.breakdown.map((item) => ({
    value: storage.quota > 0 ? (item.bytes / storage.quota) * 100 : 0,
    color: item.color,
    tooltip: `${item.label}: ${formatBytes(item.bytes)}`,
  }));

  return (
    <Stack gap="md">
      <Group gap="xs">
        <IconDatabase size={18} />
        <Text fw={600} size="sm">Storage Usage</Text>
      </Group>

      {/* Usage overview */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm">{formatBytes(storage.used)} used</Text>
            <Group gap={4}>
              <Text size="sm" c="dimmed">{formatBytes(storage.quota)} total</Text>
              <Button variant="subtle" size="compact-xs" onClick={() => setQuotaEditing(!quotaEditing)}>
                Edit
              </Button>
            </Group>
          </Group>

          <Progress.Root size="lg" radius="md">
            {progressSections.length > 0 ? (
              progressSections.map((section, i) => (
                <Progress.Section key={i} value={section.value} color={section.color}>
                  <Progress.Label>{section.value > 8 ? section.tooltip : ''}</Progress.Label>
                </Progress.Section>
              ))
            ) : (
              <Progress.Section value={usedPercent} color="blue" />
            )}
          </Progress.Root>

          <Text size="xs" c="dimmed" ta="right">
            {usedPercent.toFixed(1)}% used
          </Text>

          {quotaEditing && (
            <Group gap="xs" mt="xs">
              <NumberInput
                size="xs"
                value={newQuotaMB}
                onChange={(v) => setNewQuotaMB(typeof v === 'number' ? v : 0)}
                min={1}
                max={102400}
                suffix=" MB"
                style={{ width: 120 }}
              />
              <Button size="xs" onClick={handleSaveQuota} loading={quotaSaving}>Save</Button>
              <Button size="xs" variant="subtle" onClick={() => setQuotaEditing(false)}>Cancel</Button>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Breakdown */}
      {storage.breakdown.length > 0 && (
        <Paper p="md" radius="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={500}>Breakdown</Text>
            {storage.breakdown.map((item) => (
              <Group key={item.type} justify="space-between">
                <Group gap="xs">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: `var(--mantine-color-${item.color}-6)` }} />
                  <Text size="sm">{item.label}</Text>
                </Group>
                <Text size="sm" c="dimmed">{formatBytes(item.bytes)}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Purge controls */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Text size="sm" fw={500}>Purge Files</Text>
          <Text size="xs" c="dimmed">Remove old files to free up storage space. Preview before deleting.</Text>
          <Group gap="sm">
            <Select
              size="xs"
              placeholder="All types"
              value={purgeType}
              onChange={setPurgeType}
              clearable
              data={storage.breakdown.map((b) => ({ value: b.type, label: b.label }))}
              style={{ width: 140 }}
            />
            <NumberInput
              size="xs"
              value={purgeOlderThan}
              onChange={(v) => setPurgeOlderThan(typeof v === 'number' ? v : 30)}
              min={1}
              max={3650}
              suffix=" days"
              style={{ width: 110 }}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconTrash size={14} />}
              onClick={() => { setPurgeModalOpen(true); handlePurgeDryRun(); }}
            >
              Preview Purge
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Retention settings */}
      {retention && (
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={500}>Retention Policy</Text>
            <Switch
              label="Auto-purge old files"
              description="Automatically remove files older than the retention period"
              checked={retention.auto_purge_enabled}
              onChange={(e) => setRetention({ ...retention, auto_purge_enabled: e.currentTarget.checked })}
            />
            {retention.auto_purge_enabled && (
              <NumberInput
                label="Retention period"
                size="xs"
                value={retention.retention_days}
                onChange={(v) => setRetention({ ...retention, retention_days: typeof v === 'number' ? v : 90 })}
                min={7}
                max={3650}
                suffix=" days"
                style={{ width: 140 }}
              />
            )}
            <Button
              size="xs"
              variant="light"
              onClick={handleSaveRetention}
              loading={retentionSaving}
              style={{ alignSelf: 'flex-start' }}
            >
              Save Retention Settings
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Purge confirmation modal */}
      <Modal
        opened={purgeModalOpen}
        onClose={() => { setPurgeModalOpen(false); setPurgePreview(null); }}
        title="Purge Files"
        centered
      >
        <Stack gap="md">
          {purgeLoading && !purgePreview && (
            <Center py="md">
              <Loader size="sm" />
            </Center>
          )}

          {purgePreview && (
            <>
              <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
                This will permanently delete {purgePreview.total_files} file(s) totaling {formatBytes(purgePreview.total_bytes)}.
              </Alert>
              {purgePreview.breakdown.length > 0 && (
                <Stack gap={4}>
                  {purgePreview.breakdown.map((item) => (
                    <Group key={item.type} justify="space-between">
                      <Text size="sm">{item.type}</Text>
                      <Text size="sm" c="dimmed">{item.count} files ({formatBytes(item.bytes)})</Text>
                    </Group>
                  ))}
                </Stack>
              )}
              <Group justify="flex-end" mt="sm">
                <Button variant="subtle" onClick={() => { setPurgeModalOpen(false); setPurgePreview(null); }}>
                  Cancel
                </Button>
                <Button
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={handlePurgeExecute}
                  loading={purgeLoading}
                  disabled={purgePreview.total_files === 0}
                >
                  Delete {purgePreview.total_files} File(s)
                </Button>
              </Group>
            </>
          )}

          {!purgeLoading && !purgePreview && (
            <Text size="sm" c="dimmed">No preview data available.</Text>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
