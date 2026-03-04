import { useState, useEffect, useCallback, useRef } from 'react';
import { Center, Stack, Text, Button, ThemeIcon, Progress, Paper } from '@mantine/core';
import { IconWifi, IconShieldLock } from '@tabler/icons-react';
import { useAuthStore, type AuthErrorReason } from '../../stores/authStore';

const COUNTDOWN_SECONDS = 10;

const ERROR_MESSAGES: Record<AuthErrorReason, { title: string; description: string }> = {
  session_expired: {
    title: 'Session Expired',
    description: 'Your session has ended. This can happen when the server restarts or your login expires.',
  },
  server_unreachable: {
    title: 'Connection Lost',
    description: 'Unable to reach the server. It may be restarting or temporarily unavailable.',
  },
  token_invalid: {
    title: 'Authentication Error',
    description: 'Your authentication is no longer valid. Please sign in again.',
  },
};

export function SessionExpiredOverlay() {
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const logout = useAuthStore((s) => s.logout);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isVisible, setIsVisible] = useState(false);

  const clearAuthErrorRef = useRef(clearAuthError);
  clearAuthErrorRef.current = clearAuthError;

  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const handleSignOut = useCallback(() => {
    clearAuthErrorRef.current();
    logoutRef.current();
  }, []);

  // Fade in
  useEffect(() => {
    if (authError) {
      setCountdown(COUNTDOWN_SECONDS);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [authError]);

  // Countdown timer
  useEffect(() => {
    if (!authError) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSignOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authError, handleSignOut]);

  if (!authError) return null;

  const messages = ERROR_MESSAGES[authError];
  const progressPercent = (countdown / COUNTDOWN_SECONDS) * 100;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 500ms ease',
      }}
    >
      <Paper
        w="100%"
        maw={420}
        mx="md"
        radius="md"
        style={{
          background: 'var(--bg-primary)',
          overflow: 'hidden',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 500ms ease',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, background: 'var(--mantine-color-yellow-6)' }} />

        <Stack align="center" gap="md" p="xl" ta="center">
          <ThemeIcon size={64} radius="xl" variant="light" color="yellow">
            {authError === 'server_unreachable' ? (
              <IconWifi size={32} />
            ) : (
              <IconShieldLock size={32} />
            )}
          </ThemeIcon>

          <Text size="xl" fw={700}>{messages.title}</Text>
          <Text size="sm" c="dimmed" lh={1.6}>{messages.description}</Text>

          <Text size="sm" c="dimmed">
            Signing out in{' '}
            <Text span fw={600} c="var(--text-primary)">{countdown}</Text>
            {countdown === 1 ? ' second' : ' seconds'}...
          </Text>

          <Progress
            value={progressPercent}
            color="yellow"
            size="sm"
            radius="xl"
            w="100%"
            style={{ transition: 'none' }}
          />

          <Button
            onClick={handleSignOut}
            variant="filled"
            color="brand"
            fullWidth
          >
            Sign Out Now
          </Button>
        </Stack>
      </Paper>

      <Text size="xs" c="dimmed" style={{ position: 'absolute', bottom: 16 }}>
        sgChat
      </Text>
    </div>
  );
}
