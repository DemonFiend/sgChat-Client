import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ActionIcon, Badge, Button, CopyButton, Divider, Group, Loader, Menu,
  Select, Stack, Text, TextInput, Tooltip,
} from '@mantine/core';
import {
  IconServer2, IconPlus, IconTrash, IconRefresh, IconPlayerPause,
  IconArrowBarDown, IconCopy, IconCheck, IconDots,
} from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { toastStore } from '../../../stores/toastNotifications';

interface Relay {
  id: string;
  name: string;
  region: string;
  status: 'pending' | 'trusted' | 'suspended' | 'draining' | 'offline';
  last_health_status: 'healthy' | 'degraded' | 'unreachable';
  current_participants: number;
  max_participants: number;
  livekit_url: string;
  pairing_token?: string;
}

const REGIONS = [
  { value: 'us-east', label: 'US East' },
  { value: 'us-west', label: 'US West' },
  { value: 'us-central', label: 'US Central' },
  { value: 'eu-west', label: 'EU West' },
  { value: 'eu-central', label: 'EU Central' },
  { value: 'eu-north', label: 'EU North' },
  { value: 'asia-east', label: 'Asia East' },
  { value: 'asia-southeast', label: 'Asia Southeast' },
  { value: 'asia-south', label: 'Asia South' },
  { value: 'oceania', label: 'Oceania' },
  { value: 'south-america', label: 'South America' },
  { value: 'africa', label: 'Africa' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  trusted: 'green',
  suspended: 'red',
  draining: 'orange',
  offline: 'gray',
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'green',
  degraded: 'yellow',
  unreachable: 'red',
};

export function RelayServersPanel({ serverId: _serverId }: { serverId: string }) {
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [pairingRelayName, setPairingRelayName] = useState<string | null>(null);

  const { data: relays, isLoading } = useQuery({
    queryKey: ['admin-relays'],
    queryFn: () => api.get<Relay[]>('/api/admin/relays').then((d) => {
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object') {
        for (const val of Object.values(d as Record<string, unknown>)) {
          if (Array.isArray(val)) return val as Relay[];
        }
      }
      return [];
    }),
  });

  const createRelay = useMutation({
    mutationFn: (body: { name: string; region: string }) =>
      api.post<Relay & { pairing_token: string }>('/api/admin/relays', body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-relays'] });
      setPairingToken(data.pairing_token);
      setPairingRelayName(data.name ?? newName);
      setNewName('');
      setNewRegion(null);
      setShowCreateForm(false);
      toastStore.addToast({ type: 'success', title: 'Relay Created', message: 'New relay server added. Copy the pairing token.' });
    },
    onError: (err: any) => {
      toastStore.addToast({ type: 'warning', title: 'Create Failed', message: err?.message || 'Could not create relay.' });
    },
  });

  const suspendRelay = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/relays/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-relays'] });
      toastStore.addToast({ type: 'system', title: 'Relay Suspended', message: 'Relay has been suspended.' });
    },
    onError: (err: any) => {
      toastStore.addToast({ type: 'warning', title: 'Suspend Failed', message: err?.message || 'Unknown error' });
    },
  });

  const drainRelay = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/relays/${id}/drain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-relays'] });
      toastStore.addToast({ type: 'system', title: 'Relay Draining', message: 'Relay is draining active connections.' });
    },
    onError: (err: any) => {
      toastStore.addToast({ type: 'warning', title: 'Drain Failed', message: err?.message || 'Unknown error' });
    },
  });

  const regenerateToken = useMutation({
    mutationFn: (id: string) => api.post<{ pairing_token: string }>(`/api/admin/relays/${id}/regenerate`),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-relays'] });
      const relay = relays?.find((r) => r.id === id);
      setPairingToken(data.pairing_token);
      setPairingRelayName(relay?.name ?? 'Relay');
      toastStore.addToast({ type: 'success', title: 'Token Regenerated', message: 'Copy the new pairing token.' });
    },
    onError: (err: any) => {
      toastStore.addToast({ type: 'warning', title: 'Regenerate Failed', message: err?.message || 'Unknown error' });
    },
  });

  const deleteRelay = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/relays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-relays'] });
      toastStore.addToast({ type: 'system', title: 'Relay Deleted', message: 'Relay server removed.' });
    },
    onError: (err: any) => {
      toastStore.addToast({ type: 'warning', title: 'Delete Failed', message: err?.message || 'Unknown error' });
    },
  });

  if (isLoading) {
    return (
      <Stack align="center" py={40}>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading relay servers...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <div>
          <Text size="lg" fw={700}>Relay Servers</Text>
          <Text size="xs" c="dimmed">Manage voice infrastructure relay servers</Text>
        </div>
        <Button
          leftSection={<IconPlus size={14} />}
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          Add Relay
        </Button>
      </Group>

      {/* Pairing token banner */}
      {pairingToken && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--accent)',
        }}>
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={600}>Pairing Token for "{pairingRelayName}"</Text>
            <ActionIcon variant="subtle" size="sm" onClick={() => { setPairingToken(null); setPairingRelayName(null); }}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <Group gap={8}>
            <TextInput
              value={pairingToken}
              readOnly
              size="xs"
              style={{ flex: 1 }}
              styles={{ input: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
            />
            <CopyButton value={pairingToken}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                  <ActionIcon variant="light" color={copied ? 'teal' : 'gray'} onClick={copy}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            Use this token to pair the relay with your server. It will not be shown again.
          </Text>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}>
          <Text size="sm" fw={600} mb={8}>New Relay Server</Text>
          <Stack gap={8}>
            <TextInput
              label="Name"
              placeholder="e.g. US East Primary"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              size="sm"
            />
            <Select
              label="Region"
              placeholder="Select region"
              value={newRegion}
              onChange={setNewRegion}
              data={REGIONS}
              size="sm"
            />
            <Group gap={8}>
              <Button
                size="sm"
                onClick={() => createRelay.mutate({ name: newName.trim(), region: newRegion! })}
                loading={createRelay.isPending}
                disabled={!newName.trim() || !newRegion}
              >
                Create
              </Button>
              <Button size="sm" variant="subtle" color="gray" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </div>
      )}

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Relay list */}
      {(!relays || relays.length === 0) ? (
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
          No relay servers configured.
        </Text>
      ) : (
        <Stack gap={8}>
          {relays.map((relay) => (
            <div
              key={relay.id}
              style={{
                padding: 12,
                borderRadius: 6,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <IconServer2 size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      <Text size="sm" fw={600} truncate>{relay.name}</Text>
                      <Badge size="xs" variant="light" color={STATUS_COLORS[relay.status] || 'gray'}>
                        {relay.status}
                      </Badge>
                      <Badge size="xs" variant="dot" color={HEALTH_COLORS[relay.last_health_status] || 'gray'}>
                        {relay.last_health_status}
                      </Badge>
                    </Group>
                    <Group gap={12} mt={2}>
                      <Text size="xs" c="dimmed">Region: {relay.region}</Text>
                      <Text size="xs" c="dimmed">
                        Participants: {relay.current_participants}/{relay.max_participants || '--'}
                      </Text>
                      {relay.livekit_url && (
                        <Text size="xs" c="dimmed" truncate>{relay.livekit_url}</Text>
                      )}
                    </Group>
                  </div>
                </Group>

                <Menu shadow="md" width={180} position="bottom-end" withArrow>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    {relay.status !== 'suspended' && (
                      <Menu.Item
                        leftSection={<IconPlayerPause size={14} />}
                        onClick={() => suspendRelay.mutate(relay.id)}
                      >
                        Suspend
                      </Menu.Item>
                    )}
                    {relay.status === 'trusted' && (
                      <Menu.Item
                        leftSection={<IconArrowBarDown size={14} />}
                        onClick={() => drainRelay.mutate(relay.id)}
                      >
                        Drain
                      </Menu.Item>
                    )}
                    <Menu.Item
                      leftSection={<IconRefresh size={14} />}
                      onClick={() => regenerateToken.mutate(relay.id)}
                    >
                      Regenerate Token
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => deleteRelay.mutate(relay.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
