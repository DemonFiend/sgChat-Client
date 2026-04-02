import { useEffect, useState } from 'react';
import { ActionIcon, Avatar, Badge, Button, Group, Indicator, ScrollArea, Stack, Tabs, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconClockHour4, IconMessage, IconSearch, IconX } from '@tabler/icons-react';
import { useFriends, useFriendRequests, useSendFriendRequest, useAcceptFriendRequest, useRemoveFriend, useBlockedUsers, useUnblockUser, type Friend, type FriendRequest } from '../hooks/useFriends';
import { useBlockedUsersStore } from '../stores/blockedUsersStore';
import { useIgnoredUsersStore } from '../stores/ignoredUsersStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useUIStore } from '../stores/uiStore';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { DMSidebar } from '../components/layout/DMSidebar';

type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'ignored' | 'history' | 'add';

interface AdminAction {
  id: string;
  action_type: string;
  target_user?: { id: string; username: string };
  actor?: { id: string; username: string };
  reason?: string;
  created_at: string;
}

export function FriendsView() {
  const [tab, setTab] = useState<string | null>('online');
  const [addUsername, setAddUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends } = useFriends();
  const { data: requests } = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: blockedUsersRQ } = useBlockedUsers();
  const unblockUserRQ = useUnblockUser();

  // Zustand stores for blocked/ignored — select raw state, filter in component
  const blockedUsersZus = useBlockedUsersStore((s) => s.blockedUsers);
  const blockedLoaded = useBlockedUsersStore((s) => s.loaded);
  const fetchBlocked = useBlockedUsersStore((s) => s.fetchBlocked);
  const unblockUserZus = useBlockedUsersStore((s) => s.unblockUser);

  const ignoredUsers = useIgnoredUsersStore((s) => s.ignoredUsers);
  const ignoredLoaded = useIgnoredUsersStore((s) => s.loaded);
  const fetchIgnored = useIgnoredUsersStore((s) => s.fetchIgnored);
  const unignoreUser = useIgnoredUsersStore((s) => s.unignoreUser);

  // History state
  const [historyActions, setHistoryActions] = useState<AdminAction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const statuses = usePresenceStore((s) => s.statuses);

  // Fetch blocked/ignored on tab switch
  useEffect(() => {
    if (tab === 'blocked' && !blockedLoaded) fetchBlocked();
  }, [tab, blockedLoaded, fetchBlocked]);

  useEffect(() => {
    if (tab === 'ignored' && !ignoredLoaded) fetchIgnored();
  }, [tab, ignoredLoaded, fetchIgnored]);

  useEffect(() => {
    if (tab === 'history' && !historyLoaded) {
      setHistoryLoading(true);
      api.get<AdminAction[] | { data: AdminAction[] }>('/api/admin/actions')
        .then((res) => {
          const actions = Array.isArray(res) ? res : (res as any).data ?? [];
          setHistoryActions(actions);
        })
        .catch(() => {
          setHistoryActions([]);
        })
        .finally(() => {
          setHistoryLoading(false);
          setHistoryLoaded(true);
        });
    }
  }, [tab, historyLoaded]);

  // Filter logic — computed in component body (Zustand 5 safety)
  const searchLower = searchQuery.toLowerCase().trim();

  const allFriends = friends || [];
  const onlineFriends = allFriends.filter((f) => statuses[f.id] && statuses[f.id] !== 'offline');

  const filteredOnline = searchLower
    ? onlineFriends.filter((f) => matchesSearch(f, searchLower))
    : onlineFriends;

  const filteredAll = searchLower
    ? allFriends.filter((f) => matchesSearch(f, searchLower))
    : allFriends;

  // Server doesn't include a 'status' field on friend requests — all requests
  // returned by GET /friends/requests are inherently pending (accepted/rejected
  // requests are deleted from the DB). No filtering needed.
  const incomingRequests = requests?.incoming || [];
  const outgoingRequests = requests?.outgoing || [];
  const filteredIncoming = searchLower
    ? incomingRequests.filter((r) => r.from_user.username.toLowerCase().includes(searchLower))
    : incomingRequests;
  const filteredOutgoing = searchLower
    ? outgoingRequests.filter((r) => r.to_user.username.toLowerCase().includes(searchLower))
    : outgoingRequests;
  const pendingCount = incomingRequests.length;

  // Use Zustand store for blocked (has more data), fall back to RQ
  const blockedList = blockedUsersZus.length > 0 ? blockedUsersZus : (blockedUsersRQ || []);
  const filteredBlocked = searchLower
    ? blockedList.filter((u) => u.username.toLowerCase().includes(searchLower))
    : blockedList;

  const filteredIgnored = searchLower
    ? ignoredUsers.filter((u) => u.username.toLowerCase().includes(searchLower))
    : ignoredUsers;

  const handleAddFriend = () => {
    const trimmed = addUsername.trim();
    if (!trimmed) return;
    sendRequest.mutate(trimmed);
    setAddUsername('');
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.post(`/api/friends/requests/${requestId}/reject`);
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    } catch {
      // Ignore
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await api.delete(`/api/friends/requests/${requestId}`);
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    } catch {
      // Ignore
    }
  };

  const showSearch = tab !== 'add' && tab !== 'history';

  return (
    <>
      <DMSidebar onCreateDM={() => {}} />

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
          <Tabs value={tab} onChange={(v) => { setTab(v); setSearchQuery(''); }} variant="pills" style={{ flex: 1 }}>
            <Tabs.List>
              <Tabs.Tab value="online" size="xs">Online</Tabs.Tab>
              <Tabs.Tab value="all" size="xs">All</Tabs.Tab>
              <Tabs.Tab value="pending" size="xs">
                Pending
                {pendingCount > 0 && (
                  <Badge size="xs" color="red" variant="filled" ml={4}>
                    {pendingCount}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="blocked" size="xs">Blocked</Tabs.Tab>
              <Tabs.Tab value="ignored" size="xs">Ignored</Tabs.Tab>
              <Tabs.Tab value="history" size="xs">History</Tabs.Tab>
              <Tabs.Tab value="add" size="xs" color="green">Add Friend</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
            <TextInput
              placeholder="Search..."
              size="xs"
              variant="filled"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={14} />}
              rightSection={searchQuery ? (
                <ActionIcon variant="subtle" size={16} onClick={() => setSearchQuery('')}>
                  <IconX size={10} />
                </ActionIcon>
              ) : null}
              styles={{ input: { background: 'var(--bg-tertiary)', border: 'none' } }}
            />
          </div>
        )}

        <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
          <Stack gap={0} p={16}>
            {/* Online tab */}
            {tab === 'online' && filteredOnline.map((friend) => (
              <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend.mutate(friend.id)} />
            ))}
            {tab === 'online' && filteredOnline.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>
                {searchLower ? 'No matching online friends' : 'No friends online'}
              </Text>
            )}

            {/* All tab */}
            {tab === 'all' && filteredAll.map((friend) => (
              <FriendItem key={friend.id} friend={friend} onRemove={() => removeFriend.mutate(friend.id)} />
            ))}
            {tab === 'all' && filteredAll.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>
                {searchLower ? 'No matching friends' : 'No friends yet'}
              </Text>
            )}

            {/* Pending tab — incoming + outgoing */}
            {tab === 'pending' && (
              <>
                {/* Incoming */}
                {filteredIncoming.length > 0 && (
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8} style={{ letterSpacing: '0.5px' }}>
                    Incoming -- {filteredIncoming.length}
                  </Text>
                )}
                {filteredIncoming.map((req) => (
                  <PendingRequestItem
                    key={req.id}
                    request={req}
                    direction="incoming"
                    onAccept={() => acceptRequest.mutate(req.from_user.id)}
                    onReject={() => handleRejectRequest(req.from_user.id)}
                  />
                ))}

                {/* Outgoing */}
                {filteredOutgoing.length > 0 && (
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8} mt={filteredIncoming.length > 0 ? 16 : 0} style={{ letterSpacing: '0.5px' }}>
                    Outgoing -- {filteredOutgoing.length}
                  </Text>
                )}
                {filteredOutgoing.map((req) => (
                  <PendingRequestItem
                    key={req.id}
                    request={req}
                    direction="outgoing"
                    onCancel={() => handleCancelRequest(req.id)}
                  />
                ))}

                {filteredIncoming.length === 0 && filteredOutgoing.length === 0 && (
                  <Text c="dimmed" ta="center" py={32}>
                    {searchLower ? 'No matching pending requests' : 'No pending requests'}
                  </Text>
                )}
              </>
            )}

            {/* Blocked tab */}
            {tab === 'blocked' && filteredBlocked.map((user) => (
              <UserActionItem
                key={user.id}
                user={user}
                label="Blocked"
                actionLabel="Unblock"
                actionColor="blue"
                onAction={() => {
                  unblockUserZus(user.id);
                  unblockUserRQ.mutate(user.id);
                }}
              />
            ))}
            {tab === 'blocked' && filteredBlocked.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>
                {searchLower ? 'No matching blocked users' : 'No blocked users'}
              </Text>
            )}

            {/* Ignored tab */}
            {tab === 'ignored' && filteredIgnored.map((user) => (
              <UserActionItem
                key={user.id}
                user={user}
                label="Ignored"
                actionLabel="Unignore"
                actionColor="blue"
                onAction={() => unignoreUser(user.id)}
              />
            ))}
            {tab === 'ignored' && filteredIgnored.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>
                {searchLower ? 'No matching ignored users' : 'No ignored users'}
              </Text>
            )}

            {/* History tab */}
            {tab === 'history' && historyLoading && (
              <Text c="dimmed" ta="center" py={32}>Loading action history...</Text>
            )}
            {tab === 'history' && !historyLoading && historyActions.length === 0 && (
              <Text c="dimmed" ta="center" py={32}>No action history</Text>
            )}
            {tab === 'history' && !historyLoading && historyActions.map((action) => (
              <HistoryItem key={action.id} action={action} />
            ))}

            {/* Add Friend tab */}
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

/* ---- Helper ---- */

function matchesSearch(friend: Friend, searchLower: string): boolean {
  return (
    friend.username.toLowerCase().includes(searchLower) ||
    (friend.display_name?.toLowerCase().includes(searchLower) ?? false)
  );
}

/* ---- Sub-components ---- */

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

function FriendItem({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
  const setView = useUIStore((s) => s.setView);
  const setActiveDM = useUIStore((s) => s.setActiveDM);
  const [hovered, setHovered] = useState(false);
  const status = usePresenceStore((s) => s.statuses[friend.id] || 'offline');
  const customStatus = usePresenceStore((s) => s.statusComments[friend.id]);
  const statusColor = { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';

  const openDM = async () => {
    try {
      const result = await api.post<{ id: string }>('/api/dms', { user_id: friend.id });
      await queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      setView('dms');
      setActiveDM(result.id);
    } catch {
      // Ignore errors
    }
  };

  return (
    <UnstyledButton
      onClick={openDM}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 0.1s',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        width: '100%',
      }}
    >
      <Indicator color={statusColor as any} size={8} offset={3} position="bottom-end" withBorder styles={{ indicator: { transition: 'background-color 300ms ease' } }}>
        <Avatar src={friend.avatar_url} size={32} radius="xl" color="brand">
          {friend.username.charAt(0).toUpperCase()}
        </Avatar>
      </Indicator>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>{friend.display_name || friend.username}</Text>
        <Text size="xs" c="dimmed" truncate>
          {customStatus || STATUS_LABELS[status] || 'Offline'}
        </Text>
      </div>
      {hovered && (
        <Group gap={4}>
          <Tooltip label="Message" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={28} onClick={(e) => { e.stopPropagation(); openDM(); }}>
              <IconMessage size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove Friend" position="top" withArrow>
            <ActionIcon variant="subtle" color="red" size={28} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </UnstyledButton>
  );
}

function PendingRequestItem({ request, direction, onAccept, onReject, onCancel }: {
  request: FriendRequest;
  direction: 'incoming' | 'outgoing';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const user = direction === 'incoming' ? request.from_user : request.to_user;

  return (
    <Group
      px={8}
      py={8}
      style={{ borderRadius: 4, background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar src={user.avatar_url} size={32} radius="xl" color="brand">
        {user.username.charAt(0).toUpperCase()}
      </Avatar>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>{user.username}</Text>
        <Text size="xs" c="dimmed">
          {direction === 'incoming' ? 'Incoming Friend Request' : 'Outgoing Friend Request'}
        </Text>
      </div>
      {direction === 'incoming' && (
        <>
          <Tooltip label="Accept" withArrow>
            <ActionIcon variant="light" color="green" size={32} onClick={onAccept}>
              <IconCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reject" withArrow>
            <ActionIcon variant="light" color="red" size={32} onClick={onReject}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </>
      )}
      {direction === 'outgoing' && (
        <Tooltip label="Cancel Request" withArrow>
          <ActionIcon variant="light" color="red" size={32} onClick={onCancel}>
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

function UserActionItem({ user, label, actionLabel, actionColor, onAction }: {
  user: { id: string; username: string; avatar_url?: string | null; display_name?: string | null };
  label: string;
  actionLabel: string;
  actionColor: string;
  onAction: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Group
      px={8}
      py={8}
      style={{ borderRadius: 4, background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar src={user.avatar_url} size={32} radius="xl" color="brand">
        {user.username.charAt(0).toUpperCase()}
      </Avatar>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>{user.display_name || user.username}</Text>
        <Text size="xs" c="dimmed">{label}</Text>
      </div>
      <Button size="xs" variant="light" color={actionColor} onClick={onAction}>
        {actionLabel}
      </Button>
    </Group>
  );
}

function HistoryItem({ action }: { action: AdminAction }) {
  const [hovered, setHovered] = useState(false);
  const dateStr = new Date(action.created_at).toLocaleString();

  return (
    <Group
      px={8}
      py={8}
      style={{ borderRadius: 4, background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ActionIcon variant="light" color="gray" size={32} radius="xl" style={{ pointerEvents: 'none' }}>
        <IconClockHour4 size={16} />
      </ActionIcon>
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {action.action_type}
          {action.target_user && (
            <Text span c="dimmed" size="sm"> on {action.target_user.username}</Text>
          )}
        </Text>
        <Text size="xs" c="dimmed">
          {action.actor && `By ${action.actor.username} -- `}{dateStr}
          {action.reason && ` -- ${action.reason}`}
        </Text>
      </div>
    </Group>
  );
}
