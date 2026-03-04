import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ActionIcon, Avatar, Badge, Button, ColorInput, CopyButton, Group, Modal,
  NavLink, NumberInput, ScrollArea, Stack, Switch, Table, Text, TextInput,
  Textarea, Tooltip, UnstyledButton,
} from '@mantine/core';
import {
  IconSettings, IconUsers, IconShield, IconHash, IconLink, IconPlus,
  IconTrash, IconCopy, IconCheck, IconBan, IconUserMinus, IconClock,
  IconHistory, IconMessageCircle,
} from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { ServerPopupConfigForm } from './ServerPopupConfigForm';

interface ServerSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
}

interface Role {
  id: string;
  name: string;
  color?: string;
  position: number;
  hoist?: boolean;
  permissions?: number;
}

interface Member {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  roles?: Role[];
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
        {/* Settings nav */}
        <Stack gap={2} style={{ width: 170, flexShrink: 0, padding: 8, borderRight: '1px solid var(--border)' }}>
          <NavLink
            label="General"
            leftSection={<IconSettings size={16} />}
            active={tab === 'general'}
            onClick={() => setTab('general')}
            variant="subtle"
          />
          <NavLink
            label="Roles"
            leftSection={<IconShield size={16} />}
            active={tab === 'roles'}
            onClick={() => setTab('roles')}
            variant="subtle"
          />
          <NavLink
            label="Members"
            leftSection={<IconUsers size={16} />}
            active={tab === 'members'}
            onClick={() => setTab('members')}
            variant="subtle"
          />
          <NavLink
            label="Channels"
            leftSection={<IconHash size={16} />}
            active={tab === 'channels'}
            onClick={() => setTab('channels')}
            variant="subtle"
          />
          <NavLink
            label="Invites"
            leftSection={<IconLink size={16} />}
            active={tab === 'invites'}
            onClick={() => setTab('invites')}
            variant="subtle"
          />
          <NavLink
            label="Bans"
            leftSection={<IconBan size={16} />}
            active={tab === 'bans'}
            onClick={() => setTab('bans')}
            variant="subtle"
          />
          <NavLink
            label="Audit Log"
            leftSection={<IconHistory size={16} />}
            active={tab === 'audit'}
            onClick={() => setTab('audit')}
            variant="subtle"
          />
          <NavLink
            label="Welcome Popup"
            leftSection={<IconMessageCircle size={16} />}
            active={tab === 'popup'}
            onClick={() => setTab('popup')}
            variant="subtle"
          />
        </Stack>

        {/* Content */}
        <ScrollArea style={{ flex: 1, padding: 16 }}>
          {tab === 'general' && <GeneralTab serverId={serverId} />}
          {tab === 'roles' && <RolesTab serverId={serverId} />}
          {tab === 'members' && <MembersTab serverId={serverId} />}
          {tab === 'channels' && <ChannelsTab serverId={serverId} />}
          {tab === 'invites' && <InvitesTab serverId={serverId} />}
          {tab === 'bans' && <BansTab serverId={serverId} />}
          {tab === 'audit' && <AuditLogTab serverId={serverId} />}
          {tab === 'popup' && <ServerPopupConfigForm serverId={serverId} />}
        </ScrollArea>
      </div>
    </Modal>
  );
}

/* ─── General Tab ─── */

function GeneralTab({ serverId }: { serverId: string }) {
  const { data: server } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => api.get(`/api/servers/${serverId}`),
  });

  const [name, setName] = useState('');
  const [motd, setMotd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setMotd(server.motd || '');
    }
  }, [server]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/servers/${serverId}`, { name: name.trim(), motd: motd.trim() });
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    } catch {
      // silently fail
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
        label="Message of the Day"
        description="Shown to members when they open the server"
        value={motd}
        onChange={(e) => setMotd(e.currentTarget.value)}
        minRows={2}
        maxRows={4}
        autosize
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

function RolesTab({ serverId }: { serverId: string }) {
  const { data: roles } = useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => api.get<Role[]>(`/api/servers/${serverId}/roles`),
  });

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#4ade80');
  const [creating, setCreating] = useState(false);

  const sortedRoles = [...(roles || [])].sort((a, b) => b.position - a.position);

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

  const handleDelete = async (roleId: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/roles/${roleId}`);
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    } catch {
      // silently fail
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
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleCreate}
          loading={creating}
          disabled={!newRoleName.trim()}
        >
          Create
        </Button>
      </Group>

      {/* Role list */}
      {sortedRoles.length > 0 ? (
        <Stack gap={4}>
          {sortedRoles.map((role) => (
            <Group
              key={role.id}
              gap={8}
              px={12}
              py={8}
              style={{
                borderRadius: 4,
                background: 'var(--bg-hover)',
              }}
            >
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: role.color || 'var(--text-muted)',
                flexShrink: 0,
              }} />
              <Text size="sm" style={{ flex: 1 }}>{role.name}</Text>
              {role.hoist && (
                <Badge size="xs" variant="outline" color="gray">Hoisted</Badge>
              )}
              <Text size="xs" c="dimmed">Pos: {role.position}</Text>
              <Tooltip label="Delete Role" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size={24}
                  onClick={() => handleDelete(role.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>No roles configured.</Text>
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

  const [search, setSearch] = useState('');

  const filtered = (members || []).filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKick = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/kick`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch {
      // silently fail
    }
  };

  const handleBan = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/ban`);
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch {
      // silently fail
    }
  };

  const handleTimeout = async (userId: string) => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/timeout`, { duration: 600 });
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
    } catch {
      // silently fail
    }
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

      <Stack gap={2}>
        {filtered.map((member) => (
          <Group
            key={member.id}
            gap={8}
            px={12}
            py={8}
            style={{
              borderRadius: 4,
              background: 'var(--bg-hover)',
            }}
          >
            <Avatar src={member.avatar_url} size={28} radius="xl" color="brand">
              {member.username.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" truncate>{member.display_name || member.username}</Text>
              {member.roles && member.roles.length > 0 && (
                <Group gap={4} mt={2}>
                  {member.roles.slice(0, 3).map((r) => (
                    <Badge key={r.id} size="xs" variant="dot" color={r.color || 'gray'}>
                      {r.name}
                    </Badge>
                  ))}
                  {member.roles.length > 3 && (
                    <Text size="xs" c="dimmed">+{member.roles.length - 3}</Text>
                  )}
                </Group>
              )}
            </div>
            <Group gap={4}>
              <Tooltip label="Timeout (10 min)" withArrow>
                <ActionIcon variant="subtle" color="yellow" size={24} onClick={() => handleTimeout(member.id)}>
                  <IconClock size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Kick" withArrow>
                <ActionIcon variant="subtle" color="orange" size={24} onClick={() => handleKick(member.id)}>
                  <IconUserMinus size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Ban" withArrow>
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => handleBan(member.id)}>
                  <IconBan size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ))}
        {filtered.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" py={16}>
            {search ? 'No members match your search.' : 'No members found.'}
          </Text>
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

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'text' | 'voice'>('text');
  const [creating, setCreating] = useState(false);

  const sorted = [...(channels || [])].sort((a, b) => a.position - b.position);
  const categories = sorted.filter((c) => c.type === 'category');
  const uncategorized = sorted.filter((c) => c.type !== 'category' && !c.category_id);

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
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (channelId: string) => {
    try {
      await api.delete(`/api/channels/${channelId}`);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    } catch {
      // silently fail
    }
  };

  const renderChannel = (ch: Channel) => (
    <Group
      key={ch.id}
      gap={8}
      px={12}
      py={6}
      style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
    >
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
        <Button
          variant={newType === 'text' ? 'filled' : 'outline'}
          size="xs"
          onClick={() => setNewType('text')}
        >
          Text
        </Button>
        <Button
          variant={newType === 'voice' ? 'filled' : 'outline'}
          size="xs"
          onClick={() => setNewType('voice')}
        >
          Voice
        </Button>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleCreate}
          loading={creating}
          disabled={!newName.trim()}
        >
          Create
        </Button>
      </Group>

      {/* Channel list */}
      <Stack gap={4}>
        {uncategorized.length > 0 && (
          <>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={4}>Uncategorized</Text>
            {uncategorized.map(renderChannel)}
          </>
        )}
        {categories.map((cat) => {
          const children = sorted.filter((c) => c.category_id === cat.id && c.type !== 'category');
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
                {children.map(renderChannel)}
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
      await api.post(`/api/servers/${serverId}/invites`, {
        max_uses: maxUses || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (code: string) => {
    try {
      await api.delete(`/api/servers/${serverId}/invites/${code}`);
      queryClient.invalidateQueries({ queryKey: ['invites', serverId] });
    } catch {
      // silently fail
    }
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Invites</Text>

      {/* Create invite */}
      <Group gap={8} align="flex-end">
        <NumberInput
          label="Max Uses"
          description="0 = unlimited"
          value={maxUses}
          onChange={setMaxUses}
          min={0}
          max={100}
          style={{ width: 140 }}
        />
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleCreate}
          loading={creating}
        >
          Create Invite
        </Button>
      </Group>

      {/* Invite list */}
      {(invites || []).length > 0 ? (
        <Stack gap={4}>
          {invites!.map((invite) => (
            <Group
              key={invite.code}
              gap={8}
              px={12}
              py={8}
              style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
            >
              <Text size="sm" ff="monospace" style={{ flex: 1 }}>{invite.code}</Text>
              <Text size="xs" c="dimmed">
                {invite.uses}{invite.max_uses ? `/${invite.max_uses}` : ''} uses
              </Text>
              {invite.expires_at && (
                <Text size="xs" c="dimmed">
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </Text>
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
    } catch {
      // silently fail
    }
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
            <Group
              key={ban.user_id}
              gap={8}
              px={12}
              py={8}
              style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
            >
              <Avatar src={ban.avatar_url} size={28} radius="xl" color="brand">
                {ban.username.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" truncate>{ban.display_name || ban.username}</Text>
                {ban.reason && (
                  <Text size="xs" c="dimmed" truncate>Reason: {ban.reason}</Text>
                )}
              </div>
              <Text size="xs" c="dimmed">{new Date(ban.banned_at).toLocaleDateString()}</Text>
              <Tooltip label="Unban" withArrow>
                <Button size="xs" variant="outline" color="green" onClick={() => handleUnban(ban.user_id)}>
                  Unban
                </Button>
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
  user: { id: string; username: string };
  target?: { id: string; type: string; name?: string };
  changes?: Record<string, any>;
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
            <Group
              key={entry.id}
              gap={8}
              px={12}
              py={8}
              style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
              wrap="nowrap"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm">
                  <Text component="span" fw={600}>{entry.user.username}</Text>
                  {' '}
                  <Text component="span" c="dimmed">{entry.action.replace(/_/g, ' ')}</Text>
                  {entry.target?.name && (
                    <Text component="span" fw={500}>{' '}{entry.target.name}</Text>
                  )}
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
