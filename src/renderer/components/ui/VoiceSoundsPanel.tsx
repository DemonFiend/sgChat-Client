import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActionIcon, Button, Group, Loader, Stack, Text, Tooltip } from '@mantine/core';
import { IconPlayerPlay, IconTrash, IconUpload } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { soundService } from '../../lib/soundService';
import { toastStore } from '../../stores/toastNotifications';

interface VoiceSoundsPanelProps {
  serverId: string;
}

const SOUND_TYPES = [
  { type: 'join', label: 'Join Sound', description: 'Played when you join a voice channel' },
  { type: 'leave', label: 'Leave Sound', description: 'Played when you leave a voice channel' },
] as const;

const MAX_SIZE = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

export function VoiceSoundsPanel({ serverId }: VoiceSoundsPanelProps) {
  const { data: sounds, isLoading } = useQuery({
    queryKey: ['voice-sounds', serverId],
    queryFn: () => api.get<any[]>(`/api/users/me/servers/${serverId}/sounds`),
    enabled: !!serverId,
  });

  if (isLoading) return <Loader size="sm" />;

  return (
    <Stack gap={20}>
      <Text size="sm" c="dimmed">Upload custom sounds that play when you join or leave voice channels on this server.</Text>
      {SOUND_TYPES.map(({ type, label, description }) => {
        const existing = sounds?.find((s: any) => s.sound_type === type);
        return (
          <SoundTypeRow
            key={type}
            serverId={serverId}
            soundType={type}
            label={label}
            description={description}
            existingUrl={existing?.sound_url}
          />
        );
      })}
    </Stack>
  );
}

function SoundTypeRow({ serverId, soundType, label, description, existingUrl }: {
  serverId: string;
  soundType: string;
  label: string;
  description: string;
  existingUrl?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_SIZE) {
      toastStore.addToast({ type: 'warning', title: 'File Too Large', message: 'Maximum size is 1MB.' });
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toastStore.addToast({ type: 'warning', title: 'Invalid Format', message: 'Only MP3, WAV, and OGG files are supported.' });
      return;
    }

    try {
      await api.upload(`/api/users/me/servers/${serverId}/sounds/${soundType}`, file);
      queryClient.invalidateQueries({ queryKey: ['voice-sounds', serverId] });
      toastStore.addToast({ type: 'system', title: 'Sound Uploaded', message: `${label} updated.` });
    } catch (err) {
      toastStore.addToast({ type: 'warning', title: 'Upload Failed', message: (err as any)?.message || 'Unknown error' });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/users/me/servers/${serverId}/sounds/${soundType}`);
      queryClient.invalidateQueries({ queryKey: ['voice-sounds', serverId] });
      toastStore.addToast({ type: 'system', title: 'Sound Removed', message: `${label} removed.` });
    } catch (err) {
      toastStore.addToast({ type: 'warning', title: 'Delete Failed', message: (err as any)?.message || 'Unknown error' });
    }
  };

  return (
    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
      <Group justify="space-between" mb={4}>
        <div>
          <Text size="sm" fw={600}>{label}</Text>
          <Text size="xs" c="dimmed">{description}</Text>
        </div>
        <Group gap={4}>
          {existingUrl && (
            <>
              <Tooltip label="Preview" withArrow>
                <ActionIcon variant="subtle" color="gray" size={28} onClick={() => soundService.playUrl(existingUrl)}>
                  <IconPlayerPlay size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Remove" withArrow>
                <ActionIcon variant="subtle" color="red" size={28} onClick={handleDelete}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          <Button
            size="xs"
            variant="light"
            leftSection={<IconUpload size={14} />}
            onClick={() => fileInputRef.current?.click()}
          >
            {existingUrl ? 'Replace' : 'Upload'}
          </Button>
        </Group>
      </Group>
      {existingUrl && (
        <Text size="xs" c="dimmed" truncate>Current: {existingUrl.split('/').pop()}</Text>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/ogg"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
    </div>
  );
}
