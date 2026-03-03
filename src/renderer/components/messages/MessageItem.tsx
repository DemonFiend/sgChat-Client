import { Text } from '@mantine/core';
import type { Message } from '../../hooks/useMessages';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isEdited = message.updated_at && message.updated_at !== message.created_at;

  return (
    <div style={{ marginTop: 2 }}>
      <Text size="sm" style={{ color: '#dcddde', lineHeight: 1.375, wordBreak: 'break-word' }}>
        {message.content}
        {isEdited && (
          <Text component="span" size="xs" c="dimmed" ml={4}>
            (edited)
          </Text>
        )}
      </Text>

      {/* Attachments */}
      {message.attachments?.map((att, i) => (
        <div key={i} style={{ marginTop: 4 }}>
          {att.content_type?.startsWith('image/') ? (
            <img
              src={att.url}
              alt={att.filename}
              style={{
                maxWidth: 400,
                maxHeight: 300,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            />
          ) : (
            <Text
              size="sm"
              c="brand"
              component="a"
              href={att.url}
              target="_blank"
              rel="noopener"
              style={{ textDecoration: 'none' }}
            >
              {att.filename}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}
