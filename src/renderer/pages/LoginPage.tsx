import { useState, useEffect, useCallback } from 'react';
import {
  Anchor, Alert, Button, Center, Checkbox, Group, Paper, PasswordInput,
  Stack, Text, TextInput, Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuthStore } from '../stores/authStore';
import { ServerStatusPill } from '../components/ui/ServerStatusPill';

const electronAPI = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;

interface ElectronAPI {
  config: {
    getRememberedEmail: () => Promise<string>;
    setRememberedEmail: (email: string) => void;
  };
  servers: {
    saveCurrentSession: () => void;
  };
}

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

/**
 * Compute seconds remaining until an ISO timestamp.
 * Returns 0 when the deadline has passed.
 */
function secondsUntil(isoString: string): number {
  const ms = new Date(isoString).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

export function LoginPage({ onSwitchToRegister, onForgotPassword, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Rate limit state
  const [retryAfter, setRetryAfter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const login = useAuthStore((s) => s.login);
  const serverUrl = useAuthStore((s) => s.serverUrl);

  // Load remembered email on mount
  useEffect(() => {
    electronAPI.config.getRememberedEmail().then((saved: string) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  // Rate limit countdown timer
  useEffect(() => {
    if (!retryAfter) {
      setCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = secondsUntil(retryAfter);
      setCountdown(remaining);
      if (remaining <= 0) {
        setRetryAfter(null);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const isRateLimited = countdown > 0;

  const handleLogin = useCallback(async () => {
    setError('');
    if (isRateLimited) return;

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(serverUrl, email, password);
      if (result.success) {
        electronAPI.config.setRememberedEmail(rememberMe ? email : '');
        if (rememberMe) {
          electronAPI.servers.saveCurrentSession();
        }
      } else {
        // Handle specific error codes
        switch (result.error_code) {
          case 'RATE_LIMITED':
            if (result.retry_after) {
              setRetryAfter(result.retry_after);
            }
            setError(result.error || 'Too many login attempts. Please wait and try again.');
            break;

          case 'APPLICATION_DENIED':
            setError(result.error || 'Your application has been denied.');
            break;

          case 'PENDING_APPROVAL':
            // The authStore handles setting isPendingApproval,
            // which triggers the redirect via App.tsx AuthRouter.
            // Set error as fallback in case redirect is delayed.
            setError(result.error || 'Your account is pending approval.');
            break;

          default:
            setError(result.error || 'Login failed');
            break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, isRateLimited, login, serverUrl]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleLogin();
    },
    [handleLogin],
  );

  const formatCountdown = (seconds: number): string => {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
      <div
        className="drag-region"
        style={
          { position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties
        }
      />
      <Paper w={420} p="xl" radius="lg" withBorder style={{ position: 'relative' }}>
        {/* Server status pill — top-right of card */}
        <div style={{ position: 'absolute', top: -12, right: 16, zIndex: 1 }}>
          <ServerStatusPill variant="login" onChangeServer={onBack} />
        </div>

        <Stack gap="sm">
          <Title order={1} ta="center" c="brand" fz="2.5rem" fw={700} style={{ letterSpacing: '-0.5px' }}>
            sgChat
          </Title>
          <Title order={2} ta="center" fz="1.5rem" fw={700}>
            Welcome back!
          </Title>
          <Text ta="center" c="dimmed" size="sm" mb="md">
            We're so excited to see you again!
          </Text>

          <TextInput
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />

          <Checkbox
            label="Remember me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.currentTarget.checked)}
            size="sm"
          />

          {error && (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertCircle size={18} />}
              title={isRateLimited ? 'Rate Limited' : undefined}
            >
              {error}
              {isRateLimited && (
                <Text size="sm" fw={600} mt={4}>
                  Try again in {formatCountdown(countdown)}
                </Text>
              )}
            </Alert>
          )}

          <Button
            fullWidth
            loading={loading}
            disabled={isRateLimited}
            onClick={handleLogin}
            mt="xs"
          >
            {isRateLimited
              ? `Wait ${formatCountdown(countdown)}`
              : 'Log In'}
          </Button>

          <Group justify="center" mt="xs">
            <Anchor size="sm" component="button" type="button" onClick={onForgotPassword}>
              Forgot your password?
            </Anchor>
          </Group>

          <Text ta="center" size="sm" c="dimmed">
            Need an account?{' '}
            <Anchor component="button" type="button" onClick={onSwitchToRegister}>
              Register
            </Anchor>
          </Text>

          {/* "Change server" moved to ServerStatusPill popover */}
        </Stack>
      </Paper>
    </Center>
  );
}
