import { useState } from 'react';
import { Badge, Button, Group, Loader, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { IconDatabase, IconDownload } from '@tabler/icons-react';
import { useDMStorageStats, useDMExports, useCreateDMExport } from '../../hooks/useServerInfo';
import { toastStore } from '../../stores/toastNotifications';

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
  const [activeTab, setActiveTab] = useState<'storage' | 'export'>('storage');

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
      <Group gap={0} mb={16}>
        {(['storage', 'export'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'light' : 'subtle'}
            color={activeTab === tab ? 'brand' : 'gray'}
            size="xs"
            onClick={() => setActiveTab(tab)}
            leftSection={tab === 'storage' ? <IconDatabase size={14} /> : <IconDownload size={14} />}
          >
            {tab === 'storage' ? 'Storage' : 'Export'}
          </Button>
        ))}
      </Group>

      {activeTab === 'storage' && <StorageTab dmId={dmId} />}
      {activeTab === 'export' && <ExportTab dmId={dmId} />}
    </Modal>
  );
}

function StorageTab({ dmId }: { dmId: string }) {
  const { data, isLoading } = useDMStorageStats(dmId);

  if (isLoading) return <Loader size="sm" />;
  if (!data) return <Text size="sm" c="dimmed">No storage data available.</Text>;

  return (
    <Stack gap={12}>
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

function ExportTab({ dmId }: { dmId: string }) {
  const { data: exports, isLoading } = useDMExports(dmId);
  const createExport = useCreateDMExport();

  const handleCreate = () => {
    createExport.mutate(dmId, {
      onSuccess: () => toastStore.addToast({ type: 'system', title: 'Export Started', message: 'Your DM export is being prepared.' }),
      onError: (err) => toastStore.addToast({ type: 'warning', title: 'Export Failed', message: (err as any)?.message || 'Unknown error' }),
    });
  };

  return (
    <Stack gap={12}>
      <Button
        size="sm"
        leftSection={<IconDownload size={14} />}
        onClick={handleCreate}
        loading={createExport.isPending}
      >
        Create Export
      </Button>

      {isLoading && <Loader size="sm" />}

      {exports && exports.length > 0 ? (
        <ScrollArea mah={300}>
          <Stack gap={8}>
            {exports.map((exp: any) => (
              <Group key={exp.id} justify="space-between" p={8} style={{ background: 'var(--bg-secondary)', borderRadius: 6 }}>
                <div>
                  <Text size="sm">{new Date(exp.created_at).toLocaleDateString()}</Text>
                  <Badge size="xs" color={exp.status === 'completed' ? 'green' : exp.status === 'failed' ? 'red' : 'yellow'}>
                    {exp.status}
                  </Badge>
                </div>
                {exp.download_url && (
                  <Button size="xs" variant="light" component="a" href={exp.download_url} target="_blank">
                    Download
                  </Button>
                )}
              </Group>
            ))}
          </Stack>
        </ScrollArea>
      ) : (
        !isLoading && <Text size="sm" c="dimmed">No exports yet.</Text>
      )}
    </Stack>
  );
}
