import { Badge } from '@mantine/core';
import { IconHash, IconAt } from '@tabler/icons-react';
import { useMentionContext } from '../../contexts/MentionContext';
import type { ParsedMention } from '../../lib/mentionUtils';

/** Safely convert a hex color to rgba. Returns undefined for invalid colors. */
function hexToRgba(hex: string, alpha: number): string | undefined {
  const match = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.exec(hex);
  if (!match) return undefined;
  let h = match[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  const color = role?.color || undefined;

  return (
    <Badge
      size="sm"
      variant="light"
      style={{
        verticalAlign: 'text-bottom',
        color,
        backgroundColor: color ? hexToRgba(color, 0.12) : undefined,
        borderColor: color ? hexToRgba(color, 0.25) : undefined,
      }}
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
