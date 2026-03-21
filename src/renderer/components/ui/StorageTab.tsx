import { useEffect, useState } from 'react';
import { Stack, Text, Group, Paper, Progress, Loader, Center } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import { api, ApiError } from '../../lib/api';

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

  useEffect(() => {
    let cancelled = false;

    async function fetchStorage() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<StorageData>('/api/users/storage');
        if (!cancelled) {
          // Normalize breakdown with colors
          const breakdown = (data.breakdown ?? []).map((item) => ({
            ...item,
            color: TYPE_COLORS[item.type] ?? 'gray',
          }));
          setStorage({ ...data, breakdown });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError('Storage information is not available on this server.');
        } else {
          setError('Failed to load storage information.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStorage();
    return () => { cancelled = true; };
  }, []);

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

      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm">{formatBytes(storage.used)} used</Text>
            <Text size="sm" c="dimmed">{formatBytes(storage.quota)} total</Text>
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
        </Stack>
      </Paper>

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
    </Stack>
  );
}
