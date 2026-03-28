import { useState, useRef, useEffect } from 'react';
import { Group, Stack, Text, Button, Avatar, Alert, Loader } from '@mantine/core';
import { IconCamera, IconTrash, IconUpload } from '@tabler/icons-react';
import { api } from '../../lib/api';

const electronAPI = (window as any).electronAPI;

/** Default avatar size limit in bytes (5 MB). Overridden by server config if available. */
const DEFAULT_AVATAR_LIMIT = 5 * 1024 * 1024;

interface AvatarPickerProps {
  currentAvatarUrl?: string | null;
  username?: string;
  displayName?: string;
  onAvatarChange?: (newUrl: string | null) => void;
}

export function AvatarPicker({ currentAvatarUrl, username, displayName, onAvatarChange }: AvatarPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [maxBytes, setMaxBytes] = useState(DEFAULT_AVATAR_LIMIT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic upload limit from server config
  useEffect(() => {
    let cancelled = false;
    async function fetchLimits() {
      try {
        const config = await api.get<{ avatar_max_bytes?: number }>('/api/server/upload-limits');
        if (!cancelled && config.avatar_max_bytes && config.avatar_max_bytes > 0) {
          setMaxBytes(config.avatar_max_bytes);
        }
      } catch {
        // Server may not expose this endpoint yet — keep default
      }
    }
    fetchLimits();
    return () => { cancelled = true; };
  }, []);

  const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);

  const handleFileSelect = async (file: File) => {
    setError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    if (file.size > maxBytes) {
      setError(`File too large. Maximum size: ${maxMB} MB`);
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      // Convert to base64 for IPC transfer
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const res = await electronAPI.api.request('PUT', '/api/users/me/avatar', {
        data: base64,
        contentType: file.type,
      });
      if (res.ok) {
        setPreviewUrl(null);
        onAvatarChange?.(res.data.avatar_url);
      } else {
        setError(res.data?.message || 'Failed to upload avatar');
        setPreviewUrl(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await electronAPI.api.request('DELETE', '/api/users/me/avatar');
      if (res.ok) {
        onAvatarChange?.(null);
      } else {
        setError(res.data?.message || 'Failed to remove avatar');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const initials = (displayName || username || '?')[0].toUpperCase();

  return (
    <Stack gap="sm">
      <Group gap="lg" align="flex-start">
        {/* Avatar with drag-and-drop */}
        <div
          style={{
            position: 'relative',
            cursor: 'pointer',
            borderRadius: '50%',
            outline: dragOver ? '3px solid var(--accent)' : 'none',
            outlineOffset: 2,
          }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar
            src={displayUrl}
            alt={displayName || username || 'User'}
            size={80}
            radius="xl"
            color="brand"
            style={{ opacity: isUploading || dragOver ? 0.5 : 1, transition: 'opacity 150ms' }}
          >
            {initials}
          </Avatar>

          {/* Hover overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUploading ? 1 : 0,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { if (!isUploading) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!isUploading) e.currentTarget.style.opacity = '0'; }}
          >
            {isUploading ? <Loader size="sm" color="white" /> : <IconCamera size={24} color="white" />}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>

        {/* Instructions and actions */}
        <Stack gap="xs" style={{ flex: 1 }}>
          <div>
            <Text size="sm" fw={500}>Click or drag to upload</Text>
            <Text size="xs" c="dimmed">JPEG, PNG, GIF, or WebP. Max {maxMB} MB.</Text>
          </div>
          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconUpload size={14} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              loading={isUploading}
            >
              Change Avatar
            </Button>
            {displayUrl && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleDelete}
                disabled={isDeleting || isUploading}
                loading={isDeleting}
              >
                Remove
              </Button>
            )}
          </Group>
        </Stack>
      </Group>

      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
