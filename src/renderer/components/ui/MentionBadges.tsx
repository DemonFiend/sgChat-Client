import { Badge } from '@mantine/core';
import { IconHash, IconAt } from '@tabler/icons-react';
import { useMentionContext } from '../../contexts/MentionContext';
import type { ParsedMention } from '../../lib/mentionUtils';

export function UserMentionBadge({ mention }: { mention: ParsedMention }) {
  const { members, currentUserId, onUserClick } = useMentionContext();
  const member = mention.id ? members.get(mention.id) : null;
  const displayName = member?.display_name || member?.username || 'Unknown User';
  const isMe = mention.id === currentUserId;

  return (
    <Badge
      size="sm"
      variant={isMe ? 'filled' : 'light'}
      color={isMe ? 'brand' : 'blue'}
      style={{ cursor: onUserClick ? 'pointer' : 'default', verticalAlign: 'text-bottom' }}
      leftSection={<IconAt size={10} />}
      onClick={(e) => {
        if (onUserClick && mention.id) {
          onUserClick(mention.id, (e.target as HTMLElement).getBoundingClientRect());
        }
      }}
    >
      {displayName}
    </Badge>
  );
}

export function ChannelMentionBadge({ mention }: { mention: ParsedMention }) {
  const { channels, onChannelClick } = useMentionContext();
  const channel = mention.id ? channels.get(mention.id) : null;
  const name = channel?.name || 'unknown-channel';

  return (
    <Badge
      size="sm"
      variant="light"
      color="blue"
      style={{ cursor: onChannelClick ? 'pointer' : 'default', verticalAlign: 'text-bottom' }}
      leftSection={<IconHash size={10} />}
      onClick={() => { if (onChannelClick && mention.id) onChannelClick(mention.id); }}
    >
      {name}
    </Badge>
  );
}

export function RoleMentionBadge({ mention }: { mention: ParsedMention }) {
  const { roles } = useMentionContext();
  const role = mention.id ? roles.get(mention.id) : null;
  const name = role?.name || 'Unknown Role';

  return (
    <Badge
      size="sm"
      variant="light"
      style={{ verticalAlign: 'text-bottom', color: role?.color || undefined }}
    >
      @{name}
    </Badge>
  );
}

export function BroadcastMentionBadge({ type }: { type: 'everyone' | 'here' }) {
  return (
    <Badge
      size="sm"
      variant="light"
      color="yellow"
      style={{ verticalAlign: 'text-bottom' }}
    >
      @{type}
    </Badge>
  );
}
