import { useState } from 'react';
import { Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, Textarea } from '@mantine/core';
import { api } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';

interface TimeoutModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  serverId: string;
}

const DURATION_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: '60s', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '1h', seconds: 3600 },
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
];

const UNIT_OPTIONS = [
  { value: '1', label: 'Seconds' },
  { value: '60', label: 'Minutes' },
  { value: '3600', label: 'Hours' },
  { value: '86400', label: 'Days' },
];

export function TimeoutModal({ opened, onClose, userId, username, serverId }: TimeoutModalProps) {
  const [duration, setDuration] = useState<number>(300);
  const [customValue, setCustomValue] = useState<number | ''>(10);
  const [customUnit, setCustomUnit] = useState<string>('60');
  const [useCustom, setUseCustom] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveDuration = useCustom
    ? (typeof customValue === 'number' ? customValue * Number(customUnit) : 0)
    : duration;

  const handleTimeout = async () => {
    if (effectiveDuration <= 0) return;
    setLoading(true);
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/timeout`, {
        duration: effectiveDuration,
        reason: reason.trim() || undefined,
      });
      toastStore.addToast({
        type: 'system',
        title: 'User Timed Out',
        message: `${username} has been timed out.`,
      });
      onClose();
      setDuration(300);
      setCustomValue(10);
      setCustomUnit('60');
      setUseCustom(false);
      setReason('');
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Timeout Failed',
        message: (err as Error)?.message || 'Could not timeout user.',
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

        <Stack gap={8}>
          <Text size="sm" fw={500}>Duration</Text>
          <SimpleGrid cols={3} spacing={6}>
            {DURATION_PRESETS.map((preset) => (
              <Button
                key={preset.seconds}
                variant={!useCustom && duration === preset.seconds ? 'filled' : 'light'}
                color={!useCustom && duration === preset.seconds ? 'violet' : 'gray'}
                size="xs"
                onClick={() => { setDuration(preset.seconds); setUseCustom(false); }}
              >
                {preset.label}
              </Button>
            ))}
          </SimpleGrid>

          <Group gap={8} mt={4}>
            <NumberInput
              size="xs"
              placeholder="Custom"
              value={customValue}
              onChange={(val) => { setCustomValue(typeof val === 'number' ? val : ''); setUseCustom(true); }}
              min={1}
              max={99999}
              style={{ flex: 1 }}
            />
            <Select
              size="xs"
              data={UNIT_OPTIONS}
              value={customUnit}
              onChange={(val) => { if (val) { setCustomUnit(val); setUseCustom(true); } }}
              allowDeselect={false}
              style={{ width: 120 }}
            />
          </Group>
        </Stack>

        <Textarea
          label="Reason"
          placeholder="Optional reason for the timeout"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          maxLength={256}
          minRows={2}
          maxRows={4}
          autosize
        />

        <Group justify="flex-end" mt={8}>
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleTimeout}
            loading={loading}
            disabled={effectiveDuration <= 0}
          >
            Timeout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
