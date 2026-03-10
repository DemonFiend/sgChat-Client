import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon, Avatar, Badge, Button, Checkbox, ColorInput, CopyButton, Divider,
  Group, Modal, NavLink, NumberInput, ScrollArea, Select, Stack, Switch, Text,
  TextInput, Textarea, Tooltip,
} from '@mantine/core';
import {
  IconSettings, IconUsers, IconShield, IconHash, IconLink, IconPlus,
  IconTrash, IconCopy, IconCheck, IconBan, IconUserMinus, IconClock,
  IconHistory, IconMessageCircle, IconPencil, IconX,
  IconArrowUp, IconArrowDown, IconDatabase, IconCalendarTime, IconVolume,
  IconMoodSmile, IconUpload, IconWebhook, IconHeartHandshake, IconSticker, IconChartBar,
} from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { ServerPopupConfigForm } from './ServerPopupConfigForm';
import { TransferOwnershipModal } from './TransferOwnershipModal';
import { VoiceSoundsPanel } from './VoiceSoundsPanel';
import { useAuthStore } from '../../stores/authStore';
import {
  useEmojiPacks, useDefaultEmojiPacks, useCreateEmojiPack,
  useUpdateEmojiPack, useDeleteEmojiPack, useAddEmoji,
  useDeleteEmoji, useInstallDefaultPack, useToggleMasterEmoji,
} from '../../hooks/useEmojis';
import { useEmojiStore, type EmojiPack } from '../../stores/emojiStore';
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook } from '../../hooks/useWebhooks';
import { useStickers, useUploadSticker, useDeleteSticker } from '../../hooks/useStickers';
import {
  useRoleReactions, useCreateRoleReactionGroup, useDeleteRoleReactionGroup,
  useToggleRoleReactionGroup, useAddRoleReactionMapping, useDeleteRoleReactionMapping,
  useFormatRoleReactionChannel,
} from '../../hooks/useRoleReactions';
import { useChannels } from '../../hooks/useChannels';

interface ServerSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
}

interface Role {
  id: string;
  name: string;
  color?: string | null;
  position: number;
  hoist?: boolean;
  is_hoisted?: boolean;
  is_mentionable?: boolean;
  server_permissions?: string;
  text_permissions?: string;
  voice_permissions?: string;
}

interface Member {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  roles?: { id: string; name: string; color?: string | null; position: number }[];
  joined_at?: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  position: number;
  category_id?: string;
  topic?: string;
}

interface Invite {
  code: string;
  uses: number;
  max_uses?: number;
  expires_at?: string;
  created_by?: { id: string; username: string };
  created_at: string;
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
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid var(--border)', padding: '12px 16px' },
      }}
    >
      <div style={{ display: 'flex', minHeight: 480 }}>
        <Stack gap={2} style={{ width: 170, flexShrink: 0, padding: 8, borderRight: '1px solid var(--border)' }}>
          <NavLink label="General" leftSection={<IconSettings size={16} />} active={tab === 'general'} onClick={() => setTab('general')} variant="subtle" />
          <NavLink label="Roles" leftSection={<IconShield size={16} />} active={tab === 'roles'} onClick={() => setTab('roles')} variant="subtle" />
          <NavLink label="Members" leftSection={<IconUsers size={16} />} active={tab === 'members'} onClick={() => setTab('members')} variant="subtle" />
          <NavLink label="Channels" leftSection={<IconHash size={16} />} active={tab === 'channels'} onClick={() => setTab('channels')} variant="subtle" />
          <NavLink label="Invites" leftSection={<IconLink size={16} />} active={tab === 'invites'} onClick={() => setTab('invites')} variant="subtle" />
          <NavLink label="Bans" leftSection={<IconBan size={16} />} active={tab === 'bans'} onClick={() => setTab('bans')} variant="subtle" />
          <NavLink label="Statistics" leftSection={<IconChartBar size={16} />} active={tab === 'stats'} onClick={() => setTab('stats')} variant="subtle" />
          <NavLink label="Audit Log" leftSection={<IconHistory size={16} />} active={tab === 'audit'} onClick={() => setTab('audit')} variant="subtle" />
          <NavLink label="Welcome Popup" leftSection={<IconMessageCircle size={16} />} active={tab === 'popup'} onClick={() => setTab('popup')} variant="subtle" />
          <NavLink label="Storage" leftSection={<IconDatabase size={16} />} active={tab === 'storage'} onClick={() => setTab('storage')} variant="subtle" />
          <NavLink label="Retention" leftSection={<IconCalendarTime size={16} />} active={tab === 'retention'} onClick={() => setTab('retention')} variant="subtle" />
          <NavLink label="Emoji Packs" leftSection={<IconMoodSmile size={16} />} active={tab === 'emojis'} onClick={() => setTab('emojis')} variant="subtle" />
          <NavLink label="Stickers" leftSection={<IconSticker size={16} />} active={tab === 'stickers'} onClick={() => setTab('stickers')} variant="subtle" />
          <NavLink label="Webhooks" leftSection={<IconWebhook size={16} />} active={tab === 'webhooks'} onClick={() => setTab('webhooks')} variant="subtle" />
          <NavLink label="Role Reactions" leftSection={<IconHeartHandshake size={16} />} active={tab === 'role-reactions'} onClick={() => setTab('role-reactions')} variant="subtle" />
          <NavLink label="Soundboard" leftSection={<IconVolume size={16} />} active={tab === 'soundboard'} onClick={() => setTab('soundboard')} variant="subtle" />
          <NavLink label="Voice Sounds" leftSection={<IconVolume size={16} />} active={tab === 'sounds'} onClick={() => setTab('sounds')} variant="subtle" />
        </Stack>

        <ScrollArea style={{ flex: 1, padding: 16 }}>
          {tab === 'general' && <GeneralTab serverId={serverId} />}
          {tab === 'roles' && <RolesTab serverId={serverId} />}
          {tab === 'members' && <MembersTab serverId={serverId} />}
          {tab === 'channels' && <ChannelsTab serverId={serverId} />}
          {tab === 'invites' && <InvitesTab serverId={serverId} />}
          {tab === 'bans' && <BansTab serverId={serverId} />}
          {tab === 'stats' && <StatsTab serverId={serverId} />}
          {tab === 'audit' && <AuditLogTab serverId={serverId} />}
          {tab === 'popup' && <ServerPopupConfigForm serverId={serverId} />}
          {tab === 'emojis' && <EmojiPacksTab serverId={serverId} />}
          {tab === 'storage' && <StorageTab serverId={serverId} />}
          {tab === 'retention' && <RetentionTab serverId={serverId} />}
          {tab === 'stickers' && <StickersTab serverId={serverId} />}
          {tab === 'webhooks' && <WebhooksTab serverId={serverId} />}
          {tab === 'role-reactions' && <RoleReactionsTab serverId={serverId} />}
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
    queryFn: () => api.get<Channel[]>(`/api/servers/${serverId}/channels`),
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

  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setDescription(server.description || '');
      setMotd(server.motd || '');
      setAnnounceJoins(server.announce_joins ?? server.settings?.announce_joins ?? false);
      setAnnounceLeaves(server.announce_leaves ?? server.settings?.announce_leaves ?? false);
      setWelcomeChannelId(server.welcome_channel_id ?? server.settings?.welcome_channel_id ?? null);
      setAfkTimeout(server.afk_timeout ?? server.settings?.afk_timeout ?? 300);
      setTempChannelTimeout(server.settings?.temp_channel_timeout ?? server.temp_channel_timeout ?? 900);
    }
  }, [server]);

  const textChannels = (channels || []).filter((c) => c.type === 'text' || c.type === 'announcement');

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

/* ─── Roles Tab ─── */

// Full permission definitions matching server shared/permissions/index.ts
const ROLE_PERMISSIONS = {
  server: [
    { key: 'ADMINISTRATOR', label: 'Administrator', description: 'Full access — bypasses all checks', bit: 0 },
    { key: 'MANAGE_SERVER', label: 'Manage Server', description: 'Edit server settings', bit: 1 },
    { key: 'MANAGE_CHANNELS', label: 'Manage Channels', description: 'Create, edit, delete channels', bit: 2 },
    { key: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Create, edit, delete roles', bit: 3 },
    { key: 'MANAGE_CATEGORIES', label: 'Manage Categories', description: 'Create, edit, delete categories', bit: 4 },
    { key: 'KICK_MEMBERS', label: 'Kick Members', description: 'Remove members from the server', bit: 5 },
    { key: 'BAN_MEMBERS', label: 'Ban Members', description: 'Permanently ban members', bit: 6 },
    { key: 'TIMEOUT_MEMBERS', label: 'Timeout Members', description: 'Temporarily restrict members', bit: 7 },
    { key: 'MANAGE_NICKNAMES', label: 'Manage Nicknames', description: "Change other members' nicknames", bit: 8 },
    { key: 'CREATE_INVITES', label: 'Create Invites', description: 'Create invite links', bit: 9 },
    { key: 'MANAGE_INVITES', label: 'Manage Invites', description: 'View and delete invite links', bit: 10 },
    { key: 'CHANGE_NICKNAME', label: 'Change Nickname', description: 'Change own nickname', bit: 11 },
    { key: 'VIEW_AUDIT_LOG', label: 'View Audit Log', description: 'View the server audit log', bit: 12 },
    { key: 'VIEW_SERVER_INSIGHTS', label: 'View Insights', description: 'View server analytics', bit: 13 },
    { key: 'MANAGE_EMOJIS', label: 'Manage Emojis', description: 'Create, edit, delete custom emojis', bit: 14 },
    { key: 'MANAGE_STICKERS', label: 'Manage Stickers', description: 'Create, edit, delete stickers', bit: 15 },
    { key: 'MANAGE_EXPRESSIONS', label: 'Manage Expressions', description: 'Manage all expressions', bit: 16 },
    { key: 'MANAGE_WEBHOOKS', label: 'Manage Webhooks', description: 'Create, edit, delete webhooks', bit: 17 },
    { key: 'CREATE_EVENTS', label: 'Create Events', description: 'Create server events', bit: 18 },
    { key: 'MANAGE_EVENTS', label: 'Manage Events', description: 'Edit and delete server events', bit: 19 },
    { key: 'MANAGE_THREADS', label: 'Manage Threads', description: 'Manage all threads', bit: 20 },
    { key: 'CREATE_PUBLIC_THREADS', label: 'Create Public Threads', description: 'Create public threads', bit: 21 },
    { key: 'CREATE_PRIVATE_THREADS', label: 'Create Private Threads', description: 'Create private threads', bit: 22 },
    { key: 'VIEW_SERVER_MEMBERS', label: 'View Members', description: 'View the member list', bit: 23 },
    { key: 'MODERATE_MEMBERS', label: 'Moderate Members', description: 'Auto-moderation and member screening', bit: 24 },
  ],
  text: [
    { key: 'VIEW_CHANNEL', label: 'View Channel', description: 'See the channel in the list', bit: 0 },
    { key: 'SEND_MESSAGES', label: 'Send Messages', description: 'Send messages in channels', bit: 1 },
    { key: 'SEND_TTS_MESSAGES', label: 'Send TTS', description: 'Send text-to-speech messages', bit: 2 },
    { key: 'READ_MESSAGE_HISTORY', label: 'Read History', description: 'Read past messages', bit: 3 },
    { key: 'EMBED_LINKS', label: 'Embed Links', description: 'Post links with previews', bit: 4 },
    { key: 'ATTACH_FILES', label: 'Attach Files', description: 'Upload files and images', bit: 5 },
    { key: 'USE_EXTERNAL_EMOJIS', label: 'External Emojis', description: 'Use emojis from other servers', bit: 6 },
    { key: 'USE_EXTERNAL_STICKERS', label: 'External Stickers', description: 'Use stickers from other servers', bit: 7 },
    { key: 'ADD_REACTIONS', label: 'Add Reactions', description: 'React to messages', bit: 8 },
    { key: 'MENTION_EVERYONE', label: 'Mention @everyone', description: 'Use @everyone and @here', bit: 9 },
    { key: 'MENTION_ROLES', label: 'Mention Roles', description: 'Mention any role', bit: 10 },
    { key: 'MANAGE_MESSAGES', label: 'Manage Messages', description: "Delete/pin others' messages", bit: 11 },
    { key: 'DELETE_OWN_MESSAGES', label: 'Delete Own Messages', description: 'Delete own messages', bit: 12 },
    { key: 'EDIT_OWN_MESSAGES', label: 'Edit Own Messages', description: 'Edit own messages', bit: 13 },
    { key: 'CREATE_PUBLIC_THREADS', label: 'Create Public Threads', description: 'Create public threads', bit: 14 },
    { key: 'CREATE_PRIVATE_THREADS', label: 'Create Private Threads', description: 'Create private threads', bit: 15 },
    { key: 'SEND_MESSAGES_IN_THREADS', label: 'Send in Threads', description: 'Send messages in threads', bit: 16 },
    { key: 'MANAGE_THREADS', label: 'Manage Threads', description: 'Archive and delete threads', bit: 17 },
    { key: 'USE_APPLICATION_COMMANDS', label: 'App Commands', description: 'Use slash commands', bit: 18 },
    { key: 'MANAGE_WEBHOOKS', label: 'Manage Webhooks', description: 'Manage channel webhooks', bit: 19 },
    { key: 'BYPASS_SLOWMODE', label: 'Bypass Slowmode', description: 'Ignore slowmode restrictions', bit: 20 },
  ],
  voice: [
    { key: 'CONNECT', label: 'Connect', description: 'Join voice channels', bit: 0 },
    { key: 'VIEW_CHANNEL', label: 'View Channel', description: 'See the voice channel', bit: 1 },
    { key: 'SPEAK', label: 'Speak', description: 'Transmit audio', bit: 2 },
    { key: 'VIDEO', label: 'Video', description: 'Share camera', bit: 3 },
    { key: 'STREAM', label: 'Stream', description: 'Screen share', bit: 4 },
    { key: 'USE_VOICE_ACTIVITY', label: 'Voice Activity', description: 'Use voice activity detection', bit: 5 },
    { key: 'PRIORITY_SPEAKER', label: 'Priority Speaker', description: "Lower others' volume when speaking", bit: 6 },
    { key: 'USE_SOUNDBOARD', label: 'Use Soundboard', description: 'Play soundboard sounds', bit: 7 },
    { key: 'USE_EXTERNAL_SOUNDS', label: 'External Sounds', description: 'Use sounds from other servers', bit: 8 },
    { key: 'MUTE_MEMBERS', label: 'Mute Members', description: 'Server mute others', bit: 9 },
    { key: 'DEAFEN_MEMBERS', label: 'Deafen Members', description: 'Server deafen others', bit: 10 },
    { key: 'MOVE_MEMBERS', label: 'Move Members', description: 'Move members between channels', bit: 11 },
    { key: 'DISCONNECT_MEMBERS', label: 'Disconnect Members', description: 'Disconnect from voice', bit: 12 },
    { key: 'REQUEST_TO_SPEAK', label: 'Request to Speak', description: 'Request in stage channels', bit: 13 },
    { key: 'MANAGE_STAGE', label: 'Manage Stage', description: 'Manage stage speakers', bit: 14 },
    { key: 'MANAGE_VOICE_CHANNEL', label: 'Manage Voice Channel', description: 'Edit voice channel settings', bit: 15 },
    { key: 'SET_VOICE_STATUS', label: 'Set Voice Status', description: 'Set a custom voice channel status', bit: 16 },
  ],
} as const;

function hasBit(perms: string | number | undefined, bit: number): boolean {
  const n = Number(perms || 0);
  return (n & (1 << bit)) !== 0;
}

function setBit(perms: string | number | undefined, bit: number, on: boolean): number {
  let n = Number(perms || 0);
  if (on) {
    n |= (1 << bit);
  } else {
    n &= ~(1 << bit);
  }
  return n;
}

function RolesTab({ serverId }: { serverId: string }) {
  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.get<Role[]>(`/api/servers/${serverId}/roles`),
  });

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#4ade80');
  const [creating, setCreating] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editServerPerms, setEditServerPerms] = useState(0);
  const [editTextPerms, setEditTextPerms] = useState(0);
  const [editVoicePerms, setEditVoicePerms] = useState(0);
  const [editHoisted, setEditHoisted] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedRoles = [...(roles || [])].sort((a, b) => b.position - a.position);
  const selectedRole = sortedRoles.find((r) => r.id === selectedRoleId);

  useEffect(() => {
    const role = (roles || []).find((r) => r.id === selectedRoleId);
    if (role) {
      setEditName(role.name);
      setEditColor(role.color || null);
      setEditServerPerms(Number(role.server_permissions || 0));
      setEditTextPerms(Number(role.text_permissions || 0));
      setEditVoicePerms(Number(role.voice_permissions || 0));
      setEditHoisted(role.hoist ?? role.is_hoisted ?? false);
      setEditMentionable(role.is_mentionable ?? false);
    }
  }, [selectedRoleId, roles]);

  const handleCreate = async () => {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      await api.post(`/api/servers/${serverId}/roles`, {
        name: newRoleName.trim(),
        color: newRoleColor,
      });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      setNewRoleName('');
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleMoveRole = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedRoles.length) return;
    const a = sortedRoles[index];
    const b = sortedRoles[newIndex];
    if (a.name === '@everyone' || b.name === '@everyone') return;
    try {
      await api.patch(`/api/servers/${serverId}/roles/reorder`, {
        roles: [
          { id: a.id, position: b.position },
          { id: b.id, position: a.position },
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch { /* silently fail */ }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/roles/${roleId}`);
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    } catch {
      // silently fail
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        server_permissions: editServerPerms,
        text_permissions: editTextPerms,
        voice_permissions: editVoicePerms,
        is_hoisted: editHoisted,
        is_mentionable: editMentionable,
      };
      if (selectedRole?.name !== '@everyone') {
        body.name = editName.trim();
      }
      if (editColor) body.color = editColor;
      else body.color = null;

      await api.patch(`/api/servers/${serverId}/roles/${selectedRoleId}`, body);
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Roles</Text>

      {/* Create role */}
      <Group gap={8} align="flex-end">
        <TextInput
          label="New Role"
          placeholder="Role name"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <ColorInput
          label="Color"
          value={newRoleColor}
          onChange={setNewRoleColor}
          style={{ width: 120 }}
        />
        <Button leftSection={<IconPlus size={14} />} onClick={handleCreate} loading={creating} disabled={!newRoleName.trim()}>
          Create
        </Button>
      </Group>

      {/* Role list */}
      {sortedRoles.length > 0 ? (
        <Stack gap={4}>
          {sortedRoles.map((role, index) => (
            <Group
              key={role.id}
              gap={8}
              px={12}
              py={8}
              style={{
                borderRadius: 4,
                background: selectedRoleId === role.id ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                border: selectedRoleId === role.id ? '1px solid var(--mantine-color-violet-5)' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
            >
              {role.name !== '@everyone' && (
                <Group gap={2} onClick={(e) => e.stopPropagation()}>
                  <ActionIcon variant="subtle" color="gray" size={20} disabled={index === 0} onClick={() => handleMoveRole(index, -1)}>
                    <IconArrowUp size={12} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" size={20} disabled={index === sortedRoles.length - 1 || sortedRoles[index + 1]?.name === '@everyone'} onClick={() => handleMoveRole(index, 1)}>
                    <IconArrowDown size={12} />
                  </ActionIcon>
                </Group>
              )}
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: role.color || 'var(--text-muted)', flexShrink: 0,
              }} />
              <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
              {(role.hoist || role.is_hoisted) && (
                <Badge size="xs" variant="outline" color="gray">Hoisted</Badge>
              )}
              <Text size="xs" c="dimmed">Pos: {role.position}</Text>
              {role.name !== '@everyone' && (
                <Tooltip label="Delete Role" withArrow>
                  <ActionIcon variant="subtle" color="red" size={24} onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No roles configured.</Text>
      )}

      {/* Role editor */}
      {selectedRole && (
        <>
          <Divider label={`Editing: ${selectedRole.name}`} labelPosition="left" />

          {selectedRole.name !== '@everyone' && (
            <Group gap={8} align="flex-end">
              <TextInput
                label="Role Name"
                value={editName}
                onChange={(e) => setEditName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <ColorInput
                label="Color"
                value={editColor || ''}
                onChange={setEditColor}
                style={{ width: 140 }}
              />
            </Group>
          )}

          <Divider label="Display" labelPosition="left" />
          <Switch
            label="Display Separately (Hoisted)"
            description="Show members with this role grouped separately in the member list"
            checked={editHoisted}
            onChange={(e) => setEditHoisted(e.currentTarget.checked)}
            size="xs"
          />
          <Switch
            label="Allow @mention"
            description="Allow anyone to mention this role"
            checked={editMentionable}
            onChange={(e) => setEditMentionable(e.currentTarget.checked)}
            size="xs"
          />

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Server Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.server.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editServerPerms, perm.bit)}
                onChange={(e) => setEditServerPerms(setBit(editServerPerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Text Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.text.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editTextPerms, perm.bit)}
                onChange={(e) => setEditTextPerms(setBit(editTextPerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Voice Permissions</Text>
          <Stack gap={2}>
            {ROLE_PERMISSIONS.voice.map((perm) => (
              <Switch
                key={perm.key}
                label={perm.label}
                description={perm.description}
                checked={hasBit(editVoicePerms, perm.bit)}
                onChange={(e) => setEditVoicePerms(setBit(editVoicePerms, perm.bit, e.currentTarget.checked))}
                size="xs"
              />
            ))}
          </Stack>

          <Group>
            <Button onClick={handleSaveRole} loading={saving}>Save Role</Button>
            <Button variant="subtle" color="gray" onClick={() => setSelectedRoleId(null)}>Cancel</Button>
          </Group>
        </>
      )}
    </Stack>
  );
}

/* ─── Members Tab ─── */

function MembersTab({ serverId }: { serverId: string }) {
  const { data: members } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => api.get<Member[]>(`/api/servers/${serverId}/members`),
  });

  const { data: allRoles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.get<Role[]>(`/api/servers/${serverId}/roles`),
  });

  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => api.get<any>(`/api/servers/${serverId}`),
  });

  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwner = server?.owner_id === currentUserId;
  const [transferOpen, setTransferOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filtered = (members || []).filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const assignableRoles = [...(allRoles || [])].filter((r) => r.name !== '@everyone').sort((a, b) => b.position - a.position);

  const handleKick = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/kick`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  const handleBan = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/ban`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  const handleTimeout = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/timeout`, { duration: 600 });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch { /* silently fail */ }
  };

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Text size="lg" fw={700}>Members</Text>
        <Text size="sm" c="dimmed">{members?.length || 0} members</Text>
      </Group>

      <TextInput
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Member list */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {filtered.map((member) => {
            const memberId = member.user_id || member.id;
            const isSelected = selectedMemberId === memberId;
            return (
              <Group
                key={memberId}
                gap={8}
                px={12}
                py={8}
                style={{
                  borderRadius: 4,
                  background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                  border: isSelected ? '1px solid var(--mantine-color-violet-5)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedMemberId(isSelected ? null : memberId)}
              >
                <Avatar src={member.avatar_url} size={28} radius="xl" color="brand">
                  {member.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" truncate>{member.display_name || member.username}</Text>
                </div>
                <Group gap={4}>
                  <Tooltip label="Timeout (10 min)" withArrow>
                    <ActionIcon variant="subtle" color="yellow" size={24} onClick={(e) => { e.stopPropagation(); handleTimeout(memberId); }}>
                      <IconClock size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Kick" withArrow>
                    <ActionIcon variant="subtle" color="orange" size={24} onClick={(e) => { e.stopPropagation(); handleKick(memberId); }}>
                      <IconUserMinus size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Ban" withArrow>
                    <ActionIcon variant="subtle" color="red" size={24} onClick={(e) => { e.stopPropagation(); handleBan(memberId); }}>
                      <IconBan size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            );
          })}
          {filtered.length === 0 && (
            <Text c="dimmed" size="sm" ta="center" py={16}>
              {search ? 'No members match your search.' : 'No members found.'}
            </Text>
          )}
        </Stack>

        {/* Member detail panel */}
        {selectedMemberId && (
          <MemberRolePanel serverId={serverId} memberId={selectedMemberId} allRoles={assignableRoles} />
        )}
      </div>

      {/* Transfer Ownership — owner only */}
      {isOwner && (
        <>
          <Divider label="Danger Zone" labelPosition="left" color="red" />
          <Button
            color="red"
            variant="outline"
            onClick={() => setTransferOpen(true)}
          >
            Transfer Ownership
          </Button>
          <TransferOwnershipModal
            opened={transferOpen}
            onClose={() => setTransferOpen(false)}
            serverId={serverId}
            currentOwnerId={currentUserId!}
            members={(members || []).map((m) => ({
              id: m.user_id || m.id,
              username: m.username,
              display_name: m.display_name,
              avatar_url: m.avatar_url,
            }))}
          />
        </>
      )}
    </Stack>
  );
}

/* ─── Member Role Panel ─── */

function MemberRolePanel({
  serverId,
  memberId,
  allRoles,
}: {
  serverId: string;
  memberId: string;
  allRoles: Role[];
}) {
  const { data: memberRoles, isLoading } = useQuery({
    queryKey: ['member-roles', serverId, memberId],
    queryFn: () => api.get<{ id: string; name: string; color?: string | null; position: number }[]>(
      `/api/servers/${serverId}/members/${memberId}/roles`,
    ),
  });

  const [busy, setBusy] = useState<string | null>(null);

  const memberRoleIds = new Set((memberRoles || []).map((r) => r.id));

  const handleToggleRole = async (roleId: string) => {
    setBusy(roleId);
    try {
      if (memberRoleIds.has(roleId)) {
        await api.delete(`/api/servers/${serverId}/members/${memberId}/roles/${roleId}`);
      } else {
        await api.post(`/api/servers/${serverId}/members/${memberId}/roles/${roleId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['member-roles', serverId, memberId] });
    } catch {
      // silently fail
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack
      gap={8}
      style={{
        width: 220,
        flexShrink: 0,
        padding: 12,
        borderRadius: 8,
        background: 'var(--bg-secondary, rgba(0,0,0,0.15))',
      }}
    >
      <Text size="sm" fw={600}>Roles</Text>

      {isLoading && <Text size="xs" c="dimmed">Loading roles...</Text>}

      {/* Current roles as badges */}
      {!isLoading && memberRoles && memberRoles.length > 0 && (
        <Group gap={4}>
          {memberRoles.map((r) => (
            <Badge key={r.id} size="sm" variant="dot" color={r.color || 'gray'}>
              {r.name}
            </Badge>
          ))}
        </Group>
      )}

      {!isLoading && (!memberRoles || memberRoles.length === 0) && (
        <Text size="xs" c="dimmed" fs="italic">No roles assigned</Text>
      )}

      <Divider />

      <Text size="xs" c="dimmed">Toggle roles:</Text>
      <Stack gap={2}>
        {allRoles.map((role) => (
          <Checkbox
            key={role.id}
            label={
              <Group gap={6}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: role.color || 'var(--text-muted)', flexShrink: 0,
                }} />
                <Text size="xs">{role.name}</Text>
              </Group>
            }
            checked={memberRoleIds.has(role.id)}
            onChange={() => handleToggleRole(role.id)}
            disabled={busy === role.id}
            size="xs"
          />
        ))}
        {allRoles.length === 0 && (
          <Text size="xs" c="dimmed" fs="italic">No assignable roles</Text>
        )}
      </Stack>
    </Stack>
  );
}

/* ─── Channels Tab ─── */

function ChannelsTab({ serverId }: { serverId: string }) {
  const { data: channels } = useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => api.get<Channel[]>(`/api/servers/${serverId}/channels`),
  });

  const { data: fetchedCategories } = useQuery({
    queryKey: ['categories', serverId],
    queryFn: () => api.get<{ id: string; name: string; position: number }[]>(`/api/servers/${serverId}/categories`),
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
    queryFn: () => api.get<Invite[]>(`/api/servers/${serverId}/invites`),
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

interface Ban {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  reason?: string;
  banned_at: string;
}

function BansTab({ serverId }: { serverId: string }) {
  const { data: bans } = useQuery({
    queryKey: ['bans', serverId],
    queryFn: () => api.get<Ban[]>(`/api/servers/${serverId}/bans`),
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

/* ─── Audit Log Tab ─── */

interface AuditEntry {
  id: string;
  action: string;
  user_id: string | null;
  actor_username: string | null;
  target_type?: string;
  target_id?: string;
  changes?: Record<string, any>;
  reason?: string;
  created_at: string;
}

function AuditLogTab({ serverId }: { serverId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['audit-log', serverId],
    queryFn: () => api.get<AuditEntry[]>(`/api/servers/${serverId}/audit-log`),
  });

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Audit Log</Text>
      <Text size="sm" c="dimmed">Recent administrative actions on this server.</Text>

      {isLoading && <Text size="sm" c="dimmed">Loading...</Text>}

      {!isLoading && (entries || []).length > 0 ? (
        <Stack gap={4}>
          {entries!.map((entry) => (
            <Group key={entry.id} gap={8} px={12} py={8} style={{ borderRadius: 4, background: 'var(--bg-hover)' }} wrap="nowrap">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm">
                  <Text component="span" fw={600}>{entry.actor_username || 'System'}</Text>
                  {' '}
                  <Text component="span" c="dimmed">{entry.action.replace(/_/g, ' ')}</Text>
                </Text>
              </div>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      ) : (
        !isLoading && <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No audit log entries.</Text>
      )}
    </Stack>
  );
}

// ── Storage Dashboard ──────────────────────────────────────────────
function StorageTab({ serverId }: { serverId: string }) {
  const { data: storage, isLoading } = useQuery({
    queryKey: ['server-storage', serverId],
    queryFn: () => api.get<any>(`/api/server/storage/comprehensive`),
  });

  const { data: thresholds } = useQuery({
    queryKey: ['server-storage-thresholds', serverId],
    queryFn: () => api.get<any>(`/api/server/storage/thresholds`),
  });

  const { data: alerts } = useQuery({
    queryKey: ['server-storage-alerts', serverId],
    queryFn: () => api.get<any[]>(`/api/server/storage/alerts/active`),
  });

  if (isLoading) return <Text size="sm" c="dimmed">Loading storage data...</Text>;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  return (
    <Stack gap={16} p={8}>
      <Text size="lg" fw={700}>Storage</Text>

      {storage && (
        <Stack gap={8}>
          <Group justify="space-between">
            <Text size="sm">Total Used</Text>
            <Text size="sm" fw={600}>{formatBytes(storage.total_bytes || storage.total_size || 0)}</Text>
          </Group>
          {storage.breakdown && Object.entries(storage.breakdown).map(([key, value]: [string, any]) => (
            <Group key={key} justify="space-between">
              <Text size="xs" c="dimmed" tt="capitalize">{key.replace(/_/g, ' ')}</Text>
              <Text size="xs">{formatBytes(typeof value === 'number' ? value : value?.bytes || 0)}</Text>
            </Group>
          ))}
        </Stack>
      )}

      {thresholds && (
        <>
          <Divider />
          <Text size="sm" fw={600}>Thresholds</Text>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Warning</Text>
            <Text size="xs">{formatBytes(thresholds.warning_bytes || 0)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Critical</Text>
            <Text size="xs">{formatBytes(thresholds.critical_bytes || 0)}</Text>
          </Group>
        </>
      )}

      {alerts && alerts.length > 0 && (
        <>
          <Divider />
          <Text size="sm" fw={600} c="red">Active Alerts</Text>
          {alerts.map((alert: any, i: number) => (
            <Text key={i} size="xs" c="red">{alert.message || alert.type}</Text>
          ))}
        </>
      )}
    </Stack>
  );
}

// ── Message Retention Policies ─────────────────────────────────────
function RetentionTab({ serverId }: { serverId: string }) {
  const { data: retention, isLoading } = useQuery({
    queryKey: ['server-retention', serverId],
    queryFn: () => api.get<any>(`/api/server/settings/retention`),
  });

  const [maxMessages, setMaxMessages] = useState<number | string>('');
  const [maxAgeDays, setMaxAgeDays] = useState<number | string>('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (retention) {
      setMaxMessages(retention.max_messages ?? '');
      setMaxAgeDays(retention.max_age_days ?? '');
      setEnabled(retention.enabled ?? false);
    }
  }, [retention]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/server/settings/retention`, {
        enabled,
        max_messages: maxMessages || null,
        max_age_days: maxAgeDays || null,
      });
      queryClient.invalidateQueries({ queryKey: ['server-retention'] });
    } catch (err) {
      console.error('Failed to save retention settings:', err);
    }
    setSaving(false);
  };

  const handleCleanup = async () => {
    try {
      await api.post(`/api/server/cleanup/run`);
    } catch (err) {
      console.error('Failed to run cleanup:', err);
    }
  };

  if (isLoading) return <Text size="sm" c="dimmed">Loading retention settings...</Text>;

  return (
    <Stack gap={16} p={8}>
      <Text size="lg" fw={700}>Message Retention</Text>

      <Switch
        label="Enable retention policy"
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
      />

      <NumberInput
        label="Max Messages per Channel"
        placeholder="Unlimited"
        value={maxMessages}
        onChange={setMaxMessages}
        min={0}
        disabled={!enabled}
      />

      <NumberInput
        label="Max Age (days)"
        placeholder="Unlimited"
        value={maxAgeDays}
        onChange={setMaxAgeDays}
        min={0}
        disabled={!enabled}
      />

      <Group>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
        <Button variant="outline" color="yellow" onClick={handleCleanup}>
          Run Cleanup Now
        </Button>
      </Group>
    </Stack>
  );
}

/* ─── Emoji Packs Tab ─── */

function EmojiPacksTab({ serverId }: { serverId: string }) {
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

  const masterEnabled = manifest?.master_enabled ?? true;

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
              <Badge size="sm" variant="light">{pack.emoji_count || pack.emojis?.length || 0} emojis</Badge>
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
          {expandedPack === pack.id && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {pack.emojis?.map((emoji) => (
                  <Tooltip key={emoji.id} label={`:${emoji.shortcode}:`} position="top" withArrow>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={emoji.image_url}
                        alt={emoji.shortcode}
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
                {(!pack.emojis || pack.emojis.length === 0) && (
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
          )}
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

      {/* Default/bundled packs */}
      {defaults && defaults.length > 0 && (
        <>
          <Divider style={{ borderColor: 'var(--border)' }} />
          <Text size="sm" fw={600}>Available Default Packs</Text>
          <Stack gap={8}>
            {defaults.map((dp) => (
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
                  {dp.preview_urls?.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} width={20} height={20} style={{ objectFit: 'contain' }} />
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

  const textChannels = (channels || []).filter((c) => c.type === 'text');
  const channelOptions = textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }));

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
          {webhooks.map((wh) => (
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
                    <Text size="xs" c="dimmed">#{textChannels.find((c) => c.id === wh.channel_id)?.name || 'unknown'}</Text>
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
                      <IconPencil size={14} />
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

/* ─── Role Reactions Tab ─── */

function RoleReactionsTab({ serverId }: { serverId: string }) {
  const { data: groups, isLoading } = useRoleReactions(serverId);
  const { data: channels } = useChannels(serverId);
  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.get<Role[]>(`/api/servers/${serverId}/roles`),
  });
  const createGroup = useCreateRoleReactionGroup(serverId);
  const deleteGroup = useDeleteRoleReactionGroup(serverId);
  const toggleGroup = useToggleRoleReactionGroup(serverId);
  const addMapping = useAddRoleReactionMapping(serverId);
  const deleteMapping = useDeleteRoleReactionMapping(serverId);
  const formatChannel = useFormatRoleReactionChannel(serverId);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChannelId, setNewGroupChannelId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [mappingEmoji, setMappingEmoji] = useState('');
  const [mappingRoleId, setMappingRoleId] = useState<string | null>(null);

  const textChannels = (channels || []).filter((c) => c.type === 'text');
  const channelOptions = textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }));
  const roleOptions = (roles || []).map((r) => ({ value: r.id, label: r.name }));

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupChannelId) return;
    createGroup.mutate(
      { name: newGroupName.trim(), channel_id: newGroupChannelId },
      { onSuccess: () => { setNewGroupName(''); setNewGroupChannelId(null); } },
    );
  };

  const handleAddMapping = (groupId: string) => {
    if (!mappingEmoji.trim() || !mappingRoleId) return;
    addMapping.mutate(
      { groupId, emoji: mappingEmoji.trim(), emoji_type: 'unicode', role_id: mappingRoleId },
      { onSuccess: () => { setMappingEmoji(''); setMappingRoleId(null); } },
    );
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>Role Reactions</Text>
      <Text size="xs" c="dimmed">
        Let members self-assign roles by reacting to messages with specific emojis.
      </Text>

      {/* Create group */}
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <Text size="sm" fw={500} mb={8}>Create Reaction Group</Text>
        <Group gap={8} align="flex-end">
          <TextInput label="Name" placeholder="e.g. Color Roles" value={newGroupName} onChange={(e) => setNewGroupName(e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
          <Select label="Channel" data={channelOptions} value={newGroupChannelId} onChange={setNewGroupChannelId} placeholder="Target channel" style={{ flex: 1 }} size="sm" />
          <Button size="xs" onClick={handleCreateGroup} loading={createGroup.isPending} disabled={!newGroupName.trim() || !newGroupChannelId}>
            Create
          </Button>
        </Group>
      </div>

      {/* Groups list */}
      {isLoading ? (
        <Text size="sm" c="dimmed">Loading...</Text>
      ) : !groups || groups.length === 0 ? (
        <Text size="sm" c="dimmed">No reaction groups configured</Text>
      ) : (
        <Stack gap={8}>
          {groups.map((group) => (
            <div key={group.id} style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Group header */}
              <div
                style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              >
                <Text size="sm" fw={600} style={{ flex: 1 }}>{group.name}</Text>
                <Badge size="xs" variant="light" color={group.is_active ? 'green' : 'gray'}>
                  {group.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Text size="xs" c="dimmed">{group.mappings?.length || 0} mappings</Text>
                <Switch
                  size="xs"
                  checked={group.is_active}
                  onChange={() => toggleGroup.mutate(group.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Tooltip label="Format Channel" position="top" withArrow>
                  <ActionIcon variant="subtle" color="brand" size={24} onClick={(e) => { e.stopPropagation(); formatChannel.mutate(group.id); }}>
                    <IconMessageCircle size={14} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon variant="subtle" color="red" size={24} onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(group.id); }}>
                  <IconTrash size={14} />
                </ActionIcon>
              </div>

              {/* Expanded mappings */}
              {expandedGroup === group.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
                  {group.mappings && group.mappings.length > 0 ? (
                    <Stack gap={4} mb={12}>
                      {group.mappings.map((m) => (
                        <Group key={m.id} justify="space-between" style={{ padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: 4 }}>
                          <Group gap={8}>
                            <Text size="sm">{m.emoji_type === 'custom' ? `custom emoji` : m.emoji}</Text>
                            <Text size="xs" c="dimmed">→</Text>
                            <Badge size="sm" variant="light" color={m.role_color || 'gray'}>{m.role_name || 'Unknown Role'}</Badge>
                          </Group>
                          <ActionIcon variant="subtle" color="red" size={20} onClick={() => deleteMapping.mutate({ groupId: group.id, mappingId: m.id })}>
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed" mb={12}>No mappings yet</Text>
                  )}

                  {/* Add mapping */}
                  <Group gap={8} align="flex-end">
                    <TextInput label="Emoji" placeholder="e.g. 🔴" value={mappingEmoji} onChange={(e) => setMappingEmoji(e.currentTarget.value)} style={{ width: 80 }} size="sm" />
                    <Select label="Role" data={roleOptions} value={mappingRoleId} onChange={setMappingRoleId} placeholder="Select role" style={{ flex: 1 }} size="sm" />
                    <Button size="xs" onClick={() => handleAddMapping(group.id)} disabled={!mappingEmoji.trim() || !mappingRoleId}>
                      Add
                    </Button>
                  </Group>
                </div>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/* ─── Soundboard Tab (server sounds) ─── */

interface SoundboardSound {
  id: string;
  name: string;
  url: string;
  server_id: string;
  created_by: string;
  created_at: string;
}

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
