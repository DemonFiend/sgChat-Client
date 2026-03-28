import { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconLink } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface JoinServerModalProps {
  opened: boolean;
  onClose: () => void;
  onJoined?: (server: { id: string; name: string }) => void;
}

/**
 * Parse an invite code from a raw input string.
 * Accepts:
 *   - bare code: "ABC123"
 *   - full URL: "https://chat.example.com/invite/ABC123"
 *   - URL with query: "https://example.com/invite/ABC123?ref=share"
 */
function parseInviteCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Try to extract from URL path: /invite/<code>
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/invite\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  } catch {
    // Not a URL — treat as bare code
  }

  // Also handle partial paths like "invite/ABC123"
  const pathMatch = trimmed.match(/invite\/([A-Za-z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  // Bare code
  return trimmed;
}

export function JoinServerModal({ opened, onClose, onJoined }: JoinServerModalProps) {
  const [inviteInput, setInviteInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const code = parseInviteCode(inviteInput);
    if (!code) return;

    setJoining(true);
    setError('');
    try {
      const res = await api.post<{ id: string; name: string }>('/api/servers/join', {
        invite_code: code,
      });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      onJoined?.(res);
      setInviteInput('');
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to join server';
      setError(message);
    } finally {
      setJoining(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !joining) handleJoin();
  };

  const handleClose = () => {
    setInviteInput('');
    setError('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Join a Server"
      centered
      size="sm"
    >
      <Stack gap={16}>
        <Text size="sm" c="dimmed">
          Enter an invite link or invite code to join an existing server.
        </Text>

        <TextInput
          label="Invite Link or Code"
          placeholder="https://example.com/invite/ABC123 or ABC123"
          value={inviteInput}
          onChange={(e) => setInviteInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          autoFocus
          leftSection={<IconLink size={16} />}
        />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap={8}>
          <Button variant="subtle" color="gray" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            loading={joining}
            disabled={!inviteInput.trim()}
          >
            Join Server
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
