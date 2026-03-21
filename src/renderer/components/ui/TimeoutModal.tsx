import { useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { api } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';

interface TimeoutModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  serverId: string;
}

const DURATION_OPTIONS = [
  { value: '300', label: '5 minutes' },
  { value: '900', label: '15 minutes' },
  { value: '3600', label: '1 hour' },
  { value: '86400', label: '1 day' },
  { value: '604800', label: '1 week' },
];

export function TimeoutModal({ opened, onClose, userId, username, serverId }: TimeoutModalProps) {
  const [duration, setDuration] = useState<string | null>('300');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTimeout = async () => {
    if (!duration) return;
    setLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/timeout`, {
        duration: Number(duration),
        reason: reason.trim() || undefined,
      });
      toastStore.addToast({
        type: 'system',
        title: 'User Timed Out',
        message: `${username} has been timed out.`,
      });
      onClose();
      setDuration('300');
      setReason('');
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Timeout Failed',
        message: (err as any)?.message || 'Could not timeout user.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Timeout ${username}`}
      centered
      size="sm"
      transitionProps={{ transition: 'pop', duration: 200 }}
    >
      <Stack gap={16}>
        <Text size="sm" c="dimmed">
          Temporarily prevent <strong>{username}</strong> from sending messages or joining voice channels.
        </Text>

        <Select
          label="Duration"
          placeholder="Select duration"
          data={DURATION_OPTIONS}
          value={duration}
          onChange={setDuration}
          allowDeselect={false}
        />

        <TextInput
          label="Reason"
          placeholder="Optional reason for the timeout"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          maxLength={256}
        />

        <Group justify="flex-end" mt={8}>
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleTimeout}
            loading={loading}
            disabled={!duration}
          >
            Timeout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
