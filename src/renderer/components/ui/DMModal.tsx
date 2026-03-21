import { useState } from 'react';
import { Avatar, Button, Group, Indicator, Modal, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useFriends, type Friend } from '../../hooks/useFriends';
import { usePresenceStore } from '../../stores/presenceStore';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useUIStore } from '../../stores/uiStore';

const STATUS_COLORS: Record<string, string> = {
  online: 'green',
  idle: 'yellow',
  dnd: 'red',
  offline: 'gray',
};

interface DMModalProps {
  opened: boolean;
  onClose: () => void;
}

export function DMModal({ opened, onClose }: DMModalProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const { data: friends } = useFriends();
  const setActiveDM = useUIStore((s) => s.setActiveDM);
  const setView = useUIStore((s) => s.setView);

  const filtered = friends?.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const startDM = async (friendId: string) => {
    setLoading(friendId);
    try {
      const result = await api.post<{ id: string }>('/api/dms', { user_id: friendId });
      await queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      setView('dms');
      setActiveDM(result.id);
      onClose();
    } catch {
      // Ignore errors silently
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Direct Message"
      size="sm"
      transitionProps={{ transition: 'pop', duration: 200 }}
      styles={{
        header: { background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' },
        body: { background: 'var(--bg-secondary)', padding: 0 },
        content: { background: 'var(--bg-secondary)' },
      }}
    >
      <div style={{ padding: '12px 16px 0' }}>
        <TextInput
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={14} />}
          size="sm"
          styles={{ input: { background: 'var(--bg-tertiary)', border: 'none' } }}
        />
      </div>

      <ScrollArea mah={300} scrollbarSize={4} type="hover">
        <Stack gap={2} p={12}>
          {filtered.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py={16}>
              {search ? 'No friends match your search' : 'No friends to message'}
            </Text>
          )}
          {filtered.map((friend) => (
            <FriendRow
              key={friend.id}
              friend={friend}
              loading={loading === friend.id}
              onSelect={() => startDM(friend.id)}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}

function FriendRow({ friend, loading, onSelect }: {
  friend: Friend;
  loading: boolean;
  onSelect: () => void;
}) {
  const status = usePresenceStore((s) => s.statuses[friend.id] || 'offline');
  const statusColor = STATUS_COLORS[status] || 'gray';

  return (
    <Group
      gap={10}
      px={8}
      py={6}
      style={{
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onClick={onSelect}
    >
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={friend.avatar_url} size={32} radius="xl" color="brand">
          {friend.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <Text size="sm" fw={500} style={{ flex: 1 }}>{friend.username}</Text>
      <Button size="xs" variant="light" loading={loading} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        Message
      </Button>
    </Group>
  );
}
