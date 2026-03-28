import { useState, useEffect, useCallback } from 'react';
import { Center, Paper, Title, Text, TextInput, PasswordInput, Button, Alert, Anchor, Stack } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

const electronAPI = (window as any).electronAPI;

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

interface FieldErrors {
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  inviteCode?: string;
}

function validateEmail(value: string): string | undefined {
  if (!value) return 'Email is required';
  if (!value.includes('@')) return 'Please enter a valid email address';
  return undefined;
}

function validateUsername(value: string): string | undefined {
  if (!value) return 'Username is required';
  if (value.length < 2) return 'Username must be at least 2 characters';
  if (value.length > 32) return 'Username must be at most 32 characters';
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and hyphens';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  return undefined;
}

function validateConfirmPassword(value: string, password: string): string | undefined {
  if (!value) return 'Please confirm your password';
  if (value !== password) return 'Passwords do not match';
  return undefined;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupsDisabled, setSignupsDisabled] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const register = useAuthStore((s) => s.register);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const isPendingApproval = useAuthStore((s) => s.isPendingApproval);
  const setServerSignupsDisabled = useAuthStore((s) => s.setServerSignupsDisabled);

  // Check /health on mount for signups_disabled
  useEffect(() => {
    if (!serverUrl) {
      setCheckingHealth(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await electronAPI.config.healthCheck(serverUrl);
        if (cancelled) return;
        if (result.ok && result.data?.signups_disabled) {
          setSignupsDisabled(true);
          setServerSignupsDisabled(true);
        }
      } catch {
        // Health check failed — don't block registration
      } finally {
        if (!cancelled) setCheckingHealth(false);
      }
    })();

    return () => { cancelled = true; };
  }, [serverUrl, setServerSignupsDisabled]);

  const validateAll = useCallback((): boolean => {
    const errors: FieldErrors = {};
    errors.email = validateEmail(email);
    errors.username = validateUsername(username);
    errors.password = validatePassword(password);
    errors.confirmPassword = validateConfirmPassword(confirmPassword, password);

    if (signupsDisabled && !inviteCode.trim()) {
      errors.inviteCode = 'Invite code is required for this server';
    }

    setFieldErrors(errors);
    return !errors.email && !errors.username && !errors.password && !errors.confirmPassword && !errors.inviteCode;
  }, [email, username, password, confirmPassword, inviteCode, signupsDisabled]);

  const handleRegister = async () => {
    setServerError('');
    if (!validateAll()) return;

    setLoading(true);
    try {
      const result = await register(
        serverUrl,
        username,
        email,
        password,
        inviteCode.trim() || undefined,
      );
      if (!result.success) {
        setServerError(result.error || 'Registration failed');
      }
      // If pending_approval, the store will set isPendingApproval and we show the notice
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRegister();
  };

  // Pending approval view
  if (isPendingApproval) {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32 }} />
        <Paper w={440} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={2} ta="center">Account Created</Title>
            <Text c="dimmed" ta="center" size="sm">
              Your account is pending admin approval. You will be able to log in once approved.
            </Text>
            <Button variant="light" fullWidth onClick={onSwitchToLogin}>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32 }} />
      <Paper w={440} p="xl" radius="lg" withBorder>
        <Stack gap="xs" mb="lg" align="center">
          <Title order={1} c="brand" fz="2.5rem" fw={700} lts="-0.5px">
            sgChat
          </Title>
          <Title order={2} fz="1.5rem" fw={700}>Create an account</Title>
          <Text c="dimmed" size="sm">Join the conversation</Text>
        </Stack>

        <Stack gap="sm">
          <TextInput
            label="Email"
            placeholder="you@example.com"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.currentTarget.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            onKeyDown={handleKeyDown}
            error={fieldErrors.email}
            autoFocus
          />

          <TextInput
            label="Username"
            placeholder="cool_user123"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.currentTarget.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            onKeyDown={handleKeyDown}
            error={fieldErrors.username}
            description="2-32 characters, letters, numbers, _ and -"
          />

          <PasswordInput
            label="Password"
            placeholder="At least 8 characters"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            onKeyDown={handleKeyDown}
            error={fieldErrors.password}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.currentTarget.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            onKeyDown={handleKeyDown}
            error={fieldErrors.confirmPassword}
          />

          {signupsDisabled && (
            <TextInput
              label="Invite Code"
              placeholder="Enter your invite code"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.currentTarget.value);
                if (fieldErrors.inviteCode) setFieldErrors((prev) => ({ ...prev, inviteCode: undefined }));
              }}
              onKeyDown={handleKeyDown}
              error={fieldErrors.inviteCode}
              description="This server requires an invite code to register"
            />
          )}

          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  title="Registration failed"
                >
                  {serverError}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            fullWidth
            loading={loading || checkingHealth}
            onClick={handleRegister}
            disabled={loading || checkingHealth}
            mt="xs"
          >
            {checkingHealth ? 'Checking server...' : 'Create Account'}
          </Button>

          <Text ta="center" size="sm" c="dimmed">
            Already have an account?{' '}
            <Anchor component="button" type="button" size="sm" onClick={onSwitchToLogin}>
              Log in
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
