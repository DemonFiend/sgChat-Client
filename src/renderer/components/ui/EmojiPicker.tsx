import { useState, useMemo, useRef, useEffect } from 'react';
import { ActionIcon, ScrollArea, Text, TextInput, Tooltip } from '@mantine/core';
import { IconSearch, IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useEmojiStore, type CustomEmoji, type EmojiPack } from '../../stores/emojiStore';
import { resolveAssetUrl } from '../../lib/api';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: CustomEmoji) => void;
  anchorRef?: HTMLElement | null;
}

export function EmojiPicker({ isOpen, onClose, onSelect, anchorRef }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [collapsedPacks, setCollapsedPacks] = useState<Set<string>>(new Set());
  const manifest = useEmojiStore((s) => s.manifest);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on click outside
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          anchorRef && !anchorRef.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose, anchorRef]);

  const enabledPacks = useMemo(() => {
    if (!manifest?.master_enabled) return [];
    return manifest.packs.filter((p) => p.enabled);
  }, [manifest]);

  const emojisByPack = useMemo(() => {
    if (!manifest) return new Map<string, CustomEmoji[]>();
    const map = new Map<string, CustomEmoji[]>();
    for (const emoji of manifest.emojis) {
      const list = map.get(emoji.pack_id) || [];
      list.push(emoji);
      map.set(emoji.pack_id, list);
    }
    return map;
  }, [manifest]);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const enabledPackIds = new Set(enabledPacks.map((p) => p.id));
    return manifest?.emojis.filter((e) =>
      enabledPackIds.has(e.pack_id) && e.shortcode.toLowerCase().includes(q)
    ) || [];
  }, [search, manifest, enabledPacks]);

  const togglePack = (packId: string) => {
    setCollapsedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) next.delete(packId);
      else next.add(packId);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        bottom: 80,
        right: 80,
        width: 340,
        height: 400,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TextInput
          ref={searchInputRef}
          size="xs"
          placeholder="Search emojis..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
          variant="filled"
        />
        <ActionIcon variant="subtle" color="gray" size={24} onClick={onClose}>
          <IconX size={14} />
        </ActionIcon>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Pack sidebar */}
        <div style={{ width: 44, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '4px 0' }}>
          {enabledPacks.map((pack) => {
            const firstEmoji = emojisByPack.get(pack.id)?.[0];
            return (
              <Tooltip key={pack.id} label={pack.name} position="right" withArrow>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    margin: '2px auto',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                  className="emoji-btn"
                  onClick={() => {
                    setSearch('');
                    // Scroll to pack section
                    const el = document.getElementById(`emoji-pack-${pack.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {firstEmoji ? (
                    <img src={resolveAssetUrl(firstEmoji.image_url)} alt={pack.name} width={24} height={24} style={{ objectFit: 'contain' }} />
                  ) : (
                    <Text size="xs" c="dimmed">{pack.name.charAt(0)}</Text>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Emoji grid */}
        <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
          <div style={{ padding: 8 }}>
            {!manifest?.master_enabled && (
              <Text size="sm" c="dimmed" ta="center" py={40}>
                Custom emoji packs are disabled on this server.
              </Text>
            )}

            {manifest?.master_enabled && enabledPacks.length === 0 && !filteredEmojis && (
              <Text size="sm" c="dimmed" ta="center" py={40}>
                No emoji packs installed. Ask a server admin to add some!
              </Text>
            )}

            {/* Search results */}
            {filteredEmojis && (
              <>
                <Text size="xs" fw={600} c="dimmed" mb={4}>
                  Search results ({filteredEmojis.length})
                </Text>
                {filteredEmojis.length === 0 && (
                  <Text size="xs" c="dimmed" ta="center" py={16}>No emojis found</Text>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {filteredEmojis.map((emoji) => (
                    <EmojiButton key={emoji.id} emoji={emoji} onSelect={onSelect} />
                  ))}
                </div>
              </>
            )}

            {/* Pack sections */}
            {!filteredEmojis && enabledPacks.map((pack) => {
              const emojis = emojisByPack.get(pack.id) || [];
              const isCollapsed = collapsedPacks.has(pack.id);
              return (
                <div key={pack.id} id={`emoji-pack-${pack.id}`}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 0',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => togglePack(pack.id)}
                  >
                    {isCollapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      {pack.name} ({emojis.length})
                    </Text>
                  </div>
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 8 }}>
                      {emojis.map((emoji) => (
                        <EmojiButton key={emoji.id} emoji={emoji} onSelect={onSelect} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function EmojiButton({ emoji, onSelect }: { emoji: CustomEmoji; onSelect: (e: CustomEmoji) => void }) {
  return (
    <Tooltip label={`:${emoji.shortcode}:`} position="top" withArrow openDelay={300}>
      <div
        className="emoji-btn"
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => onSelect(emoji)}
      >
        <img
          src={resolveAssetUrl(emoji.image_url)}
          alt={emoji.shortcode}
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
          loading="lazy"
        />
      </div>
    </Tooltip>
  );
}
