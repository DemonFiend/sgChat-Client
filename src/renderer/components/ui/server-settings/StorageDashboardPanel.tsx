import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Box, Button, Collapse, Divider, Group, Loader,
  NumberInput, Progress, Stack, Switch, Table, Text, Tooltip,
} from '@mantine/core';
import {
  IconChevronDown, IconChevronRight, IconDatabase, IconEdit,
  IconCheck, IconX, IconTrash, IconAlertTriangle, IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { toastStore } from '../../../stores/toastNotifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] ?? 'TB'}`;
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Collapsible section wrapper */
function Section({
  title, defaultOpen = false, badge, children,
}: {
  title: string; defaultOpen?: boolean; badge?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <Group
        gap={8} px={12} py={10}
        style={{ cursor: 'pointer', background: 'var(--bg-secondary)', userSelect: 'none' }}
        onClick={() => setOpen((o) => !o)}
        wrap="nowrap"
      >
        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        <Text size="sm" fw={600} style={{ flex: 1 }}>{title}</Text>
        {badge}
      </Group>
      <Collapse in={open}>
        <Stack gap={12} px={14} py={12}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

/** Stat box */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', flex: 1, minWidth: 120 }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </Box>
  );
}

/** Inline editable number field */
function EditableNumber({
  label, value, suffix, onSave,
}: {
  label: string; value: number | null | undefined; suffix?: string; onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | string>(value ?? '');
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    if (typeof draft !== 'number') return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Error', message: `Failed to update ${label}` });
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <Group gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed">{label}:</Text>
        <Text size="xs" fw={500}>
          {value != null ? `${value}${suffix ? ` ${suffix}` : ''}` : '(no limit)'}
        </Text>
        <Tooltip label={`Edit ${label}`}><ActionIcon size="xs" variant="subtle" onClick={() => { setDraft(value ?? ''); setEditing(true); }}><IconEdit size={12} /></ActionIcon></Tooltip>
      </Group>
    );
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" c="dimmed">{label}:</Text>
      <NumberInput size="xs" w={90} value={draft} onChange={setDraft} min={0} disabled={saving} />
      <ActionIcon size="xs" color="green" variant="subtle" onClick={commit} loading={saving}><IconCheck size={12} /></ActionIcon>
      <ActionIcon size="xs" color="red" variant="subtle" onClick={() => setEditing(false)}><IconX size={12} /></ActionIcon>
    </Group>
  );
}

/** Purge button with confirmation + dry-run */
function PurgeButton({
  category, label, olderThanDays, onDone,
}: {
  category: string; label?: string; olderThanDays?: number; onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const res = await api.post<{ items_affected: number; bytes_freed: number }>('/api/server/storage/purge', {
        category,
        percent: 25,
        older_than_days: olderThanDays,
        dry_run: dryRun,
      });
      const action = dryRun ? 'Dry run' : 'Purged';
      toastStore.addToast({
        type: 'system',
        title: `${action} — ${category}`,
        message: `${res.items_affected} items, ${formatBytes(res.bytes_freed)} freed`,
      });
      if (!dryRun) onDone();
      setConfirming(false);
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Purge failed', message: `Could not purge ${category}` });
    }
    setBusy(false);
  };

  if (!confirming) {
    return (
      <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={() => setConfirming(true)}>
        {label ?? 'Purge Oldest'}
      </Button>
    );
  }

  return (
    <Group gap={6}>
      <Button size="xs" variant="light" onClick={() => run(true)} loading={busy}>Preview (Dry Run)</Button>
      <Button size="xs" color="red" onClick={() => run(false)} loading={busy}>Purge Now</Button>
      <Button size="xs" variant="subtle" onClick={() => setConfirming(false)}>Cancel</Button>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface CategoryStats {
  count: number;
  size_bytes: number;
  sub_categories?: Record<string, { count: number; size_bytes: number }>;
}

interface DashboardData {
  total_size_bytes: number;
  categories: {
    channels?: CategoryStats & { channels?: Array<{ id: string; name: string; message_bytes: number; attachment_bytes: number; total_bytes: number }> };
    dms?: CategoryStats & { avg_size_bytes?: number; median_size_bytes?: number };
    emojis?: CategoryStats;
    stickers?: CategoryStats;
    profiles?: CategoryStats;
    uploads?: CategoryStats & { orphaned_count?: number };
    archives?: CategoryStats & { health?: string };
    exports?: CategoryStats;
    system_data?: CategoryStats & {
      sub_categories?: Record<string, { count: number; size_bytes: number; retention_days?: number }>;
    };
  };
}

interface StorageLimits {
  messages_mb?: number | null;
  attachments_mb?: number | null;
  dm_messages_mb?: number | null;
  stickers_mb?: number | null;
  archives_mb?: number | null;
  exports_retention_days?: number | null;
  [key: string]: number | null | undefined;
}

interface RetentionSettings {
  default_channel_size_mb?: number;
  warning_threshold_percent?: number;
  action_threshold_percent?: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StorageDashboardPanel({ serverId }: { serverId: string }) {
  // ---- Data fetching ----
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['storage'] });
    queryClient.invalidateQueries({ queryKey: ['storage-limits'] });
    queryClient.invalidateQueries({ queryKey: ['storage-thresholds'] });
    queryClient.invalidateQueries({ queryKey: ['storage-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['retention-settings'] });
    queryClient.invalidateQueries({ queryKey: ['cleanup-logs'] });
  }, []);

  const { data: dashboard, isLoading: loadingDash } = useQuery<DashboardData>({
    queryKey: ['storage', 'dashboard', serverId],
    queryFn: async () => {
      const raw: any = await api.get('/api/server/storage/dashboard');
      // Map server response field names to the client interface
      const cats = raw.categories ?? {};
      const ch = cats.channels;
      const dm = cats.dms;
      const uploads = cats.uploads;
      const archives = cats.archives;
      const exports_ = cats.exports;
      const dbTables = cats.db_tables;
      return {
        total_size_bytes: raw.grand_total_bytes ?? 0,
        categories: {
          channels: ch ? {
            count: ch.channel_count ?? 0,
            size_bytes: ch.total_bytes ?? 0,
            channels: ch.channels,
            sub_categories: {
              messages: { count: 0, size_bytes: ch.message_bytes ?? 0 },
              attachments: { count: 0, size_bytes: ch.attachment_bytes ?? 0 },
            },
          } : undefined,
          dms: dm ? {
            count: dm.dm_count ?? 0,
            size_bytes: dm.total_bytes ?? 0,
            avg_size_bytes: dm.avg_per_dm_bytes ?? 0,
            median_size_bytes: dm.median_per_dm_bytes ?? 0,
          } : undefined,
          emojis: cats.emojis ? {
            count: cats.emojis.emoji_count ?? 0,
            size_bytes: cats.emojis.total_bytes ?? 0,
          } : undefined,
          stickers: cats.stickers ? {
            count: cats.stickers.sticker_count ?? 0,
            size_bytes: cats.stickers.total_bytes ?? 0,
          } : undefined,
          profiles: cats.profiles ? {
            count: 0,
            size_bytes: cats.profiles.total_bytes ?? 0,
          } : undefined,
          uploads: uploads ? {
            count: uploads.file_count ?? 0,
            size_bytes: uploads.total_bytes ?? 0,
            orphaned_count: uploads.orphan_count ?? 0,
          } : undefined,
          archives: archives ? {
            count: archives.archive_count ?? 0,
            size_bytes: archives.total_bytes ?? 0,
            health: archives.healthy ? 'Healthy' : 'Unhealthy',
          } : undefined,
          exports: exports_ ? {
            count: exports_.export_count ?? 0,
            size_bytes: exports_.total_bytes ?? 0,
          } : undefined,
          system_data: dbTables ? {
            count: Object.values(dbTables).reduce((sum: number, t: any) => sum + (t?.count ?? 0), 0),
            size_bytes: Object.values(dbTables).reduce((sum: number, t: any) => sum + (t?.est_bytes ?? 0), 0),
            sub_categories: Object.fromEntries(
              Object.entries(dbTables).map(([key, val]: [string, any]) => [
                key,
                { count: val?.count ?? 0, size_bytes: val?.est_bytes ?? 0 },
              ]),
            ),
          } : undefined,
        },
      } satisfies DashboardData;
    },
  });

  const { data: limits } = useQuery<StorageLimits>({
    queryKey: ['storage', 'limits', serverId],
    queryFn: async () => {
      const raw: any = await api.get('/api/server/storage/limits');
      // Server returns bytes; convert to MB for display
      const toMb = (v: number | null | undefined) => v != null ? Math.round(v / (1024 * 1024)) : null;
      return {
        messages_mb: toMb(raw.channel_message_limit_bytes),
        attachments_mb: toMb(raw.channel_attachment_limit_bytes),
        dm_messages_mb: toMb(raw.dm_message_limit_bytes),
        stickers_mb: toMb(raw.sticker_storage_limit_bytes),
        archives_mb: toMb(raw.archive_limit_bytes),
        exports_retention_days: raw.export_retention_days ?? null,
      } satisfies StorageLimits;
    },
  });

  const { data: thresholdChannels } = useQuery<any[]>({
    queryKey: ['storage-thresholds', serverId],
    queryFn: () => api.get('/api/server/storage/thresholds').then((d: any) => (Array.isArray(d) ? d : d?.channels ?? [])),
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['storage-alerts', serverId],
    queryFn: () => api.getArray('/api/server/storage/alerts/active'),
  });

  const { data: retention } = useQuery<RetentionSettings>({
    queryKey: ['retention-settings', serverId],
    queryFn: () => api.get('/api/server/settings/retention'),
  });

  const { data: cleanupLogs } = useQuery<any[]>({
    queryKey: ['cleanup-logs', serverId],
    queryFn: () => api.getArray('/api/server/cleanup/logs'),
  });

  // ---- Limit update helper ----
  // Map client field names (MB) to server field names (bytes)
  const fieldMap: Record<string, string> = {
    messages_mb: 'channel_message_limit_bytes',
    attachments_mb: 'channel_attachment_limit_bytes',
    dm_messages_mb: 'dm_message_limit_bytes',
    stickers_mb: 'sticker_storage_limit_bytes',
    archives_mb: 'archive_limit_bytes',
    exports_retention_days: 'export_retention_days',
  };

  const updateLimit = async (field: string, value: number) => {
    const serverField = fieldMap[field] ?? field;
    // Convert MB to bytes for byte-based limits; retention fields stay as-is
    const serverValue = serverField.endsWith('_bytes') ? value * 1024 * 1024 : value;
    await api.patch('/api/server/storage/limits', { [serverField]: serverValue });
    queryClient.invalidateQueries({ queryKey: ['storage', 'limits'] });
    toastStore.addToast({ type: 'system', title: 'Limit updated', message: `${field} set to ${value}` });
  };

  const updateRetentionDays = async (category: string, days: number) => {
    await api.patch('/api/server/storage/limits', { [`${category}_retention_days`]: days });
    queryClient.invalidateQueries({ queryKey: ['storage', 'limits'] });
    toastStore.addToast({ type: 'system', title: 'Retention updated', message: `${category} retention set to ${days} days` });
  };

  // ---- Retention settings state ----
  const [retDefaultMb, setRetDefaultMb] = useState<number | string>('');
  const [retWarnPct, setRetWarnPct] = useState<number | string>('');
  const [retActionPct, setRetActionPct] = useState<number | string>('');
  const [retSaving, setRetSaving] = useState(false);

  // Sync from fetched data
  useEffect(() => {
    if (retention) {
      setRetDefaultMb(retention.default_channel_size_mb ?? '');
      setRetWarnPct(retention.warning_threshold_percent ?? '');
      setRetActionPct(retention.action_threshold_percent ?? '');
    }
  }, [retention]);

  const saveRetention = async () => {
    setRetSaving(true);
    try {
      await api.patch('/api/server/settings/retention', {
        default_channel_size_mb: typeof retDefaultMb === 'number' ? retDefaultMb : undefined,
        warning_threshold_percent: typeof retWarnPct === 'number' ? retWarnPct : undefined,
        action_threshold_percent: typeof retActionPct === 'number' ? retActionPct : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['retention-settings'] });
      toastStore.addToast({ type: 'system', title: 'Saved', message: 'Retention settings updated' });
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Error', message: 'Failed to save retention settings' });
    }
    setRetSaving(false);
  };

  // ---- Cleanup state ----
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const runCleanup = async (dryRun: boolean) => {
    setCleanupBusy(true);
    try {
      const res = await api.post<{ items_affected: number; bytes_freed: number }>('/api/server/cleanup/run', { dry_run: dryRun });
      const label = dryRun ? 'Dry run complete' : 'Cleanup complete';
      toastStore.addToast({ type: 'system', title: label, message: `${res.items_affected} items, ${formatBytes(res.bytes_freed)} freed` });
      if (!dryRun) invalidateAll();
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Error', message: 'Cleanup failed' });
    }
    setCleanupBusy(false);
  };

  // ---- Auto-purge state ----
  const [autoPurge, setAutoPurge] = useState(false);
  const [autoPurgeBusy, setAutoPurgeBusy] = useState(false);

  const triggerAutoPurge = async () => {
    setAutoPurgeBusy(true);
    try {
      await api.post('/api/server/storage/auto-purge/run');
      toastStore.addToast({ type: 'system', title: 'Auto-purge', message: 'Auto-purge triggered successfully' });
      invalidateAll();
    } catch {
      toastStore.addToast({ type: 'warning', title: 'Error', message: 'Auto-purge failed' });
    }
    setAutoPurgeBusy(false);
  };

  // ---- Shorthand refs ----
  const cats = dashboard?.categories;
  const ch = cats?.channels;
  const dm = cats?.dms;
  const stickers = cats?.stickers;
  const uploads = cats?.uploads;
  const archives = cats?.archives;
  const exports = cats?.exports;
  const sysData = cats?.system_data;

  // ---- Render ----
  if (loadingDash) {
    return (
      <Stack align="center" py={40}>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading storage data...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={20}>
      {/* ============================================================
          HEADER
          ============================================================ */}
      <Stack gap={4}>
        <Group gap={8}>
          <IconDatabase size={20} />
          <Text size="lg" fw={700}>Storage Management</Text>
        </Group>
        <Text size="sm" c="dimmed">Monitor and manage server storage across all categories.</Text>
      </Stack>

      <Box style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px 20px', textAlign: 'center' }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Total Storage Used</Text>
        <Text size="xl" fw={700}>{formatBytes(dashboard?.total_size_bytes ?? 0)}</Text>
      </Box>

      {/* Active alerts */}
      {alerts && alerts.length > 0 && (
        <Stack gap={4}>
          {alerts.map((a, i) => (
            <Group key={i} gap={6} px={10} py={6} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4 }}>
              <IconAlertTriangle size={14} color="var(--mantine-color-red-6)" />
              <Text size="xs" c="red">{a.message || a.type}</Text>
            </Group>
          ))}
        </Stack>
      )}

      {/* Threshold warnings */}
      {thresholdChannels && thresholdChannels.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" fw={600} c="yellow">Channels approaching limits</Text>
          {thresholdChannels.map((tc: any, i: number) => (
            <Group key={i} gap={6} px={10} py={4}>
              <Text size="xs">#{tc.name ?? tc.channel_name}</Text>
              <Progress value={tc.percent ?? 0} size="xs" color={tc.percent > 90 ? 'red' : 'yellow'} style={{ flex: 1 }} />
              <Text size="xs" c="dimmed">{tc.percent?.toFixed(0)}%</Text>
            </Group>
          ))}
        </Stack>
      )}

      {/* ============================================================
          1. CHANNELS
          ============================================================ */}
      <Section
        title="Channels"
        badge={<Badge size="xs" variant="light">{formatBytes(ch?.size_bytes ?? 0)}</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="Total Size" value={formatBytes(ch?.size_bytes ?? 0)} />
          <Stat label="Limit" value={limits?.messages_mb != null || limits?.attachments_mb != null ? `${(limits.messages_mb ?? 0) + (limits.attachments_mb ?? 0)} MB` : '(no limit)'} />
        </Group>

        {/* Sub-category boxes */}
        <Group gap={8} wrap="wrap">
          <Box style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', flex: 1, minWidth: 160 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Message Storage</Text>
            <Text size="sm" fw={600}>{formatBytes(ch?.sub_categories?.messages?.size_bytes ?? 0)}</Text>
            <EditableNumber label="Limit" value={limits?.messages_mb} suffix="MB" onSave={(v) => updateLimit('messages_mb', v)} />
          </Box>
          <Box style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', flex: 1, minWidth: 160 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Attachment Storage</Text>
            <Text size="sm" fw={600}>{formatBytes(ch?.sub_categories?.attachments?.size_bytes ?? 0)}</Text>
            <EditableNumber label="Limit" value={limits?.attachments_mb} suffix="MB" onSave={(v) => updateLimit('attachments_mb', v)} />
          </Box>
        </Group>

        {/* Per-channel table */}
        {ch?.channels && ch.channels.length > 0 && (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 12 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Channel</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Messages</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Attachments</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ch.channels.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>#{c.name}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatBytes(c.message_bytes)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatBytes(c.attachment_bytes)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatBytes(c.total_bytes)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        <PurgeButton category="channels" onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          2. DIRECT MESSAGES
          ============================================================ */}
      <Section
        title="Direct Messages"
        badge={<Badge size="xs" variant="light">{formatBytes(dm?.size_bytes ?? 0)}</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="DM Conversations" value={dm?.count ?? 0} />
          <Stat label="Total Size" value={formatBytes(dm?.size_bytes ?? 0)} />
          <Stat label="Average per DM" value={formatBytes(dm?.avg_size_bytes ?? 0)} />
          <Stat label="Median per DM" value={formatBytes(dm?.median_size_bytes ?? 0)} />
        </Group>

        <EditableNumber label="DM Message Limit" value={limits?.dm_messages_mb} suffix="MB" onSave={(v) => updateLimit('dm_messages_mb', v)} />

        <PurgeButton category="dms" onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          3. STICKERS
          ============================================================ */}
      <Section
        title="Stickers"
        badge={<Badge size="xs" variant="light">{stickers?.count ?? 0} stickers</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="Count" value={stickers?.count ?? 0} />
          <Stat label="Size" value={formatBytes(stickers?.size_bytes ?? 0)} />
        </Group>

        <EditableNumber label="Sticker Limit" value={limits?.stickers_mb} suffix="MB" onSave={(v) => updateLimit('stickers_mb', v)} />

        <PurgeButton category="stickers" onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          4. UPLOADS & MEDIA
          ============================================================ */}
      <Section
        title="Uploads & Media"
        badge={<Badge size="xs" variant="light">{formatBytes(uploads?.size_bytes ?? 0)}</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="Files" value={uploads?.count ?? 0} />
          <Stat label="Total Size" value={formatBytes(uploads?.size_bytes ?? 0)} />
          <Stat label="Orphaned Files" value={uploads?.orphaned_count ?? 0} />
        </Group>

        <PurgeButton category="uploads" label="Purge > 90 Days" olderThanDays={90} onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          5. ARCHIVES
          ============================================================ */}
      <Section
        title="Archives"
        badge={<Badge size="xs" variant="light">{archives?.count ?? 0} archives</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="Count" value={archives?.count ?? 0} />
          <Stat label="Size" value={formatBytes(archives?.size_bytes ?? 0)} />
          <Stat label="Health" value={archives?.health ?? 'OK'} />
        </Group>

        <EditableNumber label="Archive Limit" value={limits?.archives_mb} suffix="MB" onSave={(v) => updateLimit('archives_mb', v)} />

        <PurgeButton category="archives" onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          6. EXPORTS
          ============================================================ */}
      <Section
        title="Exports"
        badge={<Badge size="xs" variant="light">{exports?.count ?? 0} files</Badge>}
      >
        <Group gap={8} wrap="wrap">
          <Stat label="Export Files" value={exports?.count ?? 0} />
          <Stat label="Total Size" value={formatBytes(exports?.size_bytes ?? 0)} />
        </Group>

        <EditableNumber label="Retention Days" value={limits?.exports_retention_days} suffix="days" onSave={(v) => updateLimit('exports_retention_days', v)} />

        <PurgeButton category="exports" onDone={invalidateAll} />
      </Section>

      {/* ============================================================
          7. SYSTEM DATA
          ============================================================ */}
      <Section title="System Data" badge={<Badge size="xs" variant="light">{formatBytes(sysData?.size_bytes ?? 0)}</Badge>}>
        {sysData?.sub_categories && (
          <Table striped highlightOnHover withTableBorder style={{ fontSize: 12 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Rows</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Size</Table.Th>
                <Table.Th>Retention</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.entries(sysData.sub_categories).map(([key, sub]) => (
                <Table.Tr key={key}>
                  <Table.Td style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{sub.count}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{formatBytes(sub.size_bytes)}</Table.Td>
                  <Table.Td>
                    <EditableNumber
                      label="Days"
                      value={(sub as any).retention_days}
                      suffix="days"
                      onSave={(v) => updateRetentionDays(key, v)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <PurgeButton category="system_data" label="Purge All Expired" onDone={invalidateAll} />
      </Section>

      <Divider />

      {/* ============================================================
          8. RETENTION SETTINGS
          ============================================================ */}
      <Stack gap={12}>
        <Text size="sm" fw={700}>Retention Settings</Text>

        <NumberInput
          label="Default Channel Size Limit (MB)"
          size="sm"
          value={retDefaultMb}
          onChange={setRetDefaultMb}
          min={0}
          placeholder="Unlimited"
        />
        <NumberInput
          label="Warning Threshold (%)"
          size="sm"
          value={retWarnPct}
          onChange={setRetWarnPct}
          min={0}
          max={100}
          placeholder="e.g. 80"
        />
        <NumberInput
          label="Action Threshold (%)"
          size="sm"
          value={retActionPct}
          onChange={setRetActionPct}
          min={0}
          max={100}
          placeholder="e.g. 95"
        />
        <Button size="sm" onClick={saveRetention} loading={retSaving} style={{ alignSelf: 'flex-start' }}>
          Save Settings
        </Button>
      </Stack>

      <Divider />

      {/* ============================================================
          9. MANUAL CLEANUP
          ============================================================ */}
      <Stack gap={12}>
        <Text size="sm" fw={700}>Manual Cleanup</Text>
        <Text size="xs" c="dimmed">Run cleanup to delete old messages exceeding channel size limits.</Text>

        <Group gap={8}>
          <Button
            size="sm"
            variant="light"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={() => runCleanup(true)}
            loading={cleanupBusy}
          >
            Preview (Dry Run)
          </Button>
          <Button
            size="sm"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => runCleanup(false)}
            loading={cleanupBusy}
          >
            Run Cleanup
          </Button>
        </Group>

        {/* Cleanup log history */}
        {cleanupLogs && cleanupLogs.length > 0 && (
          <Stack gap={4}>
            <Text size="xs" fw={500} c="dimmed">Recent Cleanup Logs</Text>
            {cleanupLogs.slice(0, 5).map((log: any, i: number) => (
              <Group key={i} gap={6} px={8} py={4} style={{ background: 'var(--bg-secondary)', borderRadius: 4 }}>
                <Text size="xs" c="dimmed">{new Date(log.created_at ?? log.timestamp).toLocaleString()}</Text>
                <Text size="xs">{log.items_affected ?? log.items} items, {formatBytes(log.bytes_freed ?? log.bytes ?? 0)} freed</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* ============================================================
          10. AUTO-PURGE
          ============================================================ */}
      <Stack gap={12}>
        <Text size="sm" fw={700}>Auto-Purge</Text>

        <Switch
          label="Enable automatic purging"
          checked={autoPurge}
          onChange={(e) => setAutoPurge(e.currentTarget.checked)}
        />

        <Button
          size="sm"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          onClick={triggerAutoPurge}
          loading={autoPurgeBusy}
          style={{ alignSelf: 'flex-start' }}
        >
          Run Auto-Purge Now
        </Button>
      </Stack>
    </Stack>
  );
}
