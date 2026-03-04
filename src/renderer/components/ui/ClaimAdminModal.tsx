import { useState } from 'react';
import { Alert, Button, Center, Group, Modal, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconLock } from '@tabler/icons-react';
import { api } from '../../lib/api';

interface ClaimAdminModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClaimAdminModal({ opened, onClose, onSuccess }: ClaimAdminModalProps) {
  const [claimCode, setClaimCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = claimCode.trim();
    if (!code) {
      setError('Please enter the claim code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/claim-admin', { code });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      const message = err?.message || 'Failed to claim ownership';
      if (message.includes('already been claimed')) {
        setError('This server has already been claimed by another user');
      } else if (message.includes('Invalid')) {
        setError('Invalid claim code. Please check and try again.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setClaimCode('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Claim Server Ownership" centered size="sm">
      <Stack gap={16}>
        {success ? (
          <Center py={32}>
            <Stack align="center" gap={12}>
              <ThemeIcon size={64} radius="xl" color="green" variant="light">
                <IconCheck size={32} />
              </ThemeIcon>
              <Text size="xl" fw={600}>Ownership Claimed!</Text>
              <Text c="dimmed" size="sm">You are now the server administrator.</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Center>
              <ThemeIcon size={64} radius="xl" color="brand" variant="light">
                <IconLock size={32} />
              </ThemeIcon>
            </Center>

            <Stack align="center" gap={4}>
              <Text fw={600}>This server has no owner yet!</Text>
              <Text size="sm" c="dimmed" ta="center">
                If you deployed this server, enter the admin claim code from the server logs to become the administrator.
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack gap={12}>
                <TextInput
                  label="Claim Code"
                  placeholder="Enter the 32-character claim code..."
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.currentTarget.value)}
                  disabled={isLoading}
                  styles={{ input: { fontFamily: 'monospace' } }}
                />

                {error && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
                    {error}
                  </Alert>
                )}

                <Button type="submit" fullWidth loading={isLoading} disabled={!claimCode.trim()}>
                  Claim Ownership
                </Button>
              </Stack>
            </form>

            <Text size="xs" c="dimmed" ta="center">
              Don't have the code? Contact whoever deployed this server.
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  );
}
