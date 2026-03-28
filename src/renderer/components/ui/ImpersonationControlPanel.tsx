import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar, Button, Group, Paper, ScrollArea, Stack, Text, TextInput,
} from '@mantine/core';
import { IconSearch, IconUserCheck } from '@tabler/icons-react';
import { api, ensureArray } from '../../lib/api';
import { useImpersonationStore } from '../../stores/impersonationStore';

interface SearchableMember {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
}

interface ImpersonationControlPanelProps {
  serverId: string;
}

export function ImpersonationControlPanel({ serverId }: ImpersonationControlPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const startImpersonation = useImpersonationStore((s) => s.startImpersonation);
  const isLoading = useImpersonationStore((s) => s.isLoading);
  const error = useImpersonationStore((s) => s.error);

  const { data: members } = useQuery({
    queryKey: ['members', serverId, 'impersonation'],
    queryFn: async () =>
      ensureArray<SearchableMember>(
        await api.get(`/api/servers/${serverId}/members`),
      ),
    enabled: !!serverId,
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return members || [];
    const q = searchQuery.toLowerCase();
    return (members || []).filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        (m.display_name && m.display_name.toLowerCase().includes(q)),
    );
  }, [members, searchQuery]);

  const handleSelect = (userId: string) => {
    startImpersonation(serverId, userId);
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Impersonate User</Text>
      <Text size="sm" c="dimmed">
        View the server as another user to debug permissions and visibility.
        This does not affect the target user or your actual permissions.
      </Text>

      {error && (
        <Paper p={8} bg="var(--mantine-color-red-light)">
          <Text size="sm" c="red">{error}</Text>
        </Paper>
      )}

      <TextInput
        placeholder="Search members..."
        leftSection={<IconSearch size={14} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      <ScrollArea style={{ maxHeight: 400 }}>
        <Stack gap={4}>
          {filtered.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py={20}>
              {searchQuery ? 'No members found' : 'Loading members...'}
            </Text>
          )}
          {filtered.slice(0, 50).map((member) => (
            <Group
              key={member.id}
              gap={12}
              px={12}
              py={8}
              style={{
                borderRadius: 6,
                background: 'var(--bg-hover)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onClick={() => handleSelect(member.id)}
            >
              <Avatar src={member.avatar_url} size={32} radius="xl">
                {member.username.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate="end">
                  {member.display_name || member.username}
                </Text>
                {member.display_name && (
                  <Text size="xs" c="dimmed">@{member.username}</Text>
                )}
              </div>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconUserCheck size={14} />}
                loading={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(member.id);
                }}
              >
                Impersonate
              </Button>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
