import { useState, useEffect, useRef, useMemo } from 'react';
import { Text } from '@mantine/core';
import { useEmojiStore, type CustomEmoji } from '../../stores/emojiStore';

interface EmojiAutocompleteProps {
  /** Full input text */
  text: string;
  /** Cursor position in text */
  cursorPosition: number;
  /** Called when user selects an emoji */
  onSelect: (emoji: CustomEmoji, colonStart: number, colonEnd: number) => void;
  /** Anchor element for positioning */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function EmojiAutocomplete({ text, cursorPosition, onSelect, inputRef }: EmojiAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchEmojis = useEmojiStore((s) => s.searchEmojis);
  const listRef = useRef<HTMLDivElement>(null);

  // Extract the partial shortcode before cursor (after last ':')
  const { query, colonStart } = useMemo(() => {
    const beforeCursor = text.slice(0, cursorPosition);
    const lastColon = beforeCursor.lastIndexOf(':');
    if (lastColon === -1) return { query: null, colonStart: -1 };

    const partial = beforeCursor.slice(lastColon + 1);
    // Don't trigger if there's a space before the colon (unless it's at the start)
    if (lastColon > 0 && text[lastColon - 1] !== ' ' && text[lastColon - 1] !== '\n') {
      return { query: null, colonStart: -1 };
    }
    // Need at least 2 chars to search
    if (partial.length < 2) return { query: null, colonStart: -1 };
    // No spaces in shortcode
    if (partial.includes(' ')) return { query: null, colonStart: -1 };

    return { query: partial, colonStart: lastColon };
  }, [text, cursorPosition]);

  const results = useMemo(() => {
    if (!query) return [];
    return searchEmojis(query).slice(0, 10);
  }, [query, searchEmojis]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // Keyboard navigation
  useEffect(() => {
    if (results.length === 0 || !inputRef?.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (results.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(results[selectedIndex], colonStart, cursorPosition);
        }
      } else if (e.key === 'Escape') {
        // Let parent handle escape
      }
    };

    const el = inputRef.current;
    el.addEventListener('keydown', handleKeyDown, true);
    return () => el.removeEventListener('keydown', handleKeyDown, true);
  }, [results, selectedIndex, colonStart, cursorPosition, onSelect, inputRef]);

  if (results.length === 0) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        zIndex: 100,
        maxHeight: 240,
        overflowY: 'auto',
      }}
    >
      {results.map((emoji, i) => (
        <div
          key={emoji.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            cursor: 'pointer',
            background: i === selectedIndex ? 'var(--bg-hover)' : 'transparent',
          }}
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(emoji, colonStart, cursorPosition);
          }}
        >
          <img
            src={emoji.image_url}
            alt={emoji.shortcode}
            width={20}
            height={20}
            style={{ objectFit: 'contain' }}
          />
          <Text size="sm">:{emoji.shortcode}:</Text>
        </div>
      ))}
    </div>
  );
}
