import { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Paper, ScrollArea, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👀', '💯'];

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: 'Objects',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💫', '✨', '🔥', '💥', '💢', '💯', '💤', '💨', '💦', '🎵', '🎶', '🔔', '🔕', '📢', '📣'],
  },
  {
    name: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄'],
  },
];

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorRef?: HTMLElement | null;
  position?: { x: number; y: number };
}

const GRID_COLS = 8;

export function ReactionPicker({ isOpen, onClose, onSelect, anchorRef, position }: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return null;
    return EMOJI_CATEGORIES.flatMap((cat) => cat.emojis);
  }, [searchQuery]);

  const currentEmojis = filteredEmojis || EMOJI_CATEGORIES[activeCategory]?.emojis || [];

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
    setSearchQuery('');
  };

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = currentEmojis.length;
      if (total === 0) return;

      let next = focusedIndex;

      switch (e.key) {
        case 'ArrowRight': next = Math.min(focusedIndex + 1, total - 1); break;
        case 'ArrowLeft': next = Math.max(focusedIndex - 1, 0); break;
        case 'ArrowDown': next = Math.min(focusedIndex + GRID_COLS, total - 1); break;
        case 'ArrowUp': next = Math.max(focusedIndex - GRID_COLS, 0); break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < total) {
            e.preventDefault();
            handleEmojiClick(currentEmojis[focusedIndex]);
          }
          return;
        default:
          return;
      }

      e.preventDefault();
      setFocusedIndex(next);

      const buttons = gridRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      buttons?.[next]?.focus();
    },
    [focusedIndex, currentEmojis],
  );

  const getPosition = (): React.CSSProperties => {
    if (position) {
      return { top: position.y, left: position.x };
    }
    if (anchorRef) {
      const rect = anchorRef.getBoundingClientRect();
      return {
        top: rect.top - 380,
        left: Math.max(8, rect.left - 150),
      };
    }
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      onClick={onClose}
    >
      <Paper
        shadow="xl"
        radius="md"
        style={{
          position: 'absolute',
          width: 320,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          ...getPosition(),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
          <TextInput
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            size="xs"
            styles={{
              input: {
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </div>

        {/* Quick Access */}
        <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
            Quick Reactions
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {QUICK_EMOJIS.map((emoji) => (
              <UnstyledButton
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  borderRadius: 4,
                }}
                className="emoji-btn"
              >
                {emoji}
              </UnstyledButton>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}>
          {EMOJI_CATEGORIES.map((category, index) => (
            <UnstyledButton
              key={category.name}
              onClick={() => setActiveCategory(index)}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                color: activeCategory === index ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeCategory === index ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {category.name}
            </UnstyledButton>
          ))}
        </div>

        {/* Emoji Grid */}
        <ScrollArea h={192} scrollbarSize={4} type="hover">
          <div
            ref={gridRef}
            style={{ padding: 8 }}
            role="listbox"
            aria-label="Emojis"
            onKeyDown={handleGridKeyDown}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gap: 4,
            }}>
              {currentEmojis.map((emoji, i) => (
                <UnstyledButton
                  key={`${emoji}-${i}`}
                  role="option"
                  aria-selected={focusedIndex === i}
                  tabIndex={focusedIndex === i ? 0 : -1}
                  onClick={() => handleEmojiClick(emoji)}
                  onFocus={() => setFocusedIndex(i)}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    borderRadius: 4,
                    outline: focusedIndex === i ? '2px solid var(--accent)' : 'none',
                  }}
                  className="emoji-btn"
                >
                  {emoji}
                </UnstyledButton>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Paper>
    </div>,
    document.body,
  );
}
