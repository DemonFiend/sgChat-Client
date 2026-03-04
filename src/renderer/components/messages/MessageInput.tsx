import { useRef, useState } from 'react';
import { ActionIcon, Group, Text, Textarea, Tooltip, UnstyledButton } from '@mantine/core';
import { IconGif, IconPaperclip, IconMoodSmile, IconSend, IconX } from '@tabler/icons-react';
import { useSendMessage } from '../../hooks/useMessages';
import { emitTypingStart } from '../../api/socket';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import { GifPicker } from '../ui/GifPicker';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  onSendOverride?: (content: string) => void;
}

export function MessageInput({ channelId, channelName, onSendOverride }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const sendMessage = useSendMessage(channelId);
  const lastTypingEmit = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const replyTo = useUIStore((s) => s.replyTo);
  const setReplyTo = useUIStore((s) => s.setReplyTo);

  const handleSend = async () => {
    const trimmed = content.trim();
    if ((!trimmed && files.length === 0) || sendMessage.isPending) return;

    // Upload files first if any
    if (files.length > 0) {
      for (const file of files) {
        try {
          await api.upload(`/api/channels/${channelId}/messages/upload`, file);
        } catch {
          // Continue on upload errors
        }
      }
      setFiles([]);
    }

    if (trimmed) {
      if (onSendOverride) {
        onSendOverride(trimmed);
      } else {
        sendMessage.mutate({
          content: trimmed,
          reply_to_id: replyTo?.id,
        });
      }
    }

    setContent('');
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyTo) {
      setReplyTo(null);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '0 16px 16px 16px', flexShrink: 0 }}>
      {/* Reply bar */}
      {replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid var(--accent)',
        }}>
          <Text size="xs" c="dimmed" style={{ flex: 1 }} truncate>
            Replying to <Text component="span" size="xs" fw={600} style={{ color: 'var(--accent)' }}>@{replyTo.author.username}</Text>
          </Text>
          <ActionIcon variant="subtle" color="gray" size={20} onClick={() => setReplyTo(null)}>
            <IconX size={12} />
          </ActionIcon>
        </div>
      )}

      {/* File preview */}
      {files.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px',
          background: 'var(--bg-secondary)',
          borderRadius: replyTo ? 0 : '8px 8px 0 0',
          flexWrap: 'wrap',
        }}>
          {files.map((file, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              background: 'var(--bg-input)',
              borderRadius: 4,
              maxWidth: 200,
            }}>
              <Text size="xs" truncate style={{ flex: 1 }}>{file.name}</Text>
              <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(0)}KB</Text>
              <ActionIcon variant="subtle" color="gray" size={16} onClick={() => removeFile(i)}>
                <IconX size={10} />
              </ActionIcon>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        background: 'var(--bg-input)',
        borderRadius: (replyTo || files.length > 0) ? '0 0 8px 8px' : 8,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
      }}>
        <ActionIcon variant="subtle" color="gray" size={32} onClick={() => fileInputRef.current?.click()}>
          <IconPaperclip size={18} />
        </ActionIcon>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Textarea
          value={content}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Reply to @${replyTo.author.username}` : `Message #${channelName}`}
          autosize
          minRows={1}
          maxRows={8}
          variant="unstyled"
          style={{ flex: 1 }}
          styles={{
            input: {
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              padding: '6px 0',
              minHeight: 'unset',
            },
          }}
        />

        <Group gap={2}>
          <Tooltip label="GIF" position="top" withArrow>
            <ActionIcon ref={gifBtnRef} variant="subtle" color="gray" size={32} onClick={() => setGifPickerOpen(true)}>
              <IconGif size={20} />
            </ActionIcon>
          </Tooltip>
          <ActionIcon variant="subtle" color="gray" size={32}>
            <IconMoodSmile size={18} />
          </ActionIcon>
          {(content.trim() || files.length > 0) && (
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

      {/* GIF Picker */}
      <GifPicker
        isOpen={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={(gifUrl) => {
          if (onSendOverride) {
            onSendOverride(gifUrl);
          } else {
            sendMessage.mutate({ content: gifUrl, reply_to_id: replyTo?.id });
          }
          setReplyTo(null);
        }}
        anchorRef={gifBtnRef.current}
      />
    </div>
  );
}
