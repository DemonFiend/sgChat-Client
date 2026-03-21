import { useCallback } from 'react';
import { ActionIcon, Avatar, ScrollArea, Stack, Text } from '@mantine/core';
import { IconPin, IconPinnedOff } from '@tabler/icons-react';
import { MessageContent } from './MessageContent';

export interface PinnedMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  created_at: string;
  edited_at: string | null;
  attachments: any[];
  pinned_at?: string;
  pinned_by?: { id: string; username: string };
}

interface PinnedMessagesPanelProps {
  channelName: string;
  pinnedMessages: PinnedMessage[];
  onUnpin?: (messageId: string) => void;
  canManageMessages?: boolean;
  onClose?: () => void;
}

export function PinnedMessagesPanel({
  channelName,
  pinnedMessages,
  onUnpin,
  canManageMessages,
  onClose,
}: PinnedMessagesPanelProps) {
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  return (
    <div
      style={{
        width: 240,
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Text size="sm" fw={600} c="var(--text-primary)">
            Pinned Messages
          </Text>
          <Text size="xs" c="var(--text-muted)" mt={2}>
            {pinnedMessages.length} pinned in #{channelName}
          </Text>
        </div>
        {onClose && (
          <ActionIcon variant="subtle" size="sm" onClick={onClose} c="var(--text-muted)">
            <IconPinnedOff size={16} />
          </ActionIcon>
        )}
      </div>

      {/* Messages List */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
        {pinnedMessages.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <IconPin size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <Text size="sm" c="var(--text-muted)">
              No pinned messages yet
            </Text>
          </div>
        ) : (
          <Stack gap={0}>
            {pinnedMessages.map((pm) => (
              <div
                key={pm.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Avatar
                    src={pm.author?.avatar_url}
                    alt={pm.author?.display_name || pm.author?.username}
                    size="xs"
                    radius="xl"
                  />
                  <Text size="xs" fw={500} c="var(--text-primary)" truncate style={{ flex: 1 }}>
                    {pm.author?.display_name || pm.author?.username || 'Unknown'}
                  </Text>
                  <Text size="xs" c="var(--text-muted)" style={{ flexShrink: 0, fontSize: 10 }}>
                    {formatDate(pm.created_at)}
                  </Text>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                  <MessageContent content={pm.content} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  {pm.pinned_by && (
                    <Text size="xs" c="var(--text-muted)" style={{ fontSize: 10 }}>
                      Pinned by {pm.pinned_by.username}
                    </Text>
                  )}
                  {canManageMessages && onUnpin && (
                    <Text
                      size="xs"
                      c="var(--text-muted)"
                      style={{ fontSize: 10, cursor: 'pointer' }}
                      onClick={() => onUnpin(pm.id)}
                    >
                      Unpin
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </div>
  );
}
