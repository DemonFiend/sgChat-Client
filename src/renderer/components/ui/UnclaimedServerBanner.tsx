import { Button, Group, Text } from '@mantine/core';
import { IconAlertTriangle, IconCrown } from '@tabler/icons-react';

interface UnclaimedServerBannerProps {
  onClaim: () => void;
}

export function UnclaimedServerBanner({ onClaim }: UnclaimedServerBannerProps) {
  return (
    <div style={{
      padding: '8px 16px',
      background: 'var(--warning)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      <IconAlertTriangle size={18} style={{ color: '#000', flexShrink: 0 }} />
      <Text size="sm" fw={500} style={{ color: '#000', flex: 1 }}>
        This server has no owner. Claim it to become administrator.
      </Text>
      <Button
        size="xs"
        variant="white"
        color="dark"
        leftSection={<IconCrown size={14} />}
        onClick={onClaim}
      >
        Claim
      </Button>
    </div>
  );
}
