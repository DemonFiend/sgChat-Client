import { Avatar, Button, Group, Text } from '@mantine/core';
import { IconEye, IconX } from '@tabler/icons-react';
import { useImpersonationStore } from '../../stores/impersonationStore';

export function ImpersonationBanner() {
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating);
  const impersonatedUser = useImpersonationStore((s) => s.impersonatedUser);
  const stopImpersonation = useImpersonationStore((s) => s.stopImpersonation);
  const isLoading = useImpersonationStore((s) => s.isLoading);

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #f59e0b, #d97706)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <IconEye size={16} style={{ color: '#000', flexShrink: 0 }} />
      <Group gap={8} align="center">
        <Avatar src={impersonatedUser.avatar_url} size={22} radius="xl">
          {impersonatedUser.username.charAt(0).toUpperCase()}
        </Avatar>
        <Text size="sm" fw={600} style={{ color: '#000' }}>
          Impersonating: {impersonatedUser.display_name || impersonatedUser.username}
        </Text>
      </Group>
      <Text size="xs" style={{ color: 'rgba(0,0,0,0.6)' }}>
        Your actual permissions are not affected.
      </Text>
      <Button
        size="xs"
        variant="white"
        color="dark"
        leftSection={<IconX size={12} />}
        onClick={stopImpersonation}
        loading={isLoading}
        style={{ marginLeft: 'auto' }}
      >
        Stop Impersonating
      </Button>
    </div>
  );
}
