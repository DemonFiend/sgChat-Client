import { useState } from 'react';
import { Avatar, Badge, Button, Group, Indicator, ScrollArea, Stack, Tabs, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconCheck, IconUserPlus, IconX } from '@tabler/icons-react';
import { useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend, type Friend } from '../hooks/useFriends';
import { usePresenceStore } from '../stores/presenceStore';
import { UserPanel } from '../components/layout/UserPanel';

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
  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];

  const handleAddFriend = () => {
    const trimmed = addUsername.trim();
    if (!trimmed) return;
    sendRequest.mutate(trimmed);
    setAddUsername('');
  };

  return (
    <>
      {/* Friends sidebar reuses the DM sidebar space */}
      <div style={{
        width: 240,
        background: '#2b2d31',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #1a1b1e',
          flexShrink: 0,
        }}>
          <Text fw={600} size="sm">Friends</Text>
        </div>
        <ScrollArea style={{ flex: 1 }} />
        <UserPanel />
      </div>

      {/* Main friends area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#313338' }}>
        {/* Header with tabs */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #1a1b1e',
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
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2e3035'; }}
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
  const statusColor = usePresenceStore((s) => {
    const status = s.getStatus(friend.id);
    return { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';
  });

  return (
    <Group
      px={8}
      py={8}
      style={{ borderRadius: 4, cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#2e3035'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
    </Group>
  );
}
