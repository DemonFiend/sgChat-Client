import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Select, Stack, Text } from '@mantine/core';
import { api } from '../../../lib/api';
import { useChannels, type Channel } from '../../../hooks/useChannels';

const AFK_TIMEOUT_OPTIONS = [
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
  { value: '900', label: '15 minutes' },
  { value: '1800', label: '30 minutes' },
  { value: '3600', label: '1 hour' },
];

interface ServerSettings {
  afk_channel_id: string | null;
  afk_timeout: number | null;
}

export function AFKSettingsPanel({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient();
  const { data: channels } = useChannels(serverId);

  const { data: serverInfo, isLoading } = useQuery({
    queryKey: ['server-info', serverId],
    queryFn: () => api.get<ServerSettings>(`/api/servers/${serverId}`),
  });

  const [afkChannelId, setAfkChannelId] = useState<string | null>(null);
  const [afkTimeout, setAfkTimeout] = useState<string>('300');

  useEffect(() => {
    if (serverInfo) {
      setAfkChannelId(serverInfo.afk_channel_id ?? null);
      setAfkTimeout(String(serverInfo.afk_timeout ?? 300));
    }
  }, [serverInfo]);

  const voiceChannels: { value: string; label: string }[] = (channels ?? [])
    .filter((c: Channel) => c.type === 'voice')
    .map((c: Channel) => ({ value: c.id, label: c.name }));

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/servers/${serverId}`, {
        afk_channel_id: afkChannelId,
        afk_timeout: Number(afkTimeout),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-info', serverId] });
    },
  });

  const hasChanges =
    afkChannelId !== (serverInfo?.afk_channel_id ?? null) ||
    afkTimeout !== String(serverInfo?.afk_timeout ?? 300);

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>AFK Settings</Text>
      <Text size="sm" c="dimmed">
        Configure the AFK voice channel and idle timeout for this server.
        Members idle beyond the timeout will be moved to the AFK channel.
      </Text>

      {isLoading ? (
        <Text size="sm" c="dimmed">Loading...</Text>
      ) : (
        <Stack gap={12} style={{ maxWidth: 400 }}>
          <Select
            label="AFK Channel"
            placeholder="No AFK channel"
            data={voiceChannels}
            value={afkChannelId}
            onChange={setAfkChannelId}
            clearable
          />

          <Select
            label="AFK Timeout"
            data={AFK_TIMEOUT_OPTIONS}
            value={afkTimeout}
            onChange={(v) => v && setAfkTimeout(v)}
          />

          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!hasChanges}
            style={{ alignSelf: 'flex-start' }}
          >
            Save Changes
          </Button>

          {mutation.isError && (
            <Text size="sm" c="red">Failed to save AFK settings.</Text>
          )}
          {mutation.isSuccess && !hasChanges && (
            <Text size="sm" c="green">Settings saved.</Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
