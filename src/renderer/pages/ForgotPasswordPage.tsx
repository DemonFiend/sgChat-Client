import { useState } from 'react';
import { Center, Paper, Title, Text, TextInput, Button, Alert, Stack } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconMail } from '@tabler/icons-react';
import { api } from '../lib/api';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              If an account with that email exists, we have sent a password reset link.
              Check your inbox and follow the instructions.
            </Alert>
            <Button onClick={onBack} fullWidth>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
      <div
        className="drag-region"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <Paper w={420} p="xl" radius="lg" withBorder>
        <Stack gap="md">
          <Title order={2} ta="center" c="brand">sgChat</Title>
          <Title order={3} ta="center">Forgot your password?</Title>
          <Text c="dimmed" ta="center" size="sm">
            Enter the email associated with your account and we will send you a reset link.
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <TextInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            leftSection={<IconMail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          <Button onClick={handleSubmit} loading={loading} fullWidth mt="sm">
            Send Reset Link
          </Button>

          <Button variant="subtle" onClick={onBack} fullWidth>
            Back to Login
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
