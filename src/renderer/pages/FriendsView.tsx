import { useState } from 'react';
import { ActionIcon, Avatar, Badge, Button, Group, Indicator, ScrollArea, Stack, Tabs, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconMessage, IconUserPlus, IconX } from '@tabler/icons-react';
import { useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend, type Friend } from '../hooks/useFriends';
import { usePresenceStore } from '../stores/presenceStore';
import { useUIStore } from '../stores/uiStore';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { DMSidebar } from '../components/layout/DMSidebar';

export function FriendsView() {
  const [tab, setTab] = useState<string | null>('online');
  const [addUsername, setAddUsername] = useState('');
  const { data: friends } = useFriends();
  const { data: requests } = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();

  const statuses = usePresenceStore((s) => s.statuses);
  const onlineFriends = friends?.filter((f) => statuses[f.id] && statuses[f.id] !== 'offline') || [];
  const allFriends = friends || [];
  const pendingRequests = requests?.incoming?.filter((r) => r.status === 'pending') || [];

  const handleAddFriend = () => {
    const trimmed = addUsername.trim();
    if (!trimmed) return;
    sendRequest.mutate(trimmed);
    setAddUsername('');
  };

  return (
    <>
      {/* DM sidebar shared with DM view */}
      <DMSidebar onCreateDM={() => {}} />

      {/* Main friends area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Header with tabs */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: 16,
        }}>
          <Text fw={600} size="sm">Friends</Text>
          <Tabs value={tab} onChange={setTab} variant="pills" style={{ flex: 1 }}>
            <Tabs.List>
              <Tabs.Tab value="online" size="xs">Online</Tabs.Tab>
              <Tabs.Tab value="all" size="xs">All</Tabs.Tab>
              <Tabs.Tab value="pending" size="xs">
                Pending
                {pendingRequests.length > 0 && (
                  <Badge size="xs" color="red" variant="filled" ml={4}>
                    {pendingRequests.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="add" size="xs" color="green">Add Friend</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
          <Stack gap={0} p={16}>
            {tab === 'online' && onlineFriends.map((friend) => (
              <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend.mutate(friend.id)} />
            ))}
            {tab === 'online' && onlineFriends.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>No friends online</Text>
            )}

            {tab === 'all' && allFriends.map((friend) => (
              <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend.mutate(friend.id)} />
            ))}
            {tab === 'all' && allFriends.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>No friends yet</Text>
            )}

            {tab === 'pending' && pendingRequests.map((req) => (
              <Group key={req.id} px={8} py={8} style={{ borderRadius: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar size={32} radius="xl" color="brand">
                  {req.from_user.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>{req.from_user.username}</Text>
                  <Text size="xs" c="dimmed">Incoming Friend Request</Text>
                </div>
                <Button size="xs" color="green" variant="light" onClick={() => acceptRequest.mutate(req.id)}>
                  <IconCheck size={14} />
                </Button>
                <Button size="xs" color="red" variant="light">
                  <IconX size={14} />
                </Button>
              </Group>
            ))}
            {tab === 'pending' && pendingRequests.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>No pending requests</Text>
            )}

            {tab === 'add' && (
              <div style={{ maxWidth: 500 }}>
                <Text size="sm" fw={600} mb={4}>Add Friend</Text>
                <Text size="xs" c="dimmed" mb={16}>
                  You can add friends by their username.
                </Text>
                <Group>
                  <TextInput
                    placeholder="Enter a username"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={handleAddFriend}
                    loading={sendRequest.isPending}
                    disabled={!addUsername.trim()}
                  >
                    Send Request
                  </Button>
                </Group>
              </div>
            )}
          </Stack>
        </ScrollArea>
      </div>
    </>
  );
}

function FriendItem({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
  const setView = useUIStore((s) => s.setView);
  const setActiveDM = useUIStore((s) => s.setActiveDM);
  const [hovered, setHovered] = useState(false);
  const statusColor = usePresenceStore((s) => {
    const status = s.getStatus(friend.id);
    return { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';
  });

  const openDM = async () => {
    try {
      const result = await api.post<{ id: string }>(`/api/dms/user/${friend.id}`);
      await queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      setView('dms');
      setActiveDM(result.id);
    } catch {
      // Ignore errors
    }
  };

  return (
    <Group
      px={8}
      py={8}
      style={{ borderRadius: 4, cursor: 'pointer', transition: 'background 0.1s', background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder>
        <Avatar src={friend.avatar_url} size={32} radius="xl" color="brand">
          {friend.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>{friend.username}</Text>
        <Text size="xs" c="dimmed">{friend.status || 'Offline'}</Text>
      </div>
      {hovered && (
        <Group gap={4}>
          <Tooltip label="Message" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={28} onClick={openDM}>
              <IconMessage size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove Friend" position="top" withArrow>
            <ActionIcon variant="subtle" color="red" size={28} onClick={onRemove}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </Group>
  );
}
