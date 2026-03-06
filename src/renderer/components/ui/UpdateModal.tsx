import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, Text, TypographyStylesProvider } from '@mantine/core';
import { IconDownload, IconAlertTriangle } from '@tabler/icons-react';

const electronAPI = (window as any).electronAPI;

interface ReleaseInfo {
  id: string;
  version: string;
  platform: string;
  download_url: string;
  changelog: string | null;
  required: boolean;
  published_at: string;
}

export function UpdateModal() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    if (!electronAPI?.updates?.onUpdateAvailable) return;
    const unsub = electronAPI.updates.onUpdateAvailable((r: ReleaseInfo) => {
      setRelease(r);
    });
    return unsub;
  }, []);

  if (!release) return null;

  const handleDownload = () => {
    electronAPI.updates.download(release.download_url);
  };

  const handleDismiss = () => {
    if (!release.required) {
      electronAPI.updates.dismiss(release.version);
      setRelease(null);
    }
  };

  return (
    <Modal
      opened
      onClose={handleDismiss}
      closeOnClickOutside={!release.required}
      closeOnEscape={!release.required}
      withCloseButton={!release.required}
      title={
        <Group gap={8}>
          {release.required ? (
            <IconAlertTriangle size={20} style={{ color: 'var(--mantine-color-orange-5)' }} />
          ) : (
            <IconDownload size={20} style={{ color: 'var(--accent)' }} />
          )}
          <Text fw={700}>
            {release.required ? 'Required Update Available' : 'Update Available'}
          </Text>
        </Group>
      }
      styles={{
        content: { background: 'var(--bg-secondary)', border: '1px solid var(--border)' },
        header: { background: 'var(--bg-secondary)' },
      }}
    >
      <Stack gap={16}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">New version</Text>
          <Text size="sm" fw={600}>v{release.version}</Text>
        </Group>

        {release.changelog && (
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            padding: 12,
            maxHeight: 200,
            overflow: 'auto',
          }}>
            <Text size="xs" fw={600} c="dimmed" mb={4}>Changelog</Text>
            <TypographyStylesProvider>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {release.changelog}
              </Text>
            </TypographyStylesProvider>
          </div>
        )}

        {release.required && (
          <Text size="xs" c="orange" fw={500}>
            This update is required. You must update before continuing to use sgChat.
          </Text>
        )}

        <Group justify="flex-end" gap={8}>
          {!release.required && (
            <Button variant="subtle" color="gray" onClick={handleDismiss}>
              Later
            </Button>
          )}
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleDownload}
          >
            Download Update
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
