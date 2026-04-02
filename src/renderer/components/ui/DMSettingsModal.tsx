import { Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { useDMStorageStats } from '../../hooks/useServerInfo';

interface DMSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  dmId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DMSettingsModal({ opened, onClose, dmId }: DMSettingsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="DM Settings"
      size="md"
      centered
      styles={{
        content: { background: 'var(--bg-primary)' },
        header: { background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' },
      }}
    >
      <StorageTab dmId={dmId} />
    </Modal>
  );
}

function StorageTab({ dmId }: { dmId: string }) {
  const { data, isLoading } = useDMStorageStats(dmId);

  if (isLoading) return <Loader size="sm" />;
  if (!data) return <Text size="sm" c="dimmed">No storage data available.</Text>;

  return (
    <Stack gap={12}>
      <Text size="sm" fw={600}>Storage</Text>
      <StatRow label="Total Messages" value={data.total_messages?.toLocaleString() ?? '0'} />
      <StatRow label="Total Size" value={formatBytes(data.total_size_bytes ?? 0)} />
      <StatRow label="Segments" value={data.segment_count?.toString() ?? '0'} />
      {data.active_size_bytes != null && (
        <StatRow label="Active Size" value={formatBytes(data.active_size_bytes)} />
      )}
      {data.archived_size_bytes != null && (
        <StatRow label="Archived Size" value={formatBytes(data.archived_size_bytes)} />
      )}
    </Stack>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </Group>
  );
}
