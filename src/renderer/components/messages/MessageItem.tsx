import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionIcon, Button, Group, Image, Modal, Text, Textarea, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowBackUp, IconCopy, IconEdit, IconExternalLink, IconLink, IconMessage2, IconMoodSmile, IconPin, IconPinnedOff, IconTrash } from '@tabler/icons-react';
import { useEditMessage, useDeleteMessage, useAddReaction, useRemoveReaction, usePinMessage, useUnpinMessage, type Message } from '../../hooks/useMessages';
import { useCreateThread } from '../../hooks/useThreads';
import { useMessagePreview } from '../../hooks/useServerInfo';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { MessageContent, AttachmentCard } from '../ui/MessageContent';
import { ReactionPicker } from '../ui/ReactionPicker';
import { ReactionDisplay } from '../ui/ReactionDisplay';
import { isImageUrl } from '../../lib/imageUtils';

interface MessageItemProps {
  message: Message;
  channelId: string;
  hovered?: boolean;
}

export function MessageItem({ message, channelId, hovered }: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const reactionBtnRef = useRef<HTMLButtonElement>(null);
  const currentUser = useAuthStore((s) => s.user);
  const setReplyTo = useUIStore((s) => s.setReplyTo);

  const editMessage = useEditMessage(channelId);
  const deleteMessage = useDeleteMessage(channelId);
  const addReaction = useAddReaction(channelId);
  const removeReaction = useRemoveReaction(channelId);
  const pinMessage = usePinMessage(channelId);
  const unpinMessage = useUnpinMessage(channelId);
  const createThread = useCreateThread();
  const openThread = useUIStore((s) => s.openThread);

  const isOwn = currentUser?.id === message.author?.id;
  const isSystemMessage = !!message.system_event || !message.author;
  const isEdited = message.edited_at && message.edited_at !== message.created_at;

  // TTS playback for incoming TTS messages
  const ttsPlayedRef = useRef(false);
  useEffect(() => {
    if (message.is_tts && !ttsPlayedRef.current && 'speechSynthesis' in window) {
      ttsPlayedRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [message.is_tts, message.content]);

  const handleStartEdit = () => {
    setEditContent(message.content);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    editMessage.mutate({ messageId: message.id, content: trimmed }, {
      onSuccess: () => setEditing(false),
    });
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleDelete = () => {
    deleteMessage.mutate(message.id, {
      onSuccess: () => setDeleteModalOpen(false),
    });
  };

  const handleReply = () => {
    setReplyTo({
      id: message.id,
      content: message.content,
      author: { id: message.author?.id ?? '', username: message.author?.username ?? 'Unknown' },
    });
  };

  // Detect non-image URLs for embed previews
  const hasNonImageUrl = useMemo(() => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = message.content.match(urlRegex);
    if (!matches) return false;
    return matches.some((url) => !isImageUrl(url));
  }, [message.content]);

  // ── Context menu ──────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isSystemMessage || editing) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [isSystemMessage, editing]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setContextMenu(null);
  }, [message.content]);

  const handleCopyMessageLink = useCallback(() => {
    navigator.clipboard.writeText(`sgchat://message/${channelId}/${message.id}`);
    setContextMenu(null);
  }, [channelId, message.id]);

  // Close context menu on scroll or outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('mousedown', close);
    };
  }, [contextMenu]);

  const handleReactionToggle = (emoji: string, hasReacted: boolean, type?: 'unicode' | 'custom', emojiId?: string) => {
    if (hasReacted) {
      removeReaction.mutate({ messageId: message.id, emoji, type, emojiId });
    } else {
      addReaction.mutate({ messageId: message.id, emoji, type, emojiId });
    }
  };

  return (
    <div style={{ marginTop: 2, position: 'relative' }} onContextMenu={handleContextMenu}>
      {/* Right-click context menu */}
      {contextMenu && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            minWidth: 180,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          }}
        >
          <ContextMenuItem icon={<IconCopy size={14} />} label="Copy Text" onClick={handleCopyText} />
          <ContextMenuItem icon={<IconLink size={14} />} label="Copy Message Link" onClick={handleCopyMessageLink} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <ContextMenuItem icon={<IconArrowBackUp size={14} />} label="Reply" onClick={() => { handleReply(); closeContextMenu(); }} />
          <ContextMenuItem
            icon={message.pinned ? <IconPinnedOff size={14} /> : <IconPin size={14} />}
            label={message.pinned ? 'Unpin Message' : 'Pin Message'}
            onClick={() => { (message.pinned ? unpinMessage : pinMessage).mutate(message.id); closeContextMenu(); }}
          />
          {isOwn && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <ContextMenuItem icon={<IconEdit size={14} />} label="Edit Message" onClick={() => { handleStartEdit(); closeContextMenu(); }} />
              <ContextMenuItem icon={<IconTrash size={14} />} label="Delete Message" danger onClick={() => { setDeleteModalOpen(true); closeContextMenu(); }} />
            </>
          )}
        </div>,
        document.body,
      )}

      {/* Reply reference */}
      {message.reply_to && (
        <Group gap={6} mb={2} style={{ paddingLeft: 2 }}>
          <div style={{
            width: 2,
            height: 12,
            borderRadius: 1,
            background: 'var(--text-muted)',
            flexShrink: 0,
          }} />
          <Text size="xs" c="dimmed" truncate>
            <Text component="span" size="xs" fw={600} c="dimmed">@{message.reply_to.author.username}</Text>
            {' '}{message.reply_to.content.slice(0, 80)}{message.reply_to.content.length > 80 ? '...' : ''}
          </Text>
        </Group>
      )}

      {/* Action toolbar (shows on hover, hidden for system messages) */}
      {hovered && !editing && !isSystemMessage && (
        <Group
          gap={2}
          style={{
            position: 'absolute',
            right: 0,
            top: -12,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px',
            zIndex: 10,
          }}
        >
          <Tooltip label="Reply" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={24} onClick={handleReply}>
              <IconArrowBackUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="React" position="top" withArrow>
            <ActionIcon ref={reactionBtnRef} variant="subtle" color="gray" size={24} onClick={() => setReactionPickerOpen(true)}>
              <IconMoodSmile size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Create Thread" position="top" withArrow>
            <ActionIcon variant="subtle" color="gray" size={24} onClick={() => {
              const name = `Thread: ${message.content.slice(0, 40)}${message.content.length > 40 ? '...' : ''}`;
              createThread.mutate(
                { parent_message_id: message.id, channel_id: channelId, name },
                { onSuccess: (thread) => { if (thread?.id) openThread(thread.id); } },
              );
            }}>
              <IconMessage2 size={14} />
            </ActionIcon>
          </Tooltip>
          {message.pinned ? (
            <Tooltip label="Unpin" position="top" withArrow>
              <ActionIcon variant="subtle" color="yellow" size={24} onClick={() => unpinMessage.mutate(message.id)}>
                <IconPinnedOff size={14} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Pin" position="top" withArrow>
              <ActionIcon variant="subtle" color="gray" size={24} onClick={() => pinMessage.mutate(message.id)}>
                <IconPin size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {isOwn && (
            <>
              <Tooltip label="Edit" position="top" withArrow>
                <ActionIcon variant="subtle" color="gray" size={24} onClick={handleStartEdit}>
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete" position="top" withArrow>
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => setDeleteModalOpen(true)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      )}

      {/* Message content or edit mode */}
      {editing ? (
        <div style={{ marginTop: 4 }}>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
              if (e.key === 'Escape') handleCancelEdit();
            }}
            autosize
            minRows={1}
            maxRows={8}
            autoFocus
            styles={{
              input: {
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                border: '1px solid var(--accent)',
              },
            }}
          />
          <Group gap={4} mt={4}>
            <Text size="xs" c="dimmed">
              escape to <UnstyledButton onClick={handleCancelEdit} style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>cancel</UnstyledButton>
              {' • '}enter to <UnstyledButton onClick={handleSaveEdit} style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>save</UnstyledButton>
            </Text>
          </Group>
        </div>
      ) : (
        <Text size="sm" style={{ color: 'var(--text-primary)', lineHeight: 1.375, wordBreak: 'break-word' }}>
          <MessageContent content={message.content} isOwnMessage={isOwn} />
          {isEdited && (
            <Text component="span" size="xs" c="dimmed" ml={4}>
              (edited)
            </Text>
          )}
        </Text>
      )}

      {/* Attachments */}
      {(Array.isArray(message.attachments) ? message.attachments : []).map((att, i) => (
        <div key={i} style={{ marginTop: 4 }}>
          {att.mime_type?.startsWith('image/') ? (
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
            <AttachmentCard attachment={att} />
          )}
        </div>
      ))}

      {/* URL embed preview */}
      {hasNonImageUrl && <EmbedPreview messageId={message.id} />}

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <ReactionDisplay reactions={message.reactions} onToggle={handleReactionToggle} />
      )}

      {/* Reaction picker */}
      <ReactionPicker
        isOpen={reactionPickerOpen}
        onClose={() => setReactionPickerOpen(false)}
        onSelect={(emoji, customEmojiId) => handleReactionToggle(emoji, false, customEmojiId ? 'custom' : 'unicode', customEmojiId)}
        anchorRef={reactionBtnRef.current}
      />

      {/* Delete confirmation modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Message"
        centered
        size="sm"
      >
        <Text size="sm" mb={12}>Are you sure you want to delete this message? This cannot be undone.</Text>
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 4,
          padding: '8px 12px',
          marginBottom: 16,
          borderLeft: '3px solid var(--border)',
        }}>
          <Text size="xs" fw={600} mb={2}>{message.author?.username ?? 'Unknown'}</Text>
          <Text size="xs" c="dimmed" lineClamp={3}>{message.content}</Text>
        </div>
        <Group justify="flex-end" gap={8}>
          <Button variant="subtle" color="gray" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleteMessage.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  );
}

function ContextMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        cursor: 'pointer',
        color: danger ? 'var(--mantine-color-red-5)' : 'var(--text-primary)',
        fontSize: '0.8125rem',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'var(--mantine-color-red-9)' : 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      {label}
    </div>
  );
}

function EmbedPreview({ messageId }: { messageId: string }) {
  const { data: preview } = useMessagePreview(messageId);

  if (!preview || (!preview.title && !preview.description)) return null;

  return (
    <div
      style={{
        marginTop: 6,
        maxWidth: 420,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      {preview.image && (
        <Image
          src={preview.image}
          alt=""
          mah={180}
          fit="cover"
          style={{ borderBottom: '1px solid var(--border)' }}
          fallbackSrc=""
        />
      )}
      <div style={{ padding: '10px 12px' }}>
        {preview.site_name && (
          <Text size="xs" c="dimmed" mb={2} tt="uppercase" fw={600} style={{ letterSpacing: '0.3px' }}>
            {preview.site_name}
          </Text>
        )}
        {preview.title && (
          <Text
            size="sm"
            fw={600}
            lineClamp={2}
            component="a"
            href={preview.url}
            target="_blank"
            rel="noopener"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'block',
              marginBottom: 4,
            }}
          >
            {preview.title}
            <IconExternalLink size={12} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle', opacity: 0.6 }} />
          </Text>
        )}
        {preview.description && (
          <Text size="xs" c="dimmed" lineClamp={3} style={{ lineHeight: 1.4 }}>
            {preview.description}
          </Text>
        )}
      </div>
    </div>
  );
}
