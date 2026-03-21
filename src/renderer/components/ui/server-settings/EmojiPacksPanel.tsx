import { useState } from 'react';
import {
  ActionIcon, Badge, Button, Divider,
  Group, Loader, Stack, Switch, Text, TextInput, Tooltip,
} from '@mantine/core';
import { IconMoodSmile, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import {
  useEmojiPacks, useDefaultEmojiPacks, useCreateEmojiPack,
  useUpdateEmojiPack, useDeleteEmojiPack, useAddEmoji,
  useDeleteEmoji, useInstallDefaultPack, useToggleMasterEmoji,
  useEmojiPackDetail,
} from '../../../hooks/useEmojis';
import { useEmojiStore, type CustomEmoji } from '../../../stores/emojiStore';
import { resolveAssetUrl } from '../../../lib/api';

export function EmojiPacksPanel({ serverId }: { serverId: string }) {
  const { data: packs, isLoading } = useEmojiPacks(serverId);
  const { data: defaults } = useDefaultEmojiPacks(serverId);
  const createPack = useCreateEmojiPack(serverId);
  const updatePack = useUpdateEmojiPack(serverId);
  const deletePack = useDeleteEmojiPack(serverId);
  const addEmoji = useAddEmoji(serverId);
  const deleteEmoji = useDeleteEmoji(serverId);
  const installDefault = useInstallDefaultPack(serverId);
  const toggleMaster = useToggleMasterEmoji(serverId);
  const manifest = useEmojiStore((s) => s.manifest);

  const [newPackName, setNewPackName] = useState('');
  const [newPackDesc, setNewPackDesc] = useState('');
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  // Fetch individual pack details (with emojis) when expanded
  const { data: packDetail, isLoading: packDetailLoading } = useEmojiPackDetail(serverId, expandedPack);

  const masterEnabled = manifest?.master_enabled ?? true;

  /** Get the emojis to display for an expanded pack */
  const getPackEmojis = (pack: { id: string; emojis?: CustomEmoji[] }): CustomEmoji[] => {
    if (expandedPack === pack.id && packDetail?.emojis && packDetail.emojis.length > 0) {
      return packDetail.emojis;
    }
    if (pack.emojis && pack.emojis.length > 0) return pack.emojis;
    // Fall back to manifest emojis for this pack
    if (manifest) {
      return manifest.emojis.filter((e) => e.pack_id === pack.id);
    }
    return [];
  };

  const handleCreatePack = () => {
    if (!newPackName.trim()) return;
    createPack.mutate({ name: newPackName.trim(), description: newPackDesc.trim() || undefined }, {
      onSuccess: () => { setNewPackName(''); setNewPackDesc(''); },
    });
  };

  if (isLoading) return <Text size="sm" c="dimmed">Loading emoji packs...</Text>;

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Emoji Packs</Text>

      {/* Master toggle */}
      <Group justify="space-between">
        <div>
          <Text size="sm" fw={600}>Custom Emojis</Text>
          <Text size="xs" c="dimmed">Enable or disable custom emoji packs for this server</Text>
        </div>
        <Switch
          checked={masterEnabled}
          onChange={(e) => toggleMaster.mutate(e.currentTarget.checked)}
        />
      </Group>

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Installed packs */}
      <Text size="sm" fw={600}>Installed Packs ({packs?.length || 0})</Text>

      {(!packs || packs.length === 0) && (
        <Text size="sm" c="dimmed">No emoji packs installed. Create one or install a default pack below.</Text>
      )}

      {packs?.map((pack) => (
        <div key={pack.id} style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: 'var(--bg-secondary)',
        }}>
          <Group justify="space-between" p="8px 12px" style={{ cursor: 'pointer' }}
            onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
          >
            <Group gap={8}>
              <IconMoodSmile size={16} style={{ color: 'var(--text-muted)' }} />
              <div>
                <Text size="sm" fw={600}>{pack.name}</Text>
                {pack.description && <Text size="xs" c="dimmed">{pack.description}</Text>}
              </div>
            </Group>
            <Group gap={8}>
              <Badge size="sm" variant="light">{pack.emoji_count || pack.emojis?.length || manifest?.emojis.filter((e) => e.pack_id === pack.id).length || 0} emojis</Badge>
              <Switch
                size="xs"
                checked={pack.enabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updatePack.mutate({ packId: pack.id, enabled: e.currentTarget.checked })}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                size={20}
                onClick={(e) => { e.stopPropagation(); deletePack.mutate(pack.id); }}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Expanded: show emojis + upload */}
          {expandedPack === pack.id && (() => {
            const emojis = getPackEmojis(pack);
            return (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
              {packDetailLoading && (
                <Group gap={8} mb={8}><Loader size={14} /> <Text size="xs" c="dimmed">Loading emojis...</Text></Group>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {emojis.map((emoji) => (
                  <Tooltip key={emoji.id} label={`:${emoji.shortcode}:`} position="top" withArrow>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={resolveAssetUrl(emoji.image_url)}
                        alt={emoji.shortcode || ''}
                        width={32}
                        height={32}
                        style={{ objectFit: 'contain', borderRadius: 4, background: 'var(--bg-primary)', padding: 2 }}
                      />
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size={14}
                        style={{ position: 'absolute', top: -4, right: -4 }}
                        onClick={() => deleteEmoji.mutate(emoji.id)}
                      >
                        <IconX size={8} />
                      </ActionIcon>
                    </div>
                  </Tooltip>
                ))}
                {!packDetailLoading && emojis.length === 0 && (
                  <Text size="xs" c="dimmed">No emojis in this pack yet</Text>
                )}
              </div>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconUpload size={12} />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/png,image/gif,image/webp,image/jpeg';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) addEmoji.mutate({ packId: pack.id, file });
                  };
                  input.click();
                }}
              >
                Upload Emoji
              </Button>
            </div>
            );
          })()}
        </div>
      ))}

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Create new pack */}
      <Text size="sm" fw={600}>Create New Pack</Text>
      <Group align="flex-end" gap={8}>
        <TextInput
          label="Pack Name"
          placeholder="My Emojis"
          value={newPackName}
          onChange={(e) => setNewPackName(e.currentTarget.value)}
          maxLength={50}
          style={{ flex: 1 }}
          size="sm"
        />
        <Button size="sm" onClick={handleCreatePack} loading={createPack.isPending} disabled={!newPackName.trim()}>
          Create
        </Button>
      </Group>
      <TextInput
        placeholder="Description (optional)"
        value={newPackDesc}
        onChange={(e) => setNewPackDesc(e.currentTarget.value)}
        maxLength={200}
        size="sm"
      />

      {/* Default/bundled packs — filter out already-installed packs */}
      {(() => {
        const installedKeys = new Set((packs || []).map((p) => (p.name || '').toLowerCase()));
        const availableDefaults = (defaults || []).filter((dp) => !installedKeys.has((dp.name || '').toLowerCase()) && !installedKeys.has((dp.key || '').toLowerCase()));
        return availableDefaults.length > 0 && (
        <>
          <Divider style={{ borderColor: 'var(--border)' }} />
          <Text size="sm" fw={600}>Available Default Packs</Text>
          <Stack gap={8}>
            {availableDefaults.map((dp) => (
              <Group key={dp.key} justify="space-between" p="8px 12px" style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg-secondary)',
              }}>
                <div>
                  <Text size="sm" fw={600}>{dp.name}</Text>
                  <Text size="xs" c="dimmed">{dp.description} ({dp.emoji_count} emojis)</Text>
                </div>
                <Group gap={4}>
                  {dp.preview_urls?.slice(0, 4).map((url: string, i: number) => (
                    <img key={i} src={resolveAssetUrl(url)} width={20} height={20} style={{ objectFit: 'contain' }} />
                  ))}
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => installDefault.mutate(dp.key)}
                    loading={installDefault.isPending}
                  >
                    Install
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        </>
        );
      })()}
    </Stack>
  );
}
