import { useRef, useState } from 'react';
import { ActionIcon, Group, Textarea } from '@mantine/core';
import { IconPaperclip, IconMoodSmile, IconSend } from '@tabler/icons-react';
import { useSendMessage } from '../../hooks/useMessages';
import { emitTypingStart } from '../../api/socket';

interface MessageInputProps {
  channelId: string;
  channelName: string;
}

export function MessageInput({ channelId, channelName }: MessageInputProps) {
  const [content, setContent] = useState('');
  const sendMessage = useSendMessage(channelId);
  const lastTypingEmit = useRef(0);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (val: string) => {
    setContent(val);

    // Rate-limited typing indicator
    const now = Date.now();
    if (now - lastTypingEmit.current > 3000) {
      lastTypingEmit.current = now;
      emitTypingStart(channelId);
    }
  };

  return (
    <div style={{ padding: '0 16px 16px 16px', flexShrink: 0 }}>
      <div style={{
        background: '#383a40',
        borderRadius: 8,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
      }}>
        <ActionIcon variant="subtle" color="gray" size={32}>
          <IconPaperclip size={18} />
        </ActionIcon>

        <Textarea
          value={content}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          autosize
          minRows={1}
          maxRows={8}
          variant="unstyled"
          style={{ flex: 1 }}
          styles={{
            input: {
              color: '#dcddde',
              fontSize: '0.9rem',
              padding: '6px 0',
              minHeight: 'unset',
            },
          }}
        />

        <Group gap={2}>
          <ActionIcon variant="subtle" color="gray" size={32}>
            <IconMoodSmile size={18} />
          </ActionIcon>
          {content.trim() && (
            <ActionIcon
              variant="filled"
              color="brand"
              size={32}
              onClick={handleSend}
              loading={sendMessage.isPending}
            >
              <IconSend size={16} />
            </ActionIcon>
          )}
        </Group>
      </div>
    </div>
  );
}
