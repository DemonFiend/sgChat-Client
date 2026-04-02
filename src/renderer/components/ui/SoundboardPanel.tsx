import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Paper, Stack, Group, Text, Button, TextInput, ScrollArea,
  Tooltip, ActionIcon, Grid, Loader, Badge,
} from '@mantine/core';
import {
  IconMusic, IconX, IconUpload, IconTrash,
  IconPlayerPlay, IconSpeakerphone, IconSearch,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { soundService } from '../../lib/soundService';
import { resolveAssetUrl } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';
import {
  useSoundboardFetch,
  useSoundboardPlay,
  useSoundboardUpload,
  useSoundboardDelete,
  type SoundboardSound,
} from '../../hooks/useSoundboard';

interface SoundboardPanelProps {
  serverId?: string;
  opened?: boolean;
  onClose?: () => void;
}

/** Validate audio file duration using Web Audio API (returns ms) */
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ctx = new AudioContext();
      ctx.decodeAudioData(
        reader.result as ArrayBuffer,
        (buffer) => {
          const durationMs = Math.round(buffer.duration * 1000);
          ctx.close();
          resolve(durationMs);
        },
        (err) => {
          ctx.close();
          reject(err);
        },
      );
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function SoundboardPanel({ serverId: serverIdProp, opened, onClose }: SoundboardPanelProps) {
  const storeServerId = useUIStore((s) => s.activeServerId);
  const serverId = serverIdProp ?? storeServerId;
  const currentUserId = useAuthStore((s) => s.user?.id) ?? null;

  const [search, setSearch] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadEmoji, setUploadEmoji] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useSoundboardFetch(opened ? serverId : null);
  const sounds = useMemo(() => data?.sounds ?? [], [data?.sounds]);
  const config = data?.config;

  const playMutation = useSoundboardPlay(serverId ?? '');
  const uploadMutation = useSoundboardUpload(serverId ?? '');
  const deleteMutation = useSoundboardDelete(serverId ?? '');

  // Filtered sounds by search (name or uploader)
  const filteredSounds = useMemo(() => {
    if (!search.trim()) return sounds;
    const q = search.toLowerCase();
    return sounds.filter(
      (s) => s.name.toLowerCase().includes(q) || s.uploader_username.toLowerCase().includes(q),
    );
  }, [sounds, search]);

  // How many sounds the current user has uploaded
  const userSoundCount = useMemo(
    () => sounds.filter((s) => s.uploaded_by === currentUserId).length,
    [sounds, currentUserId],
  );
  const maxPerUser = config?.sounds_per_user ?? 10;

  // Play locally (only the user hears it)
  const handlePlayLocal = useCallback((sound: SoundboardSound) => {
    const url = resolveAssetUrl(sound.sound_url);
    soundService.playUrl(url);
  }, []);

  // Broadcast (all voice members hear it via server)
  const handleBroadcast = useCallback((sound: SoundboardSound) => {
    playMutation.mutate(sound.id, {
      onError: () => {
        toastStore.addToast({
          type: 'warning',
          title: 'Soundboard',
          message: 'Failed to broadcast sound.',
        });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMutation.mutate]);

  // Delete own sound
  const handleDelete = useCallback((soundId: string) => {
    deleteMutation.mutate(soundId, {
      onError: () => {
        toastStore.addToast({
          type: 'warning',
          title: 'Soundboard',
          message: 'Failed to delete sound.',
        });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteMutation.mutate]);

  // File input change handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = config?.allowed_mime_types ?? [
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
    ];
    if (!allowedTypes.includes(file.type)) {
      toastStore.addToast({
        type: 'warning',
        title: 'Invalid File',
        message: `Only these audio types are allowed: ${allowedTypes.join(', ')}`,
      });
      return;
    }

    const maxSize = config?.max_file_size_bytes ?? 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toastStore.addToast({
        type: 'warning',
        title: 'File Too Large',
        message: `Max file size is ${Math.round(maxSize / 1024 / 1024)}MB.`,
      });
      return;
    }

    setUploadFile(file);
    if (!uploadName) {
      // Auto-fill name from filename (strip extension)
      setUploadName(file.name.replace(/\.[^.]+$/, ''));
    }
  }, [config, uploadName]);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!uploadFile || !uploadName.trim()) return;

    // Validate duration via Web Audio API
    const maxDuration = config?.max_duration_ms ?? 10000;
    setUploading(true);
    try {
      const duration = await getAudioDuration(uploadFile);
      if (duration > maxDuration) {
        toastStore.addToast({
          type: 'warning',
          title: 'Too Long',
          message: `Max duration is ${maxDuration / 1000}s. Your file is ${(duration / 1000).toFixed(1)}s.`,
        });
        setUploading(false);
        return;
      }
    } catch {
      // If decoding fails, let the server validate
    }

    uploadMutation.mutate(
      { file: uploadFile, name: uploadName.trim(), emoji: uploadEmoji.trim() || undefined },
      {
        onSuccess: () => {
          setUploadFile(null);
          setUploadName('');
          setUploadEmoji('');
          setShowUpload(false);
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          toastStore.addToast({
            type: 'system',
            title: 'Soundboard',
            message: 'Sound uploaded successfully!',
          });
        },
        onError: () => {
          setUploading(false);
          toastStore.addToast({
            type: 'warning',
            title: 'Upload Failed',
            message: 'Failed to upload sound.',
          });
        },
      },
    );
  }, [uploadFile, uploadName, uploadEmoji, config, uploadMutation]);

  if (!opened) return null;

  return (
    <Paper
      shadow="lg"
      radius="md"
      style={{
        position: 'absolute',
        bottom: 60,
        left: 16,
        width: 320,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <Group gap={8} px={12} py={8} style={{ borderBottom: '1px solid var(--border)' }}>
        <IconMusic size={16} style={{ color: 'var(--accent)' }} />
        <Text size="sm" fw={600} style={{ flex: 1 }}>Soundboard</Text>
        {config && (
          <Badge size="xs" variant="light" color="gray">
            {sounds.length}/{config.max_sounds}
          </Badge>
        )}
        <ActionIcon aria-label="Close" variant="subtle" color="gray" size={24} onClick={onClose}>
          <IconX size={12} />
        </ActionIcon>
      </Group>

      {/* Search + Upload toggle */}
      <Group gap={6} px={8} py={6}>
        <TextInput
          placeholder="Search sounds..."
          size="xs"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Tooltip label={userSoundCount >= maxPerUser ? `Upload limit reached (${maxPerUser})` : 'Upload sound'} position="top" withArrow>
          <ActionIcon
            aria-label={userSoundCount >= maxPerUser ? `Upload limit reached (${maxPerUser})` : 'Upload sound'}
            variant="subtle"
            color="brand"
            size={28}
            onClick={() => setShowUpload(!showUpload)}
            disabled={userSoundCount >= maxPerUser}
          >
            <IconUpload size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Upload section */}
      {showUpload && (
        <Stack gap={6} px={8} pb={6} style={{ borderBottom: '1px solid var(--border)' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            variant="light"
            size="xs"
            leftSection={<IconUpload size={14} />}
            onClick={() => fileInputRef.current?.click()}
            fullWidth
          >
            {uploadFile ? uploadFile.name : 'Choose audio file'}
          </Button>
          <Group gap={6}>
            <TextInput
              placeholder="Sound name"
              size="xs"
              value={uploadName}
              onChange={(e) => setUploadName(e.currentTarget.value)}
              style={{ flex: 1 }}
              maxLength={32}
            />
            <TextInput
              placeholder="Emoji"
              size="xs"
              value={uploadEmoji}
              onChange={(e) => setUploadEmoji(e.currentTarget.value)}
              w={60}
              maxLength={4}
            />
          </Group>
          <Group gap={6}>
            <Badge size="xs" variant="light" color="gray">
              Your sounds: {userSoundCount}/{maxPerUser}
            </Badge>
            <div style={{ flex: 1 }} />
            <Button
              size="xs"
              variant="light"
              color="gray"
              onClick={() => {
                setShowUpload(false);
                setUploadFile(null);
                setUploadName('');
                setUploadEmoji('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={!uploadFile || !uploadName.trim() || uploading}
              loading={uploading}
              onClick={handleUpload}
            >
              Upload
            </Button>
          </Group>
        </Stack>
      )}

      {/* Sound list */}
      <ScrollArea mah={280} scrollbarSize={4} type="hover">
        {isLoading ? (
          <Stack align="center" py="md">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">Loading sounds...</Text>
          </Stack>
        ) : filteredSounds.length === 0 ? (
          <Stack align="center" py="md">
            <Text size="xs" c="dimmed">
              {search ? 'No sounds match your search.' : 'No sounds yet. Upload one!'}
            </Text>
          </Stack>
        ) : (
          <Grid gutter={4} p={8}>
            {filteredSounds.map((sound) => (
              <Grid.Col key={sound.id} span={6}>
                <Paper
                  radius="sm"
                  p={6}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <Group gap={4} wrap="nowrap" mb={2}>
                    <Text size="md" style={{ lineHeight: 1 }}>
                      {sound.emoji || '\u{1F50A}'}
                    </Text>
                    <Text size="xs" fw={500} truncate style={{ flex: 1 }}>
                      {sound.name}
                    </Text>
                  </Group>

                  <Group gap={4} mb={4}>
                    <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                      {sound.uploader_username}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {sound.play_count > 0 ? `${sound.play_count}\u00D7` : ''}
                    </Text>
                  </Group>

                  <Group gap={4}>
                    <Tooltip label="Play locally (only you)" position="bottom" withArrow>
                      <ActionIcon
                        aria-label="Play locally (only you)"
                        variant="subtle"
                        color="gray"
                        size={22}
                        onClick={() => handlePlayLocal(sound)}
                      >
                        <IconPlayerPlay size={12} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Broadcast to voice" position="bottom" withArrow>
                      <ActionIcon
                        aria-label="Broadcast to voice"
                        variant="subtle"
                        color="brand"
                        size={22}
                        onClick={() => handleBroadcast(sound)}
                        loading={playMutation.isPending && playMutation.variables === sound.id}
                      >
                        <IconSpeakerphone size={12} />
                      </ActionIcon>
                    </Tooltip>

                    {sound.uploaded_by === currentUserId && (
                      <Tooltip label="Delete" position="bottom" withArrow>
                        <ActionIcon
                          aria-label="Delete"
                          variant="subtle"
                          color="red"
                          size={22}
                          onClick={() => handleDelete(sound.id)}
                          loading={deleteMutation.isPending && deleteMutation.variables === sound.id}
                          ml="auto"
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </ScrollArea>
    </Paper>
  );
}
