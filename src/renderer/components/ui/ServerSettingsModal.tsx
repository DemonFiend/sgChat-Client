import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Avatar, Badge, Button, CopyButton, Divider,
  Group, Modal, NavLink, NumberInput, ScrollArea, Select, Stack, Switch, Text,
  TextInput, Textarea, Tooltip,
} from '@mantine/core';
import {
  IconSettings, IconHash, IconLink, IconPlus,
  IconTrash, IconCopy, IconCheck, IconBan,
  IconArrowUp, IconArrowDown, IconVolume,
  IconUpload, IconWebhook, IconSticker, IconChartBar,
  IconMessageCircle,
} from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { ServerPopupConfigForm } from './ServerPopupConfigForm';
import { VoiceSoundsPanel } from './VoiceSoundsPanel';
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook } from '../../hooks/useWebhooks';
import { useStickers, useUploadSticker, useDeleteSticker } from '../../hooks/useStickers';
import { useChannels } from '../../hooks/useChannels';
import { type Channel, type Invite, type Ban, type SoundboardSound } from './server-settings/types';

interface ServerSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
}

export function ServerSettingsModal({ opened, onClose, serverId }: ServerSettingsModalProps) {
  const [tab, setTab] = useState('general');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Server Settings"
      size="xl"
      centered
      transitionProps={{ transition: 'pop', duration: 200 }}
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid var(--border)', padding: '12px 16px' },
      }}
    >
      <div style={{ display: 'flex', minHeight: 480 }}>
        <Stack gap={2} style={{ width: 170, flexShrink: 0, padding: 8, borderRight: '1px solid var(--border)' }}>
          <NavLink label="General" leftSection={<IconSettings size={16} />} active={tab === 'general'} onClick={() => setTab('general')} variant="subtle" />
          <NavLink label="Channels" leftSection={<IconHash size={16} />} active={tab === 'channels'} onClick={() => setTab('channels')} variant="subtle" />
          <NavLink label="Invites" leftSection={<IconLink size={16} />} active={tab === 'invites'} onClick={() => setTab('invites')} variant="subtle" />
          <NavLink label="Bans" leftSection={<IconBan size={16} />} active={tab === 'bans'} onClick={() => setTab('bans')} variant="subtle" />
          <NavLink label="Statistics" leftSection={<IconChartBar size={16} />} active={tab === 'stats'} onClick={() => setTab('stats')} variant="subtle" />
          <NavLink label="Welcome Popup" leftSection={<IconMessageCircle size={16} />} active={tab === 'popup'} onClick={() => setTab('popup')} variant="subtle" />
          <NavLink label="Stickers" leftSection={<IconSticker size={16} />} active={tab === 'stickers'} onClick={() => setTab('stickers')} variant="subtle" />
          <NavLink label="Webhooks" leftSection={<IconWebhook size={16} />} active={tab === 'webhooks'} onClick={() => setTab('webhooks')} variant="subtle" />
          <NavLink label="Soundboard" leftSection={<IconVolume size={16} />} active={tab === 'soundboard'} onClick={() => setTab('soundboard')} variant="subtle" />
          <NavLink label="Voice Sounds" leftSection={<IconVolume size={16} />} active={tab === 'sounds'} onClick={() => setTab('sounds')} variant="subtle" />
        </Stack>

        <ScrollArea style={{ flex: 1, padding: 16 }}>
          {tab === 'general' && <GeneralTab serverId={serverId} />}
          {tab === 'channels' && <ChannelsTab serverId={serverId} />}
          {tab === 'invites' && <InvitesTab serverId={serverId} />}
          {tab === 'bans' && <BansTab serverId={serverId} />}
          {tab === 'stats' && <StatsTab serverId={serverId} />}
          {tab === 'popup' && <ServerPopupConfigForm serverId={serverId} />}
          {tab === 'stickers' && <StickersTab serverId={serverId} />}
          {tab === 'webhooks' && <WebhooksTab serverId={serverId} />}
          {tab === 'soundboard' && <SoundboardTab serverId={serverId} />}
          {tab === 'sounds' && <VoiceSoundsPanel serverId={serverId} />}
        </ScrollArea>
      </div>
    </Modal>
  );
}

/* ─── General Tab ─── */

function GeneralTab({ serverId }: { serverId: string }) {
  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => api.get<any>(`/api/servers/${serverId}`),
  });

  const { data: channels } = useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => api.getArray<Channel>(`/api/servers/${serverId}/channels`),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [motd, setMotd] = useState('');
  const [announceJoins, setAnnounceJoins] = useState(false);
  const [announceLeaves, setAnnounceLeaves] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState<string | null>(null);
  const [afkTimeout, setAfkTimeout] = useState<number | ''>(300);
  const [tempChannelTimeout, setTempChannelTimeout] = useState<number | ''>(900);
  const [saving, setSaving] = useState(false);

  // Banner state
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerDeleting, setBannerDeleting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setDescription(server.description || '');
      setMotd(server.motd || '');
      setBannerUrl(server.banner_url || null);
      setAnnounceJoins(server.announce_joins ?? server.settings?.announce_joins ?? false);
      setAnnounceLeaves(server.announce_leaves ?? server.settings?.announce_leaves ?? false);
      setWelcomeChannelId(server.welcome_channel_id ?? server.settings?.welcome_channel_id ?? null);
      setAfkTimeout(server.afk_timeout ?? server.settings?.afk_timeout ?? 300);
      setTempChannelTimeout(server.settings?.temp_channel_timeout ?? server.temp_channel_timeout ?? 900);
    }
  }, [server]);

  const textChannels = (channels || []).filter((c) => c.type === 'text' || c.type === 'announcement');

  const handleBannerUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setBannerError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setBannerError('File too large. Maximum size: 8 MB');
      return;
    }
    setBannerError(null);
    setBannerUploading(true);
    try {
      const result = await api.upload<{ banner_url: string }>('/api/server/banner', file);
      setBannerUrl(result.banner_url);
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch (err: any) {
      setBannerError(err.message || 'Failed to upload banner');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleBannerDelete = async () => {
    if (bannerDeleting) return;
    setBannerError(null);
    setBannerDeleting(true);
    try {
      await api.delete('/api/server/banner');
      setBannerUrl(null);
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch (err: any) {
      setBannerError(err.message || 'Failed to remove banner');
    } finally {
      setBannerDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/servers/${serverId}`, {
        name: name.trim(),
        description: description.trim() || null,
        motd: motd.trim() || null,
        announce_joins: announceJoins,
        announce_leaves: announceLeaves,
        welcome_channel_id: welcomeChannelId,
        afk_timeout: afkTimeout || 300,
        temp_channel_timeout: tempChannelTimeout || 900,
      });
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch (err) {
      console.error('Failed to save server settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>General</Text>

      {/* Server Banner */}
      <Stack gap={8}>
        <Text size="sm" fw={500}>Server Banner</Text>
        <div style={{
          width: '100%',
          height: 120,
          borderRadius: 8,
          background: bannerUrl ? `url(${bannerUrl}) center/cover` : 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <Button variant="light" size="xs" loading={bannerUploading} onClick={() => bannerFileRef.current?.click()}>
            {bannerUrl ? 'Change' : 'Upload Banner'}
          </Button>
          {bannerUrl && (
            <Button variant="light" size="xs" color="red" loading={bannerDeleting} onClick={handleBannerDelete}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={bannerFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleBannerUpload(f);
            e.target.value = '';
          }}
        />
        {bannerError && (
          <Text size="xs" c="red">{bannerError}</Text>
        )}
      </Stack>

      <TextInput
        label="Server Name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <Textarea
        label="Description"
        description="A short description of your server (max 500 characters)"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        maxLength={500}
        minRows={2}
        maxRows={3}
        autosize
      />

      <Textarea
        label="Message of the Day"
        description="Shown to members when they open the server"
        value={motd}
        onChange={(e) => setMotd(e.currentTarget.value)}
        minRows={2}
        maxRows={4}
        autosize
      />

      <Divider label="Announcements" labelPosition="left" />

      <Switch
        label="Announce Joins"
        description="Show a message when a member joins the server"
        checked={announceJoins}
        onChange={(e) => setAnnounceJoins(e.currentTarget.checked)}
      />

      <Switch
        label="Announce Leaves"
        description="Show a message when a member leaves the server"
        checked={announceLeaves}
        onChange={(e) => setAnnounceLeaves(e.currentTarget.checked)}
      />

      <Select
        label="Welcome Channel"
        description="Channel where join/leave announcements are posted"
        placeholder="Select a channel"
        value={welcomeChannelId}
        onChange={setWelcomeChannelId}
        data={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
        clearable
      />

      <Divider label="Voice" labelPosition="left" />

      <NumberInput
        label="AFK Timeout (seconds)"
        description="Move inactive voice users to AFK channel after this time"
        value={afkTimeout}
        onChange={setAfkTimeout}
        min={60}
        max={3600}
        step={60}
        style={{ maxWidth: 200 }}
      />

      <NumberInput
        label="Temp Channel Timeout (seconds)"
        description="How long an empty temp voice channel waits before being deleted (30s–24h)"
        value={tempChannelTimeout}
        onChange={setTempChannelTimeout}
        min={30}
        max={86400}
        step={30}
        style={{ maxWidth: 200 }}
      />

      <Group>
        <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
          Save Changes
        </Button>
      </Group>
    </Stack>
  );
}

/* ─── Channels Tab ─── */

function ChannelsTab({ serverId }: { serverId: string }) {
  const { data: channels } = useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => api.getArray<Channel>(`/api/servers/${serverId}/channels`),
  });

  const { data: fetchedCategories } = useQuery({
    queryKey: ['categories', serverId],
    queryFn: () => api.getArray<{ id: string; name: string; position: number }>(`/api/servers/${serverId}/categories`),
  });

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'text' | 'voice' | 'announcement' | 'music' | 'temp_voice_generator'>('text');
  const [creating, setCreating] = useState(false);

  const sorted = [...(channels || [])].sort((a, b) => a.position - b.position);
  const sortedCategories = [...(fetchedCategories || [])].sort((a, b) => a.position - b.position);
  const uncategorized = sorted.filter((c) => !c.category_id);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post(`/api/servers/${serverId}/channels`, {
        name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
        type: newType,
      });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      setNewName('');
    } catch { /* silently fail */ } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (channelId: string) => {
    try {
      await api.delete(`/api/channels/${channelId}`);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    } catch { /* silently fail */ }
  };

  const handleMoveChannel = async (list: Channel[], index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    const a = list[index];
    const b = list[newIndex];
    try {
      await api.patch(`/api/servers/${serverId}/channels/reorder`, {
        channels: [
          { id: a.id, position: b.position },
          { id: b.id, position: a.position },
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    } catch { /* silently fail */ }
  };

  const renderChannel = (ch: Channel, index: number, list: Channel[]) => (
    <Group
      key={ch.id}
      gap={8}
      px={12}
      py={6}
      style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
    >
      <Group gap={2}>
        <ActionIcon variant="subtle" color="gray" size={20} disabled={index === 0} onClick={() => handleMoveChannel(list, index, -1)}>
          <IconArrowUp size={12} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size={20} disabled={index === list.length - 1} onClick={() => handleMoveChannel(list, index, 1)}>
          <IconArrowDown size={12} />
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed" style={{ width: 50 }}>{ch.type}</Text>
      <Text size="sm" style={{ flex: 1 }}>#{ch.name}</Text>
      {ch.topic && <Text size="xs" c="dimmed" truncate style={{ maxWidth: 150 }}>{ch.topic}</Text>}
      <Tooltip label="Delete Channel" withArrow>
        <ActionIcon variant="subtle" color="red" size={24} onClick={() => handleDelete(ch.id)}>
          <IconTrash size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Channels</Text>

      {/* Create channel */}
      <Group gap={8} align="flex-end">
        <TextInput
          label="New Channel"
          placeholder="channel-name"
          value={newName}
          onChange={(e) => setNewName(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          label="Type"
          value={newType}
          onChange={(val) => val && setNewType(val as typeof newType)}
          data={[
            { value: 'text', label: 'Text' },
            { value: 'voice', label: 'Voice' },
            { value: 'announcement', label: 'Announcement' },
            { value: 'music', label: 'Music' },
            { value: 'temp_voice_generator', label: 'Temp VC' },
          ]}
          size="xs"
          style={{ width: 140 }}
        />
        <Button leftSection={<IconPlus size={14} />} onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
          Create
        </Button>
      </Group>

      {/* Channel list */}
      <Stack gap={4}>
        {uncategorized.length > 0 && (
          <>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={4}>Uncategorized</Text>
            {uncategorized.map((ch, i, arr) => renderChannel(ch, i, arr))}
          </>
        )}
        {sortedCategories.map((cat) => {
          const children = sorted.filter((c) => c.category_id === cat.id);
          return (
            <div key={cat.id}>
              <Group gap={8} px={4} py={6}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ flex: 1 }}>
                  {cat.name}
                </Text>
                <Tooltip label="Delete Category" withArrow>
                  <ActionIcon variant="subtle" color="red" size={20} onClick={() => handleDelete(cat.id)}>
                    <IconTrash size={12} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Stack gap={2} pl={12}>
                {children.map((ch, i, arr) => renderChannel(ch, i, arr))}
              </Stack>
            </div>
          );
        })}
        {(channels || []).length === 0 && (
          <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No channels.</Text>
        )}
      </Stack>
    </Stack>
  );
}

/* ─── Invites Tab ─── */

function InvitesTab({ serverId }: { serverId: string }) {
  const { data: invites } = useQuery({
    queryKey: ['invites', serverId],
    queryFn: () => api.getArray<Invite>(`/api/servers/${serverId}/invites`),
  });

  const [maxUses, setMaxUses] = useState<number | ''>(0);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post(`/api/servers/${serverId}/invites`, { max_uses: maxUses || undefined });
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    } catch { /* silently fail */ } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (code: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/invites/${code}`);
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    } catch { /* silently fail */ }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Invites</Text>

      <Group gap={8} align="flex-end">
        <NumberInput label="Max Uses" description="0 = unlimited" value={maxUses} onChange={setMaxUses} min={0} max={100} style={{ width: 140 }} />
        <Button leftSection={<IconPlus size={14} />} onClick={handleCreate} loading={creating}>Create Invite</Button>
      </Group>

      {(invites || []).length > 0 ? (
        <Stack gap={4}>
          {invites!.map((invite) => (
            <Group key={invite.code} gap={8} px={12} py={8} style={{ borderRadius: 4, background: 'var(--bg-hover)' }}>
              <Text size="sm" ff="monospace" style={{ flex: 1 }}>{invite.code}</Text>
              <Text size="xs" c="dimmed">{invite.uses}{invite.max_uses ? `/${invite.max_uses}` : ''} uses</Text>
              {invite.expires_at && (
                <Text size="xs" c="dimmed">Expires {new Date(invite.expires_at).toLocaleDateString()}</Text>
              )}
              <CopyButton value={invite.code}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy Code'} withArrow>
                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} size={24} onClick={copy}>
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
              <Tooltip label="Delete Invite" withArrow>
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => handleDelete(invite.code)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No active invites.</Text>
      )}
    </Stack>
  );
}

/* ─── Bans Tab ─── */

function BansTab({ serverId }: { serverId: string }) {
  const { data: bans } = useQuery({
    queryKey: ['bans', serverId],
    queryFn: () => api.getArray<Ban>(`/api/servers/${serverId}/bans`),
  });

  const handleUnban = async (userId: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/bans/${userId}`);
      queryClient.invalidateQueries({ queryKey: ['bans', serverId] });
    } catch { /* silently fail */ }
  };

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Text size="lg" fw={700}>Bans</Text>
        <Text size="sm" c="dimmed">{bans?.length || 0} banned users</Text>
      </Group>

      {(bans || []).length > 0 ? (
        <Stack gap={4}>
          {bans!.map((ban) => (
            <Group key={ban.user_id} gap={8} px={12} py={8} style={{ borderRadius: 4, background: 'var(--bg-hover)' }}>
              <Avatar src={ban.avatar_url} size={28} radius="xl" color="brand">
                {ban.username.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" truncate>{ban.display_name || ban.username}</Text>
                {ban.reason && <Text size="xs" c="dimmed" truncate>Reason: {ban.reason}</Text>}
              </div>
              <Text size="xs" c="dimmed">{new Date(ban.banned_at).toLocaleDateString()}</Text>
              <Tooltip label="Unban" withArrow>
                <Button size="xs" variant="outline" color="green" onClick={() => handleUnban(ban.user_id)}>Unban</Button>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No banned users.</Text>
      )}
    </Stack>
  );
}

/* ─── Stats Tab ─── */

function StatsTab({ serverId }: { serverId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['server-stats', serverId],
    queryFn: () => api.get<{ users: number; channels: number; messages: number }>('/api/server/stats'),
  });

  if (isLoading) return <Text size="sm" c="dimmed">Loading statistics...</Text>;
  if (!stats) return <Text size="sm" c="dimmed">Unable to load statistics</Text>;

  const items = [
    { label: 'Total Users', value: stats.users },
    { label: 'Total Channels', value: stats.channels },
    { label: 'Total Messages', value: stats.messages },
  ];

  return (
    <Stack gap={16} p={8}>
      <Text size="lg" fw={600}>Server Statistics</Text>
      <Group gap={16}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              padding: '20px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <Text size="xl" fw={700}>{item.value.toLocaleString()}</Text>
            <Text size="xs" c="dimmed" mt={4}>{item.label}</Text>
          </div>
        ))}
      </Group>
    </Stack>
  );
}

/* ─── Stickers Tab ─── */

function StickersTab({ serverId }: { serverId: string }) {
  const { data: stickers, isLoading } = useStickers(serverId);
  const uploadSticker = useUploadSticker(serverId);
  const deleteSticker = useDeleteSticker(serverId);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!selectedFile || !newName.trim()) return;
    uploadSticker.mutate(
      { file: selectedFile, name: newName.trim(), description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          setNewName('');
          setNewDesc('');
          setSelectedFile(null);
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>Stickers</Text>

      {/* Upload */}
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" fw={500} mb={8}>Upload Sticker</Text>
        <Group gap={8} align="flex-end">
          <TextInput label="Name" placeholder="Sticker name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
          <TextInput label="Description" placeholder="Optional" value={newDesc} onChange={(e) => setNewDesc(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
        </Group>
        <Group gap={8} mt={8}>
          <Button variant="light" size="xs" leftSection={<IconUpload size={14} />} onClick={() => fileRef.current?.click()}>
            {selectedFile ? selectedFile.name : 'Choose file'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button size="xs" onClick={handleUpload} loading={uploadSticker.isPending} disabled={!selectedFile || !newName.trim()}>
            Upload
          </Button>
        </Group>
      </div>

      {/* List */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Loading stickers...</Text>
      ) : !stickers || stickers.length === 0 ? (
        <Text size="sm" c="dimmed">No stickers yet</Text>
      ) : (
        <Stack gap={4}>
          {stickers.map((s) => (
            <Group key={s.id} justify="space-between" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
              <Group gap={12}>
                <img src={s.url} alt={s.name} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 4 }} />
                <div>
                  <Text size="sm" fw={500}>{s.name}</Text>
                  {s.description && <Text size="xs" c="dimmed">{s.description}</Text>}
                </div>
              </Group>
              <ActionIcon variant="subtle" color="red" size={24} onClick={() => deleteSticker.mutate(s.id)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/* ─── Webhooks Tab ─── */

function WebhooksTab({ serverId }: { serverId: string }) {
  const { data: webhooks, isLoading } = useWebhooks(serverId);
  const { data: channels } = useChannels(serverId);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const [newName, setNewName] = useState('');
  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editChannelId, setEditChannelId] = useState<string | null>(null);

  const textChannels = (channels || []).filter((c: any) => c.type === 'text');
  const channelOptions = textChannels.map((c: any) => ({ value: c.id, label: `#${c.name}` }));

  const handleCreate = () => {
    if (!newName.trim() || !newChannelId) return;
    createWebhook.mutate(
      { name: newName.trim(), channel_id: newChannelId, server_id: serverId },
      { onSuccess: () => { setNewName(''); setNewChannelId(null); } },
    );
  };

  const handleUpdate = (id: string) => {
    const updates: any = { id, serverId };
    if (editName.trim()) updates.name = editName.trim();
    if (editChannelId) updates.channel_id = editChannelId;
    updateWebhook.mutate(updates, { onSuccess: () => setEditingId(null) });
  };

  const getServerUrl = () => {
    try { return (window as any).electronAPI?.server?.getServerUrl?.() || window.location.origin; } catch { return window.location.origin; }
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>Webhooks</Text>

      {/* Create */}
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" fw={500} mb={8}>Create Webhook</Text>
        <Group gap={8} align="flex-end">
          <TextInput label="Name" placeholder="Webhook name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
          <Select label="Channel" data={channelOptions} value={newChannelId} onChange={setNewChannelId} placeholder="Select channel" style={{ flex: 1 }} size="sm" />
          <Button size="xs" onClick={handleCreate} loading={createWebhook.isPending} disabled={!newName.trim() || !newChannelId}>
            Create
          </Button>
        </Group>
      </div>

      {/* List */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Loading webhooks...</Text>
      ) : !webhooks || webhooks.length === 0 ? (
        <Text size="sm" c="dimmed">No webhooks configured</Text>
      ) : (
        <Stack gap={4}>
          {webhooks.map((wh: any) => (
            <div key={wh.id} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
              {editingId === wh.id ? (
                <Stack gap={8}>
                  <Group gap={8}>
                    <TextInput value={editName} onChange={(e) => setEditName(e.currentTarget.value)} placeholder="Name" size="sm" style={{ flex: 1 }} />
                    <Select data={channelOptions} value={editChannelId} onChange={setEditChannelId} placeholder="Channel" size="sm" style={{ flex: 1 }} />
                  </Group>
                  <Group gap={4}>
                    <Button size="xs" onClick={() => handleUpdate(wh.id)} loading={updateWebhook.isPending}>Save</Button>
                    <Button size="xs" variant="subtle" color="gray" onClick={() => setEditingId(null)}>Cancel</Button>
                  </Group>
                </Stack>
              ) : (
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>{wh.name}</Text>
                    <Text size="xs" c="dimmed">#{textChannels.find((c: any) => c.id === wh.channel_id)?.name || 'unknown'}</Text>
                  </div>
                  <Group gap={4}>
                    <CopyButton value={`${getServerUrl()}/api/webhooks/${wh.id}/${wh.token}`}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied!' : 'Copy URL'} position="top" withArrow>
                          <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} size={24} onClick={copy}>
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                    <ActionIcon variant="subtle" color="gray" size={24} onClick={() => { setEditingId(wh.id); setEditName(wh.name); setEditChannelId(wh.channel_id); }}>
                      <IconTrash size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size={24} onClick={() => deleteWebhook.mutate({ id: wh.id, serverId })}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/* ─── Soundboard Tab (server sounds) ─── */

function SoundboardTab({ serverId }: { serverId: string }) {
  const { data: sounds, isLoading } = useQuery({
    queryKey: ['soundboard', serverId],
    queryFn: async () => {
      const res = await api.get<{ sounds: SoundboardSound[] }>(`/api/servers/${serverId}/soundboard`);
      return res.sounds || [];
    },
  });
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!selectedFile || !newName.trim()) return;
    setUploading(true);
    try {
      await api.upload(`/api/servers/${serverId}/soundboard`, selectedFile, { name: newName.trim() });
      queryClient.invalidateQueries({ queryKey: ['soundboard', serverId] });
      setNewName('');
      setSelectedFile(null);
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleDelete = async (soundId: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/soundboard/${soundId}`);
      queryClient.invalidateQueries({ queryKey: ['soundboard', serverId] });
    } catch { /* ignore */ }
  };

  const handlePlay = async (soundId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/soundboard/${soundId}/play`);
    } catch { /* ignore */ }
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>Soundboard</Text>
      <Text size="xs" c="dimmed">Upload and manage server audio clips for voice channels.</Text>

      {/* Upload */}
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" fw={500} mb={8}>Upload Sound</Text>
        <Group gap={8} align="flex-end">
          <TextInput label="Name" placeholder="Sound name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
          <Button variant="light" size="xs" leftSection={<IconUpload size={14} />} onClick={() => fileRef.current?.click()}>
            {selectedFile ? selectedFile.name : 'Choose file'}
          </Button>
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <Button size="xs" onClick={handleUpload} loading={uploading} disabled={!selectedFile || !newName.trim()}>Upload</Button>
        </Group>
      </div>

      {/* List */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Loading sounds...</Text>
      ) : !sounds || sounds.length === 0 ? (
        <Text size="sm" c="dimmed">No server sounds yet</Text>
      ) : (
        <Stack gap={4}>
          {sounds.map((s) => (
            <Group key={s.id} justify="space-between" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
              <Text size="sm" fw={500}>{s.name}</Text>
              <Group gap={4}>
                <Button variant="subtle" size="xs" onClick={() => handlePlay(s.id)}>Play</Button>
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => handleDelete(s.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
