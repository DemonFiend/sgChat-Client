import { useCallback, useEffect, useMemo } from 'react';
import { ActionIcon, Group, Menu, Text, Tooltip } from '@mantine/core';
import {
  IconServer,
  IconSignal,
  IconSignalOff,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { useNetworkStore, type RelayServer } from '../../stores/networkStore';
import { startRelayPingService } from '../../lib/relayPing';

// ── Helpers ──────────────────────────────────────────────────────

function pingColor(ms: number | undefined): string {
  if (ms === undefined) return 'var(--mantine-color-dimmed)';
  if (ms < 80) return 'var(--mantine-color-green-6)';
  if (ms < 200) return 'var(--mantine-color-yellow-6)';
  return 'var(--mantine-color-red-6)';
}

function pingLabel(ms: number | undefined): string {
  if (ms === undefined) return '---';
  return `${ms}ms`;
}

function statusIcon(relay: RelayServer, ping: number | undefined) {
  if (relay.status === 'offline' || ping === undefined) {
    return <IconSignalOff size={14} style={{ color: 'var(--mantine-color-red-6)' }} />;
  }
  return <IconSignal size={14} style={{ color: pingColor(ping) }} />;
}

// ── Component ────────────────────────────────────────────────────

export function NetworkSelector() {
  const relays = useNetworkStore((s) => s.relays);
  const selectedRelayId = useNetworkStore((s) => s.selectedRelayId);
  const pings = useNetworkStore((s) => s.pings);
  const selectRelay = useNetworkStore((s) => s.selectRelay);

  // Start ping service on mount
  useEffect(() => {
    startRelayPingService();
  }, []);

  const selectedRelay = useMemo(
    () => relays.find((r) => r.id === selectedRelayId) ?? null,
    [relays, selectedRelayId],
  );

  const handleSelect = useCallback(
    (relayId: string) => {
      selectRelay(relayId === selectedRelayId ? null : relayId);
    },
    [selectRelay, selectedRelayId],
  );

  const handleAutoSelect = useCallback(() => {
    selectRelay(null); // null = auto (best ping)
  }, [selectRelay]);

  if (relays.length === 0) return null;

  return (
    <Menu shadow="md" width={260} position="bottom-end" withArrow>
      <Menu.Target>
        <Tooltip label={selectedRelay ? `Relay: ${selectedRelay.name}` : 'Auto relay'} withArrow>
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconServer size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Relay Servers</Menu.Label>

        {/* Auto-select option */}
        <Menu.Item
          leftSection={<IconRefresh size={14} />}
          rightSection={
            selectedRelayId === null ? (
              <IconCheck size={14} style={{ color: 'var(--mantine-color-green-6)' }} />
            ) : undefined
          }
          onClick={handleAutoSelect}
        >
          <Text size="sm">Auto (best ping)</Text>
        </Menu.Item>

        <Menu.Divider />

        {/* Relay list */}
        {relays.map((relay) => {
          const ping = pings[relay.id];
          const isSelected = relay.id === selectedRelayId;

          return (
            <Menu.Item
              key={relay.id}
              leftSection={statusIcon(relay, ping)}
              rightSection={
                <Group gap={8} wrap="nowrap">
                  <Text size="xs" c={pingColor(ping)} fw={500}>
                    {pingLabel(ping)}
                  </Text>
                  {isSelected && (
                    <IconCheck size={14} style={{ color: 'var(--mantine-color-green-6)' }} />
                  )}
                </Group>
              }
              onClick={() => handleSelect(relay.id)}
              disabled={relay.status === 'offline'}
            >
              <div>
                <Text size="sm" fw={isSelected ? 600 : 400} truncate>
                  {relay.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {relay.region}
                </Text>
              </div>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
