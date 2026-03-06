import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Group, HoverCard, Indicator, Modal, ScrollArea, Select, Skeleton, Stack, Text } from '@mantine/core';
import { IconDeviceGamepad2, IconHeadphones, IconEye, IconBroadcast, IconTrophy, IconSparkles } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';
import { toastStore } from '../../stores/toastNotifications';
import { usePresenceStore } from '../../stores/presenceStore';
import { useActivityStore, type UserActivity } from '../../stores/activityStore';
import { useAuthStore } from '../../stores/authStore';
import { UserContextMenu } from '../ui/UserContextMenu';
import { useSendFriendRequest, useFriends, useRemoveFriend, useBlockUser } from '../../hooks/useFriends';
import { queryClient } from '../../lib/queryClient';

interface Role {
  id: string;
  name: string;
  color?: string;
  position: number;
  hoist?: boolean;
  is_hoisted?: boolean;
}

interface Member {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  roles?: Role[];
  status?: string;
  custom_status?: string;
  joined_at?: string;
}

export function MemberList() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  const memberListVisible = useUIStore((s) => s.memberListVisible);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: friends } = useFriends();
  const sendFriendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);
  const [timeoutTarget, setTimeoutTarget] = useState<{ userId: string; username: string } | null>(null);
  const [timeoutDuration, setTimeoutDuration] = useState<string | null>('300');
  const friendIds = new Set((friends || []).map((f: any) => f.friend_id || f.id));

  const handleContextMenu = useCallback((e: React.MouseEvent, member: Member) => {
    e.preventDefault();
    setCtxMenu({ userId: member.id, username: member.username, x: e.clientX, y: e.clientY });
  }, []);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members', activeServerId],
    queryFn: async () => {
      const raw = await api.get<any[]>(`/api/servers/${activeServerId}/members`);
      return raw.map((m) => ({
        ...m,
        id: m.user_id || m.id, // Server returns user_id, normalize to id
        roles: typeof m.roles === 'string' ? JSON.parse(m.roles) : (m.roles || []),
      })) as Member[];
    },
    enabled: !!activeServerId && memberListVisible,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', activeServerId],
    queryFn: () => api.get<Role[]>(`/api/servers/${activeServerId}/roles`),
    enabled: !!activeServerId && memberListVisible,
  });

  const statuses = usePresenceStore((s) => s.statuses);

  // Seed presenceStore + activityStore with data from the members API response
  useEffect(() => {
    if (!members) return;
    const { updatePresence, updateStatusComment } = usePresenceStore.getState();
    const { updateActivity } = useActivityStore.getState();
    for (const m of members) {
      if (m.status) updatePresence(m.id, m.status);
      if (m.custom_status) updateStatusComment(m.id, m.custom_status);
      if ((m as any).activity) updateActivity(m.id, (m as any).activity);
    }
  }, [members]);

  if (!memberListVisible || !activeServerId) return null;

  if (membersLoading) {
    return (
      <div style={{
        width: 240,
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Stack gap={8} p={12}>
          <Skeleton height={12} width={80} radius="sm" />
          {[...Array(8)].map((_, i) => (
            <Group key={i} gap={8}>
              <Skeleton circle height={32} />
              <Skeleton height={12} width={`${60 + Math.random() * 30}%`} radius="sm" />
            </Group>
          ))}
        </Stack>
      </div>
    );
  }

  // Group members by their highest hoisted role
  const hoistedRoles = (roles || [])
    .filter((r) => r.hoist || r.is_hoisted)
    .sort((a, b) => b.position - a.position);

  const grouped: { role: Role | null; label: string; members: Member[] }[] = [];
  const assigned = new Set<string>();

  for (const role of hoistedRoles) {
    const roleMembers = (members || []).filter(
      (m) => m.roles?.some((r) => r.id === role.id) && !assigned.has(m.id)
    );
    if (roleMembers.length > 0) {
      grouped.push({ role, label: role.name, members: roleMembers });
      roleMembers.forEach((m) => assigned.add(m.id));
    }
  }

  // Remaining online/offline
  const remaining = (members || []).filter((m) => !assigned.has(m.id));
  const online = remaining.filter((m) => statuses[m.id] && statuses[m.id] !== 'offline');
  const offline = remaining.filter((m) => !statuses[m.id] || statuses[m.id] === 'offline');

  if (online.length > 0) grouped.push({ role: null, label: 'Online', members: online });
  if (offline.length > 0) grouped.push({ role: null, label: 'Offline', members: offline });

  return (
    <div style={{
      width: 240,
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
        <Stack gap={2} p={8}>
          {grouped.map((group) => (
            <div key={group.label}>
              <Group gap={4} px={8} py={8}>
                {group.role?.color && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: group.role.color,
                    flexShrink: 0,
                  }} />
                )}
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>
                  {group.label} — {group.members.length}
                </Text>
              </Group>
              {group.members.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  offline={group.label === 'Offline'}
                  roleColor={group.role?.color}
                  onContextMenu={(e) => handleContextMenu(e, member)}
                />
              ))}
            </div>
          ))}
        </Stack>
      </ScrollArea>

      {/* Right-click context menu */}
      {ctxMenu && (
        <UserContextMenu
          userId={ctxMenu.userId}
          username={ctxMenu.username}
          isCurrentUser={ctxMenu.userId === currentUserId}
          isFriend={friendIds.has(ctxMenu.userId)}
          opened={true}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
          onSendMessage={() => {
            useUIStore.getState().setView('dms');
            setCtxMenu(null);
          }}
          onAddFriend={() => {
            sendFriendRequest.mutate(ctxMenu.username);
            setCtxMenu(null);
          }}
          onRemoveFriend={() => {
            removeFriend.mutate(ctxMenu.userId);
            setCtxMenu(null);
          }}
          onBlockUser={() => {
            blockUser.mutate(ctxMenu.userId);
            setCtxMenu(null);
          }}
          onWarn={activeServerId ? () => {
            api.post(`/api/servers/${activeServerId}/members/${ctxMenu.userId}/warn`).then(() => {
              toastStore.addToast({ type: 'system', title: 'Warning Sent', message: `Warned ${ctxMenu.username}` });
            }).catch((err) => {
              toastStore.addToast({ type: 'warning', title: 'Warn Failed', message: (err as any)?.message || 'Unknown error' });
            });
            setCtxMenu(null);
          } : undefined}
          onTimeout={activeServerId ? () => {
            setTimeoutTarget({ userId: ctxMenu.userId, username: ctxMenu.username });
            setCtxMenu(null);
          } : undefined}
          onKick={activeServerId ? () => {
            api.post(`/api/servers/${activeServerId}/members/${ctxMenu.userId}/kick`).then(() => {
              queryClient.invalidateQueries({ queryKey: ['members', activeServerId] });
            }).catch(() => {});
            setCtxMenu(null);
          } : undefined}
          onBan={activeServerId ? () => {
            api.post(`/api/servers/${activeServerId}/members/${ctxMenu.userId}/ban`).then(() => {
              queryClient.invalidateQueries({ queryKey: ['members', activeServerId] });
            }).catch(() => {});
            setCtxMenu(null);
          } : undefined}
        />
      )}

      {/* Timeout duration modal */}
      <Modal
        opened={!!timeoutTarget}
        onClose={() => setTimeoutTarget(null)}
        title={`Timeout ${timeoutTarget?.username}`}
        size="xs"
        centered
        styles={{ content: { background: 'var(--bg-primary)' }, header: { background: 'var(--bg-primary)' } }}
      >
        <Stack gap={12}>
          <Select
            label="Duration"
            value={timeoutDuration}
            onChange={setTimeoutDuration}
            data={[
              { value: '300', label: '5 minutes' },
              { value: '600', label: '10 minutes' },
              { value: '1800', label: '30 minutes' },
              { value: '3600', label: '1 hour' },
              { value: '86400', label: '1 day' },
              { value: '604800', label: '1 week' },
            ]}
          />
          <Button
            color="orange"
            onClick={() => {
              if (!timeoutTarget || !activeServerId || !timeoutDuration) return;
              api.post(`/api/servers/${activeServerId}/members/${timeoutTarget.userId}/timeout`, {
                duration: parseInt(timeoutDuration),
              }).then(() => {
                toastStore.addToast({ type: 'system', title: 'Timeout Applied', message: `${timeoutTarget.username} has been timed out` });
                queryClient.invalidateQueries({ queryKey: ['members', activeServerId] });
              }).catch((err) => {
                toastStore.addToast({ type: 'warning', title: 'Timeout Failed', message: (err as any)?.message || 'Unknown error' });
              });
              setTimeoutTarget(null);
            }}
          >
            Confirm Timeout
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, typeof IconDeviceGamepad2> = {
  playing: IconDeviceGamepad2,
  listening: IconHeadphones,
  watching: IconEye,
  streaming: IconBroadcast,
  competing: IconTrophy,
  custom: IconSparkles,
};

function ActivityLine({ activity }: { activity: UserActivity }) {
  const Icon = ACTIVITY_ICONS[activity.type] || IconSparkles;
  const prefix = {
    playing: 'Playing',
    listening: 'Listening to',
    watching: 'Watching',
    streaming: 'Streaming',
    competing: 'Competing in',
    custom: '',
  }[activity.type] || '';

  return (
    <Group gap={4} wrap="nowrap">
      <Icon size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <Text size="xs" c="dimmed" truncate>
        {prefix ? `${prefix} ` : ''}{activity.name}
      </Text>
    </Group>
  );
}

function MemberItem({ member, offline, roleColor, onContextMenu }: { member: Member; offline?: boolean; roleColor?: string; onContextMenu?: (e: React.MouseEvent) => void }) {
  const status = usePresenceStore((s) => s.statuses[member.id] || 'offline');
  const activity = useActivityStore((s) => s.activities[member.id]);
  const statusColor = { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';

  return (
    <HoverCard width={280} shadow="md" position="left" withArrow openDelay={300}>
      <HoverCard.Target>
        <Group
          gap={8}
          px={8}
          py={4}
          style={{
            borderRadius: 4,
            cursor: 'pointer',
            opacity: offline ? 0.5 : 1,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          onContextMenu={onContextMenu}
        >
          <Indicator color={statusColor} size={8} offset={3} position="bottom-end" withBorder>
            <Avatar src={member.avatar_url} size={32} radius="xl" color="brand">
              {member.username.charAt(0).toUpperCase()}
            </Avatar>
          </Indicator>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="sm"
              truncate
              style={{ color: roleColor || 'var(--text-primary)' }}
            >
              {member.display_name || member.username}
            </Text>
            {activity ? (
              <ActivityLine activity={activity} />
            ) : member.custom_status ? (
              <Text size="xs" c="dimmed" truncate>{member.custom_status}</Text>
            ) : null}
          </div>
        </Group>
      </HoverCard.Target>
      <HoverCard.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
        <UserProfileCard member={member} status={status} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m elapsed`;
  if (minutes > 0) return `${minutes}m elapsed`;
  return 'Just started';
}

function UserProfileCard({ member, status }: { member: Member; status: string }) {
  const statusLabel = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' }[status] || 'Offline';
  const activity = useActivityStore((s) => s.activities[member.id]);

  return (
    <Stack gap={8}>
      <Group gap={12}>
        <Avatar src={member.avatar_url} size={48} radius="xl" color="brand">
          {member.username.charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <Text fw={700} size="sm">{member.display_name || member.username}</Text>
          <Text size="xs" c="dimmed">{member.username}</Text>
        </div>
      </Group>

      {member.custom_status && (
        <Text size="xs" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          {member.custom_status}
        </Text>
      )}

      <Text size="xs" c="dimmed">{statusLabel}</Text>

      {/* Activity card */}
      {activity && (
        <div style={{
          background: 'var(--bg-hover)',
          borderRadius: 6,
          padding: '8px 10px',
          borderLeft: '3px solid var(--accent)',
        }}>
          <ActivityLine activity={activity} />
          {activity.details && (
            <Text size="xs" c="dimmed" mt={2}>{activity.details}</Text>
          )}
          {activity.state && (
            <Text size="xs" c="dimmed">{activity.state}</Text>
          )}
          {activity.started_at && (
            <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 10 }}>
              {formatElapsed(activity.started_at)}
            </Text>
          )}
        </div>
      )}

      {member.roles && member.roles.length > 0 && (
        <Group gap={4}>
          {member.roles.map((role) => (
            <Badge
              key={role.id}
              size="xs"
              variant="outline"
              style={{
                borderColor: role.color || 'var(--border)',
                color: role.color || 'var(--text-muted)',
              }}
            >
              {role.name}
            </Badge>
          ))}
        </Group>
      )}

      {member.joined_at && (
        <Text size="xs" c="dimmed">
          Member since {new Date(member.joined_at).toLocaleDateString()}
        </Text>
      )}
    </Stack>
  );
}
