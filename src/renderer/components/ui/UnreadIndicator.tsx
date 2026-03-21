interface UnreadIndicatorProps {
  count?: number;
  hasMentions?: boolean;
}

export function UnreadIndicator({ count, hasMentions }: UnreadIndicatorProps) {
  if (!count || count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 4px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        backgroundColor: hasMentions ? 'var(--danger)' : 'var(--text-muted)',
        color: hasMentions ? '#fff' : 'var(--bg-primary)',
      }}
    >
      {displayCount}
    </span>
  );
}

interface UnreadDotProps {
  isUnread: boolean;
}

export function UnreadDot({ isUnread }: UnreadDotProps) {
  if (!isUnread) return null;

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'var(--text-primary)',
        flexShrink: 0,
      }}
    />
  );
}
