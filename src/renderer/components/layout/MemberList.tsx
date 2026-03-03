import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Group, HoverCard, Indicator, ScrollArea, Skeleton, Stack, Text } from '@mantine/core';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';
import { usePresenceStore } from '../../stores/presenceStore';

interface Role {
  id: string;
  name: string;
  color?: string;
  position: number;
  hoist?: boolean;
}

interface Member {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  roles?: Role[];
  custom_status?: string;
  joined_at?: string;
}

export function MemberList() {
  const { activeServerId, memberListVisible } = useUIStore();

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members', activeServerId],
    queryFn: () => api.get<Member[]>(`/api/servers/${activeServerId}/members`),
    enabled: !!activeServerId && memberListVisible,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', activeServerId],
    queryFn: () => api.get<Role[]>(`/api/servers/${activeServerId}/roles`),
    enabled: !!activeServerId && memberListVisible,
  });

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

  const statuses = usePresenceStore((s) => s.statuses);

  // Group members by their highest hoisted role
  const hoistedRoles = (roles || [])
    .filter((r) => r.hoist)
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
                />
              ))}
            </div>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}

function MemberItem({ member, offline, roleColor }: { member: Member; offline?: boolean; roleColor?: string }) {
  const status = usePresenceStore((s) => s.getStatus(member.id));
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
            {member.custom_status && (
              <Text size="xs" c="dimmed" truncate>{member.custom_status}</Text>
            )}
          </div>
        </Group>
      </HoverCard.Target>
      <HoverCard.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
        <UserProfileCard member={member} status={status} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function UserProfileCard({ member, status }: { member: Member; status: string }) {
  const statusLabel = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' }[status] || 'Offline';

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
