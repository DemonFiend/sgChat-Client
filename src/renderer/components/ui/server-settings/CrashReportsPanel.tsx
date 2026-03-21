import { useQuery } from '@tanstack/react-query';
import { Paper, Stack, Text, Table, Badge, Group } from '@mantine/core';
import { api } from '../../../lib/api';

interface CrashReport {
  id: string;
  error: string;
  stack?: string;
  created_at: string;
}

interface Release {
  id: string;
  version: string;
  notes?: string;
  created_at: string;
}

export function CrashReportsPanel({ serverId }: { serverId: string }) {
  const { data: crashReports, isLoading: loadingCrashes } = useQuery({
    queryKey: ['crash-reports', serverId],
    queryFn: () => api.getArray<CrashReport>(`/api/servers/${serverId}/crash-reports`).catch(() => []),
  });

  const { data: releases, isLoading: loadingReleases } = useQuery({
    queryKey: ['releases', serverId],
    queryFn: () => api.getArray<Release>(`/api/servers/${serverId}/releases`).catch(() => []),
  });

  const appVersion = (window as any).electronAPI?.getAppVersion?.() ?? __APP_VERSION__ ?? 'unknown';

  return (
    <Stack gap={24}>
      {/* Crash Reports Section */}
      <Stack gap={12}>
        <Text size="lg" fw={700}>Crash Reports</Text>
        <Text size="sm" c="dimmed">
          Server-side crash reports and error logs.
        </Text>

        {loadingCrashes ? (
          <Text size="sm" c="dimmed">Loading...</Text>
        ) : (crashReports ?? []).length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Error</Table.Th>
                <Table.Th>Stack Trace</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {crashReports!.map((report) => (
                <Table.Tr key={report.id}>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(report.created_at).toLocaleString()}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>{report.error}</Text>
                  </Table.Td>
                  <Table.Td>
                    {report.stack ? (
                      <Text size="xs" c="dimmed" lineClamp={2} style={{ fontFamily: 'monospace' }}>
                        {report.stack}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed" fs="italic">No stack trace</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Paper p="lg" withBorder style={{ textAlign: 'center' }}>
            <Text c="dimmed" size="sm" fs="italic">No crash reports.</Text>
          </Paper>
        )}
      </Stack>

      {/* Releases Section */}
      <Stack gap={12}>
        <Group gap={12}>
          <Text size="lg" fw={700}>Releases</Text>
          <Badge variant="light" size="sm">Client v{appVersion}</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          Server release history and version info.
        </Text>

        {loadingReleases ? (
          <Text size="sm" c="dimmed">Loading...</Text>
        ) : (releases ?? []).length > 0 ? (
          <Stack gap={8}>
            {releases!.map((release) => (
              <Paper key={release.id} p="md" withBorder>
                <Group justify="space-between" mb={4}>
                  <Text fw={600} size="sm">v{release.version}</Text>
                  <Text size="xs" c="dimmed">
                    {new Date(release.created_at).toLocaleDateString()}
                  </Text>
                </Group>
                {release.notes && (
                  <Text size="sm" c="dimmed">{release.notes}</Text>
                )}
              </Paper>
            ))}
          </Stack>
        ) : (
          <Paper p="lg" withBorder style={{ textAlign: 'center' }}>
            <Text c="dimmed" size="sm" fs="italic">No release information available.</Text>
          </Paper>
        )}
      </Stack>
    </Stack>
  );
}

declare const __APP_VERSION__: string;
