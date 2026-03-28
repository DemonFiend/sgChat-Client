import { useState, useEffect, useRef } from 'react';
import { Center, Paper, Title, Text, PasswordInput, Button, Alert, Loader, Stack } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { api } from '../lib/api';

interface ResetPasswordPageProps {
  token: string;
  onBack: () => void;
}

type TokenStatus = 'validating' | 'valid' | 'invalid';

export function ResetPasswordPage({ token, onBack }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('validating');
  const [tokenError, setTokenError] = useState('');
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate the reset token on mount
  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      try {
        await api.get(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (!cancelled) setTokenStatus('valid');
      } catch (err: unknown) {
        if (!cancelled) {
          setTokenStatus('invalid');
          setTokenError(
            err instanceof Error ? err.message : 'This reset link is invalid or has expired.',
          );
        }
      }
    }

    verifyToken();
    return () => { cancelled = true; };
  }, [token]);

  // Auto-redirect after successful reset
  useEffect(() => {
    if (success) {
      redirectTimerRef.current = setTimeout(() => {
        onBack();
      }, 3000);
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [success, onBack]);

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // Validating state
  if (tokenStatus === 'validating') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="drag-region"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <Paper w={420} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <Loader size="lg" />
            <Text c="dimmed" size="sm">Validating your reset link...</Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // Invalid/expired token
  if (tokenStatus === 'invalid') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="drag-region"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <Paper w={420} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" c="brand">sgChat</Title>
            <Alert icon={<IconAlertCircle size={20} />} color="red" variant="light" w="100%">
              {tokenError || 'This reset link is invalid or has expired.'}
            </Alert>
            <Button variant="light" onClick={onBack} fullWidth>
              Request a New Link
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // Success state
  if (success) {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="drag-region"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <Paper w={420} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" c="brand">sgChat</Title>
            <Alert icon={<IconCheck size={20} />} color="green" variant="light" w="100%">
              Your password has been successfully reset. Redirecting to login...
            </Alert>
            <Button onClick={onBack} fullWidth>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // Reset form
  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
      <div
        className="drag-region"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <Paper w={420} p="xl" radius="lg" withBorder>
        <Stack gap="md">
          <Title order={2} ta="center" c="brand">sgChat</Title>
          <Title order={3} ta="center">Reset your password</Title>
          <Text c="dimmed" ta="center" size="sm">
            Enter a new password for your account.
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <Button onClick={handleSubmit} loading={loading} fullWidth mt="sm">
            Reset Password
          </Button>

          <Button variant="subtle" onClick={onBack} fullWidth>
            Back to Login
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
