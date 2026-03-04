import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconServer, IconAlertCircle } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface CreateServerModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated?: (server: { id: string; name: string }) => void;
}

export function CreateServerModal({ opened, onClose, onCreated }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const name = serverName.trim();
    if (!name) return;

    setCreating(true);
    setError('');
    try {
      const res = await api.post<{ id: string; name: string }>('/api/servers', { name });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      onCreated?.(res);
      setServerName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !creating) handleCreate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create a Server"
      centered
      size="sm"
    >
      <Stack gap={16}>
        <Text size="sm" c="dimmed">
          Give your new server a name. You can always change it later.
        </Text>

        <TextInput
          label="Server Name"
          placeholder="My Awesome Server"
          value={serverName}
          onChange={(e) => setServerName(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          autoFocus
          leftSection={<IconServer size={16} />}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap={8}>
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={creating} disabled={!serverName.trim()}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
