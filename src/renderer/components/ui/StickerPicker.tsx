import { useRef, useEffect } from 'react';
import { ScrollArea, SimpleGrid, Text, Tooltip } from '@mantine/core';
import { useStickers, type Sticker } from '../../hooks/useStickers';
import { useUIStore } from '../../stores/uiStore';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stickerUrl: string) => void;
  anchorRef: HTMLElement | null;
}

export function StickerPicker({ isOpen, onClose, onSelect, anchorRef }: StickerPickerProps) {
  const serverId = useUIStore((s) => s.activeServerId);
  const { data: stickers, isLoading } = useStickers(serverId);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Position relative to anchor
  const rect = anchorRef?.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    width: 320,
    maxHeight: 360,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  };
  if (rect) {
    style.bottom = window.innerHeight - rect.top + 4;
    style.right = window.innerWidth - rect.right;
  }

  return (
    <div ref={panelRef} style={style}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <Text size="sm" fw={600}>Stickers</Text>
      </div>
      <ScrollArea style={{ maxHeight: 300 }}>
        {isLoading ? (
          <Text size="xs" c="dimmed" p={16} ta="center">Loading...</Text>
        ) : !stickers || stickers.length === 0 ? (
          <Text size="xs" c="dimmed" p={16} ta="center">No stickers available</Text>
        ) : (
          <SimpleGrid cols={3} spacing={8} p={8}>
            {stickers.map((s) => (
              <Tooltip key={s.id} label={s.name} position="top" withArrow>
                <div
                  style={{
                    cursor: 'pointer',
                    borderRadius: 6,
                    overflow: 'hidden',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary)',
                    border: '1px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                  onClick={() => {
                    onSelect(s.url);
                    onClose();
                  }}
                >
                  <img
                    src={s.url}
                    alt={s.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    loading="lazy"
                  />
                </div>
              </Tooltip>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>
    </div>
  );
}
