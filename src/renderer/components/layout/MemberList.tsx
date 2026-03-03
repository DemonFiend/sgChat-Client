import { useQuery } from '@tanstack/react-query';
import { Avatar, Group, Indicator, ScrollArea, Stack, Text } from '@mantine/core';
import { api } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';
import { usePresenceStore } from '../../stores/presenceStore';

interface Member {
  id: string;
  username: string;
  avatar_url?: string;
  role?: string;
}

export function MemberList() {
  const { activeServerId, memberListVisible } = useUIStore();

  const { data: members } = useQuery({
    queryKey: ['members', activeServerId],
    queryFn: () => api.get<Member[]>(`/api/servers/${activeServerId}/members`),
    enabled: !!activeServerId && memberListVisible,
  });

  if (!memberListVisible || !activeServerId) return null;

  // Split into online/offline using presence store
  const statuses = usePresenceStore((s) => s.statuses);
  const online = members?.filter((m) => statuses[m.id] && statuses[m.id] !== 'offline') || [];
  const offline = members?.filter((m) => !statuses[m.id] || statuses[m.id] === 'offline') || [];

  return (
    <div style={{
      width: 240,
      background: '#2b2d31',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
        <Stack gap={2} p={8}>
          {/* Online section */}
          {online.length > 0 && (
            <>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={8} py={8} style={{ letterSpacing: '0.5px' }}>
                Online — {online.length}
              </Text>
              {online.map((member) => (
                <MemberItem key={member.id} member={member} />
              ))}
            </>
          )}

          {/* Offline section */}
          {offline.length > 0 && (
            <>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={8} py={8} style={{ letterSpacing: '0.5px' }}>
                Offline — {offline.length}
              </Text>
              {offline.map((member) => (
                <MemberItem key={member.id} member={member} offline />
              ))}
            </>
          )}
        </Stack>
      </ScrollArea>
    </div>
  );
}

function MemberItem({ member, offline }: { member: Member; offline?: boolean }) {
  const statusColor = offline ? 'gray' : 'green';

  return (
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
      onMouseEnter={(e) => { e.currentTarget.style.background = '#35373c'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Indicator color={statusColor} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={member.avatar_url} size={32} radius="xl" color="brand">
          {member.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" truncate>{member.username}</Text>
        {member.role && (
          <Text size="xs" c="dimmed" truncate>{member.role}</Text>
        )}
      </div>
    </Group>
  );
}
