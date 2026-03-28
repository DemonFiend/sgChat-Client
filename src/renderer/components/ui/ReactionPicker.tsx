import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Paper, ScrollArea, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEmojiStore, type CustomEmoji, type EmojiPack } from '../../stores/emojiStore';
import { resolveAssetUrl } from '../../lib/api';

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
  onSelect: (emoji: string, customEmojiId?: string) => void;
  anchorRef?: HTMLElement | null;
  position?: { x: number; y: number };
  serverId?: string;
}

interface SidebarCategory {
  id: string;
  label: string;
  items: { id: string; label: string }[];
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      style={{
        width: 12,
        height: 12,
        flexShrink: 0,
        transition: 'transform 0.15s',
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ReactionPicker({
  isOpen,
  onClose,
  onSelect,
  anchorRef,
  position,
  serverId,
}: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const manifest = useEmojiStore((s) => s.manifest);
  const packs = manifest?.packs || [];
  const customEmojis = manifest?.emojis || [];
  const hasCustomPacks = manifest?.master_enabled && packs.length > 0;

  // Build hierarchical categories from packs
  const categories = useMemo<SidebarCategory[]>(() => {
    if (!hasCustomPacks) return [];

    const catMap = new Map<string, SidebarCategory>();
    for (const pack of packs) {
      const catName = pack.name.split('/')[0] || 'Custom';
      if (!catMap.has(catName)) {
        catMap.set(catName, { id: catName, label: catName, items: [] });
      }
      catMap.get(catName)!.items.push({ id: pack.id, label: pack.name });
    }
    return Array.from(catMap.values());
  }, [packs, hasCustomPacks]);

  // Unicode fallback categories (when no custom packs)
  const unicodeMode = !hasCustomPacks;
  const [activeUnicodeCategory, setActiveUnicodeCategory] = useState(EMOJI_CATEGORIES[0]?.name || '');

  // Packs in the active category
  const activeCategoryPacks = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategoryId);
    if (!cat) return [];
    return cat.items;
  }, [categories, activeCategoryId]);

  // Reset state when picker opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Initialize active category and expand all packs
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      if (!categories.some((c) => c.id === activeCategoryId)) {
        setActiveCategoryId(categories[0].id);
      }
      const allPackIds = categories.flatMap((c) => c.items.map((i) => i.id));
      setExpandedPacks(new Set(allPackIds));
    }
  }, [isOpen, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePack = (packId: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  // Search results across custom + unicode
  const searchResults = useMemo(() => {
    if (!searchQuery) return { custom: [] as CustomEmoji[], unicode: [] as string[] };
    const q = searchQuery.toLowerCase();
    const custom = hasCustomPacks
      ? customEmojis.filter((e) => e.shortcode.toLowerCase().includes(q))
      : [];
    const unicode = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return { custom, unicode };
  }, [searchQuery, hasCustomPacks, customEmojis]);

  const handleEmojiClick = (emoji: string, customEmojiId?: string) => {
    onSelect(emoji, customEmojiId);
    onClose();
  };

  const getPositionStyle = (): React.CSSProperties => {
    if (anchorRef) {
      const rect = anchorRef.getBoundingClientRect();
      const pickerWidth = 420;
      const pickerHeight = 420;

      let right = Math.max(8, window.innerWidth - rect.right);
      if (window.innerWidth - right - pickerWidth < 8) {
        right = window.innerWidth - pickerWidth - 8;
      }

      let bottom = window.innerHeight - rect.top + 8;
      if (bottom + pickerHeight > window.innerHeight - 8) {
        bottom = window.innerHeight - rect.bottom - 8;
      }

      return { position: 'fixed', bottom, right, zIndex: 60 };
    }
    if (position) {
      return {
        position: 'fixed',
        bottom: Math.max(8, window.innerHeight - position.y),
        right: Math.max(8, window.innerWidth - position.x),
        zIndex: 60,
      };
    }
    return { position: 'fixed', bottom: 80, right: 20, zIndex: 60 };
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={onClose}>
      <Paper
        shadow="xl"
        radius="md"
        style={{
          ...getPositionStyle(),
          width: 420,
          height: 420,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div style={{ padding: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <TextInput
            ref={inputRef}
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

        {/* Body: sidebar + content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <ScrollArea style={{ width: 112, flexShrink: 0, borderRight: '1px solid var(--border)' }} scrollbarSize={4} type="hover">
            {unicodeMode ? (
              EMOJI_CATEGORIES.map((cat) => (
                <UnstyledButton
                  key={cat.name}
                  onClick={() => {
                    setActiveUnicodeCategory(cat.name);
                    setSearchQuery('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: 12,
                    textAlign: 'left',
                    fontWeight: activeUnicodeCategory === cat.name ? 600 : 400,
                    color: activeUnicodeCategory === cat.name ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: activeUnicodeCategory === cat.name ? 'var(--bg-modifier-selected, var(--bg-tertiary))' : 'transparent',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                >
                  {cat.name}
                </UnstyledButton>
              ))
            ) : (
              categories.map((cat) => (
                <UnstyledButton
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setSearchQuery('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: 12,
                    textAlign: 'left',
                    fontWeight: activeCategoryId === cat.id ? 600 : 400,
                    color: activeCategoryId === cat.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: activeCategoryId === cat.id ? 'var(--bg-modifier-selected, var(--bg-tertiary))' : 'transparent',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                >
                  {cat.label}
                </UnstyledButton>
              ))
            )}
          </ScrollArea>

          {/* Right panel */}
          <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
            <div style={{ padding: 8 }}>
              {searchQuery ? (
                <>
                  {/* Search results */}
                  {hasCustomPacks && searchResults.custom.length > 0 && (
                    <>
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
                        Custom ({searchResults.custom.length})
                      </Text>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
                        {searchResults.custom.map((ce) => (
                          <UnstyledButton
                            key={ce.id}
                            onClick={() => handleEmojiClick(`:${ce.shortcode}:`, ce.id)}
                            title={`:${ce.shortcode}:`}
                            style={{
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 4,
                            }}
                            className="emoji-btn"
                          >
                            <img
                              src={resolveAssetUrl(ce.image_url)}
                              alt={`:${ce.shortcode}:`}
                              style={{ width: 24, height: 24, objectFit: 'contain' }}
                              loading="lazy"
                            />
                          </UnstyledButton>
                        ))}
                      </div>
                    </>
                  )}
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
                    Unicode
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {searchResults.unicode.map((emoji, i) => (
                      <UnstyledButton
                        key={`${emoji}-${i}`}
                        onClick={() => handleEmojiClick(emoji)}
                        title={emoji}
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
                  {hasCustomPacks && searchResults.custom.length === 0 && (
                    <Text size="xs" c="dimmed" ta="center" py={8}>
                      No custom emojis found
                    </Text>
                  )}
                </>
              ) : unicodeMode ? (
                /* Unicode mode */
                <>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6} px={4}>
                    {activeUnicodeCategory}
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {(EMOJI_CATEGORIES.find((c) => c.name === activeUnicodeCategory)?.emojis || []).map(
                      (emoji, i) => (
                        <UnstyledButton
                          key={`${emoji}-${i}`}
                          onClick={() => handleEmojiClick(emoji)}
                          title={emoji}
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
                      ),
                    )}
                  </div>
                </>
              ) : (
                /* Custom mode — collapsible pack sections */
                <>
                  {activeCategoryPacks.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128 }}>
                      <Text size="sm" c="dimmed">No packs in this category</Text>
                    </div>
                  )}
                  {activeCategoryPacks.map((pack) => {
                    const isExpanded = expandedPacks.has(pack.id);
                    const packEmojis = customEmojis.filter((e) => e.pack_id === pack.id);
                    return (
                      <div key={pack.id} style={{ marginBottom: 4 }}>
                        <UnstyledButton
                          onClick={() => togglePack(pack.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 4px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            borderRadius: 4,
                            transition: 'color 0.15s, background 0.15s',
                          }}
                          className="emoji-btn"
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pack.label}</span>
                          <ChevronIcon expanded={isExpanded} />
                        </UnstyledButton>

                        {isExpanded && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, paddingBottom: 4 }}>
                            {packEmojis.map((ce) => (
                              <UnstyledButton
                                key={ce.id}
                                onClick={() => handleEmojiClick(`:${ce.shortcode}:`, ce.id)}
                                title={`:${ce.shortcode}:`}
                                style={{
                                  width: 32,
                                  height: 32,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 4,
                                }}
                                className="emoji-btn"
                              >
                                <img
                                  src={resolveAssetUrl(ce.image_url)}
                                  alt={`:${ce.shortcode}:`}
                                  style={{ width: 24, height: 24, objectFit: 'contain' }}
                                  loading="lazy"
                                />
                              </UnstyledButton>
                            ))}
                            {packEmojis.length === 0 && (
                              <Text size="xs" c="dimmed" ta="center" py={8} style={{ gridColumn: 'span 7' }}>
                                No emojis in this pack
                              </Text>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </Paper>
    </div>,
    document.body,
  );
}
