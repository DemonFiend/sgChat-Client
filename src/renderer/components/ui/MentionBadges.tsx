import { Badge, Tooltip } from '@mantine/core';
import { IconHash, IconAt, IconClock } from '@tabler/icons-react';
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

/**
 * Format a unix timestamp according to the Discord-style format flag.
 * t = short time, T = long time, d = short date, D = long date,
 * f = date+time (default), F = long date+time, R = relative
 */
function formatTimestamp(ts: number, format: string): string {
  const date = new Date(ts * 1000);

  switch (format) {
    case 't': // Short time: 9:41 AM
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' }).format(date);
    case 'T': // Long time: 9:41:30 AM
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(date);
    case 'd': // Short date: 11/28/2018
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date);
    case 'D': // Long date: November 28, 2018
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    case 'F': // Long date+time: Wednesday, November 28, 2018 9:41 AM
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(date);
    case 'R': { // Relative: 3 hours ago
      const now = Date.now();
      const diffMs = now - date.getTime();
      const absDiff = Math.abs(diffMs);
      const past = diffMs >= 0;

      if (absDiff < 60_000) return past ? 'just now' : 'in a moment';
      if (absDiff < 3_600_000) {
        const mins = Math.round(absDiff / 60_000);
        return past ? `${mins} minute${mins !== 1 ? 's' : ''} ago` : `in ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
      if (absDiff < 86_400_000) {
        const hrs = Math.round(absDiff / 3_600_000);
        return past ? `${hrs} hour${hrs !== 1 ? 's' : ''} ago` : `in ${hrs} hour${hrs !== 1 ? 's' : ''}`;
      }
      const days = Math.round(absDiff / 86_400_000);
      return past ? `${days} day${days !== 1 ? 's' : ''} ago` : `in ${days} day${days !== 1 ? 's' : ''}`;
    }
    case 'f': // Date+time (default): November 28, 2018 9:41 AM
    default:
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(date);
  }
}

export function TimeMentionBadge({ mention }: { mention: ParsedMention }) {
  const ts = mention.timestamp ?? 0;
  const fmt = mention.timeFormat ?? 'f';
  const display = formatTimestamp(ts, fmt);
  const fullDate = new Date(ts * 1000).toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });

  return (
    <Tooltip label={fullDate} position="top" withArrow openDelay={200}>
      <Badge
        size="sm"
        variant="light"
        color="gray"
        style={{ verticalAlign: 'text-bottom', cursor: 'default' }}
        leftSection={<IconClock size={10} />}
      >
        {display}
      </Badge>
    </Tooltip>
  );
}
