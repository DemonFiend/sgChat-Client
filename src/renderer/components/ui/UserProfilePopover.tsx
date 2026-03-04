import { Avatar, Badge, Button, Divider, Group, Indicator, Paper, Stack, Text } from '@mantine/core';
import { IconMessage, IconUserPlus, IconUserMinus } from '@tabler/icons-react';
import { usePresenceStore } from '../../stores/presenceStore';

interface UserProfilePopoverProps {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  roles?: Array<{ id: string; name: string; color?: string }>;
  isFriend?: boolean;
  onSendMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onClose?: () => void;
}

export function UserProfilePopover({
  userId,
  username,
  displayName,
  avatarUrl,
  bio,
  roles = [],
  isFriend,
  onSendMessage,
  onAddFriend,
  onRemoveFriend,
  onClose,
}: UserProfilePopoverProps) {
  const status = usePresenceStore((s) => s.statuses[userId] || 'offline');
  const statusComment = usePresenceStore((s) => s.statusComments[userId]);
  const statusColor = { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';

  return (
    <Paper
      shadow="lg"
      radius="md"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        width: 300,
        overflow: 'hidden',
      }}
    >
      {/* Banner area */}
      <div style={{ height: 60, background: 'var(--accent)', opacity: 0.3 }} />

      {/* Avatar (overlapping banner) */}
      <div style={{ padding: '0 16px', marginTop: -30 }}>
        <Indicator
          color={statusColor as any}
          size={14}
          offset={4}
          position="bottom-end"
          withBorder
        >
          <Avatar src={avatarUrl} size={64} radius="xl" color="brand" style={{ border: '4px solid var(--bg-primary)' }}>
            {(displayName || username || '?')[0].toUpperCase()}
          </Avatar>
        </Indicator>
      </div>

      <Stack gap="sm" p="md" pt="xs">
        {/* Name */}
        <div>
          <Text fw={700} size="lg">{displayName || username}</Text>
          {displayName && <Text size="sm" c="dimmed">{username}</Text>}
        </div>

        {/* Status comment */}
        {statusComment && (
          <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
            {statusComment}
          </Text>
        )}

        {/* Bio */}
        {bio && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>About Me</Text>
              <Text size="sm">{bio}</Text>
            </div>
          </>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <>
            <Divider style={{ borderColor: 'var(--border)' }} />
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Roles</Text>
              <Group gap={4}>
                {roles.map((role) => (
                  <Badge key={role.id} size="sm" variant="outline" color={role.color || 'gray'}>
                    {role.name}
                  </Badge>
                ))}
              </Group>
            </div>
          </>
        )}

        {/* Actions */}
        <Divider style={{ borderColor: 'var(--border)' }} />
        <Group gap="xs">
          {onSendMessage && (
            <Button
              size="xs"
              leftSection={<IconMessage size={14} />}
              onClick={onSendMessage}
              variant="light"
            >
              Message
            </Button>
          )}
          {!isFriend && onAddFriend && (
            <Button
              size="xs"
              leftSection={<IconUserPlus size={14} />}
              onClick={onAddFriend}
              variant="light"
              color="green"
            >
              Add Friend
            </Button>
          )}
          {isFriend && onRemoveFriend && (
            <Button
              size="xs"
              leftSection={<IconUserMinus size={14} />}
              onClick={onRemoveFriend}
              variant="light"
              color="red"
            >
              Remove Friend
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
