import { useRef, useState } from 'react';
import { ActionIcon, Button, Group, Modal, Text, Textarea, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowBackUp, IconEdit, IconMoodSmile, IconPin, IconPinnedOff, IconTrash } from '@tabler/icons-react';
import { useEditMessage, useDeleteMessage, useAddReaction, useRemoveReaction, usePinMessage, useUnpinMessage, type Message } from '../../hooks/useMessages';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { MessageContent } from '../ui/MessageContent';
import { ReactionPicker } from '../ui/ReactionPicker';
import { ReactionDisplay } from '../ui/ReactionDisplay';

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

  const isOwn = currentUser?.id === message.author?.id;
  const isSystemMessage = !!message.system_event || !message.author;
  const isEdited = message.edited_at && message.edited_at !== message.created_at;

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

  const handleReactionToggle = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeReaction.mutate({ messageId: message.id, emoji });
    } else {
      addReaction.mutate({ messageId: message.id, emoji });
    }
  };

  return (
    <div style={{ marginTop: 2, position: 'relative' }}>
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

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <ReactionDisplay reactions={message.reactions} onToggle={handleReactionToggle} />
      )}

      {/* Reaction picker */}
      <ReactionPicker
        isOpen={reactionPickerOpen}
        onClose={() => setReactionPickerOpen(false)}
        onSelect={(emoji) => handleReactionToggle(emoji, false)}
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
