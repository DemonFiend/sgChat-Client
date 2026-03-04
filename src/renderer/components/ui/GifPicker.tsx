import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Center, Loader, Paper, ScrollArea, Text, TextInput } from '@mantine/core';
import { IconGif, IconSearch, IconAlertTriangle, IconMoodSad } from '@tabler/icons-react';
import { api, ApiError } from '../../lib/api';

interface GifItem {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  anchorRef?: HTMLElement | null;
}

export function GifPicker({ isOpen, onClose, onSelect, anchorRef }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGifs = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = query
        ? `/api/giphy/search?q=${encodeURIComponent(query)}&limit=25`
        : `/api/giphy/trending?limit=25`;

      const data = await api.get<{ gifs?: GifItem[] }>(endpoint);
      setGifs(data?.gifs || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Rate limit exceeded. Try again in a moment.');
        } else if (err.status === 503) {
          setError('GIF feature is not available on this server.');
        } else {
          setError('Failed to load GIFs.');
        }
      } else {
        setError('Failed to load GIFs.');
      }
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trending GIFs when opened
  useEffect(() => {
    if (isOpen) {
      fetchGifs();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setGifs([]);
      setError(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchGifs(searchQuery.trim());
      }, 300);
    } else {
      fetchGifs();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleGifClick = (gif: GifItem) => {
    onSelect(gif.url);
    onClose();
    setSearchQuery('');
  };

  const getPosition = (): React.CSSProperties => {
    if (anchorRef) {
      const rect = anchorRef.getBoundingClientRect();
      const pickerWidth = 384;
      const maxLeft = window.innerWidth - pickerWidth - 16;
      const left = Math.max(16, Math.min(rect.left - pickerWidth / 2, maxLeft));

      return {
        bottom: window.innerHeight - rect.top + 8,
        left,
      };
    }
    return { bottom: 80, left: '50%', transform: 'translateX(-50%)' };
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
          width: 384,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          ...getPosition(),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGif size={20} style={{ color: 'var(--text-muted)' }} />
            <Text size="sm" fw={500}>GIFs</Text>
          </div>
          <Text size="xs" c="dimmed">Powered by GIPHY</Text>
        </div>

        {/* Search */}
        <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
          <TextInput
            ref={inputRef}
            placeholder="Search GIFs..."
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

        {/* Content */}
        <ScrollArea h={288} scrollbarSize={4} type="hover">
          <div style={{ padding: 8 }}>
            {isLoading && (
              <Center h={260}>
                <Loader size="md" color="brand" />
              </Center>
            )}

            {error && !isLoading && (
              <Center h={260}>
                <div style={{ textAlign: 'center' }}>
                  <IconAlertTriangle size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <Text size="sm" c="dimmed">{error}</Text>
                </div>
              </Center>
            )}

            {!isLoading && !error && gifs.length === 0 && (
              <Center h={260}>
                <div style={{ textAlign: 'center' }}>
                  <IconMoodSad size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <Text size="sm" c="dimmed">
                    {searchQuery ? 'No GIFs found' : 'Start typing to search GIFs'}
                  </Text>
                </div>
              </Center>
            )}

            {!isLoading && !error && gifs.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleGifClick(gif)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 8,
                      border: '2px solid transparent',
                      aspectRatio: '16/9',
                      background: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'border-color 0.15s',
                    }}
                    title={gif.title}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                      const img = e.currentTarget.querySelector('img');
                      if (img) img.src = gif.url;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                      const img = e.currentTarget.querySelector('img');
                      if (img) img.src = gif.preview;
                    }}
                  >
                    <img
                      src={gif.preview}
                      alt={gif.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </Paper>
    </div>,
    document.body,
  );
}
