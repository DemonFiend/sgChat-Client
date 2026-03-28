import { Center, Paper, Stack, Title, Text, Button, ThemeIcon } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

interface PendingApprovalPageProps {
  onBack: () => void;
}

export function PendingApprovalPage({ onBack }: PendingApprovalPageProps) {
  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <Paper w={420} p="xl" radius="lg" withBorder>
        <Stack align="center" gap="lg">
          <ThemeIcon size={64} radius="xl" variant="light" color="yellow">
            <IconClock size={36} />
          </ThemeIcon>

          <Title order={2} ta="center">
            Pending Approval
          </Title>

          <Text c="dimmed" ta="center" size="sm" maw={340}>
            Your account is awaiting administrator approval. You will be able to
            log in once your account has been approved.
          </Text>

          <Text c="dimmed" ta="center" size="xs">
            Please check back later or contact the server administrator.
          </Text>

          <Button variant="subtle" onClick={onBack} fullWidth mt="md">
            Back to Login
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
