import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Group, Text, Textarea, Tooltip } from '@mantine/core';
import { IconGif, IconPaperclip, IconMoodSmile, IconSend, IconSticker, IconX, IconEyeOff, IconEye, IconFileText } from '@tabler/icons-react';
import { useSendMessage } from '../../hooks/useMessages';
import { emitTypingStart, emitTypingStop } from '../../api/socket';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';
import { GifPicker } from '../ui/GifPicker';
import { EmojiPicker } from '../ui/EmojiPicker';
import { EmojiAutocomplete } from '../ui/EmojiAutocomplete';
import { MentionAutocomplete } from '../ui/MentionAutocomplete';
import { StickerPicker } from '../ui/StickerPicker';
import { SlashCommandAutocomplete } from '../ui/SlashCommandAutocomplete';
import { useChatInputStore } from '../../stores/chatInputStore';
import type { CustomEmoji } from '../../stores/emojiStore';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  onSendOverride?: (content: string) => void;
}

export function MessageInput({ channelId, channelName, onSendOverride }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [spoilerFiles, setSpoilerFiles] = useState<Set<number>>(new Set());
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const sendMessage = useSendMessage(channelId);
  const lastTypingEmit = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const stickerBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const replyTo = useUIStore((s) => s.replyTo);
  const setReplyTo = useUIStore((s) => s.setReplyTo);
  const pendingMention = useChatInputStore((s) => s.pendingMention);
  const clearPendingMention = useChatInputStore((s) => s.clearPendingMention);

  // Focus textarea on custom event (fired by double-click on channel)
  useEffect(() => {
    const handler = () => textareaRef.current?.focus();
    window.addEventListener('focusChatInput', handler);
    return () => window.removeEventListener('focusChatInput', handler);
  }, []);

  // Inject pending mention from context menu "Mention" action
  useEffect(() => {
    if (pendingMention) {
      setContent((prev) => `${prev}<@${pendingMention.userId}> `);
      clearPendingMention();
      textareaRef.current?.focus();
    }
  }, [pendingMention, clearPendingMention]);

  const handleEmojiSelect = useCallback((emoji: CustomEmoji) => {
    const shortcode = `:${emoji.shortcode}: `;
    setContent((prev) => prev + shortcode);
    setEmojiPickerOpen(false);
  }, []);

  const handleEmojiAutocomplete = useCallback((emoji: CustomEmoji, colonStart: number, colonEnd: number) => {
    setContent((prev) => {
      const before = prev.slice(0, colonStart);
      const after = prev.slice(colonEnd);
      return `${before}:${emoji.shortcode}: ${after}`;
    });
  }, []);

  const handleMentionSelect = useCallback((wireFormat: string, triggerStart: number, triggerEnd: number) => {
    setContent((prev) => {
      const before = prev.slice(0, triggerStart);
      const after = prev.slice(triggerEnd);
      return `${before}${wireFormat}${after}`;
    });
  }, []);

  const MAX_MESSAGE_LENGTH = 2000;
  const isOverLimit = content.length > MAX_MESSAGE_LENGTH;

  // @stime transform: replace @stime <time> with <t:unixTimestamp>
  const transformStime = useCallback((text: string): string => {
    return text.replace(/@stime\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi, (_, timeStr: string) => {
      const cleaned = timeStr.trim().toLowerCase();
      let hours = 0;
      let minutes = 0;

      // Parse "3pm", "3:30pm", "3:30 PM", "15:00"
      const match12 = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
      const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);

      if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = match12[2] ? parseInt(match12[2], 10) : 0;
        if (match12[3] === 'pm' && hours !== 12) hours += 12;
        if (match12[3] === 'am' && hours === 12) hours = 0;
      } else if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
      } else {
        return _;  // no valid parse, leave as-is
      }

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return _;

      const now = new Date();
      now.setHours(hours, minutes, 0, 0);
      const timestamp = Math.floor(now.getTime() / 1000);
      return `<t:${timestamp}>`;
    });
  }, []);

  // Send content as a .txt file when over the character limit
  const handleSendAsFile = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const blob = new Blob([trimmed], { type: 'text/plain' });
    const file = new File([blob], 'message.txt', { type: 'text/plain' });

    try {
      await api.upload(`/api/channels/${channelId}/messages/upload`, file);
      setContent('');
      setReplyTo(null);
      lastTypingEmit.current = 0;
      emitTypingStop(channelId);
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Upload Failed',
        message: `Failed to send as file: ${(err as any)?.message || 'Unknown error'}`,
      });
    }
  }, [content, channelId, setReplyTo]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if ((!trimmed && files.length === 0) || sendMessage.isPending || isOverLimit) return;

    // Upload files first if any
    if (files.length > 0) {
      const failedIndexes = new Set<number>();
      for (let i = 0; i < files.length; i++) {
        try {
          const isSpoiler = spoilerFiles.has(i);
          await api.upload(`/api/channels/${channelId}/messages/upload`, files[i], isSpoiler ? { spoiler: 'true' } : undefined);
        } catch (err) {
          failedIndexes.add(i);
          toastStore.addToast({
            type: 'warning',
            title: 'Upload Failed',
            message: `${files[i].name}: ${(err as any)?.message || 'Unknown error'}`,
          });
        }
      }
      if (failedIndexes.size > 0) {
        setFiles(prev => prev.filter((_, i) => failedIndexes.has(i)));
      } else {
        setFiles([]);
        setSpoilerFiles(new Set());
      }
      if (failedIndexes.size === files.length && !trimmed) return;
    }

    if (trimmed) {
      const transformed = transformStime(trimmed);
      if (onSendOverride) {
        onSendOverride(transformed);
      } else {
        sendMessage.mutate({
          content: transformed,
          reply_to_id: replyTo?.id,
        });
      }
    }

    setContent('');
    setReplyTo(null);
    lastTypingEmit.current = 0;
    emitTypingStop(channelId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isOverLimit) handleSend();
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
    setSpoilerFiles((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  };

  const toggleSpoiler = (index: number) => {
    setSpoilerFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
              background: spoilerFiles.has(i) ? 'var(--danger-bg)' : 'var(--bg-input)',
              borderRadius: 4,
              maxWidth: 240,
              border: spoilerFiles.has(i) ? '1px solid var(--danger)' : '1px solid transparent',
            }}>
              <Tooltip label={spoilerFiles.has(i) ? 'Remove spoiler' : 'Mark as spoiler'} position="top" withArrow>
                <ActionIcon variant="subtle" color={spoilerFiles.has(i) ? 'red' : 'gray'} size={16} onClick={() => toggleSpoiler(i)}>
                  {spoilerFiles.has(i) ? <IconEyeOff size={10} /> : <IconEye size={10} />}
                </ActionIcon>
              </Tooltip>
              <Text size="xs" truncate style={{ flex: 1 }}>{spoilerFiles.has(i) ? 'SPOILER ' : ''}{file.name}</Text>
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

        <div style={{ flex: 1, position: 'relative' }}>
          <SlashCommandAutocomplete
            text={content}
            cursorPosition={cursorPos}
            onSelect={(cmd) => setContent(cmd)}
            inputRef={textareaRef}
          />
          <MentionAutocomplete
            text={content}
            cursorPosition={cursorPos}
            serverId={activeServerId}
            onSelect={handleMentionSelect}
            inputRef={textareaRef}
          />
          <EmojiAutocomplete
            text={content}
            cursorPosition={cursorPos}
            onSelect={handleEmojiAutocomplete}
            inputRef={textareaRef}
          />
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { handleChange(e.currentTarget.value); setCursorPos(e.currentTarget.selectionStart || 0); }}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
            onClick={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
            onBlur={() => { if (lastTypingEmit.current > 0) { emitTypingStop(channelId); lastTypingEmit.current = 0; } }}
            placeholder={replyTo ? `Reply to @${replyTo.author.username}` : `Message #${channelName}`}
            autosize
            minRows={1}
            maxRows={8}
            variant="unstyled"
            style={{ width: '100%' }}
            styles={{
              input: {
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                padding: '6px 0',
                minHeight: 'unset',
              },
            }}
          />
          {/* Character limit counter */}
          {content.length > 1500 && (
            <Text
              size="xs"
              style={{
                position: 'absolute',
                bottom: 2,
                right: 4,
                color: isOverLimit ? 'var(--danger, #ff4444)' : content.length >= 1800 ? '#f0ad4e' : 'var(--text-muted)',
                fontWeight: isOverLimit ? 700 : 400,
              }}
            >
              {content.length}/{MAX_MESSAGE_LENGTH}
              {isOverLimit && ' — Message too long'}
            </Text>
          )}
        </div>

        <Group gap={2}>
          <Tooltip label="Stickers" position="top" withArrow>
            <ActionIcon ref={stickerBtnRef} variant="subtle" color="gray" size={32} onClick={() => setStickerPickerOpen((v) => !v)}>
              <IconSticker size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="GIF" position="top" withArrow>
            <ActionIcon ref={gifBtnRef} variant="subtle" color="gray" size={32} onClick={() => setGifPickerOpen(true)}>
              <IconGif size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Emoji" position="top" withArrow>
            <ActionIcon ref={emojiBtnRef} variant="subtle" color="gray" size={32} onClick={() => setEmojiPickerOpen((v) => !v)}>
              <IconMoodSmile size={18} />
            </ActionIcon>
          </Tooltip>
          {isOverLimit && content.trim() && (
            <Tooltip label="Send as text file" position="top" withArrow>
              <ActionIcon
                variant="filled"
                color="yellow"
                size={32}
                onClick={handleSendAsFile}
              >
                <IconFileText size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {(content.trim() || files.length > 0) && (
            <ActionIcon
              variant="filled"
              color={isOverLimit ? 'red' : 'brand'}
              size={32}
              onClick={handleSend}
              loading={sendMessage.isPending}
              disabled={isOverLimit}
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

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={handleEmojiSelect}
        anchorRef={emojiBtnRef.current}
      />

      {/* Sticker Picker */}
      <StickerPicker
        isOpen={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        onSelect={(stickerUrl) => {
          if (onSendOverride) {
            onSendOverride(stickerUrl);
          } else {
            sendMessage.mutate({ content: stickerUrl, reply_to_id: replyTo?.id });
          }
          setReplyTo(null);
        }}
        anchorRef={stickerBtnRef.current}
      />
    </div>
  );
}
