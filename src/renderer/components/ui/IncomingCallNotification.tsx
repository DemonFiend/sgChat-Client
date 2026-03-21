import { useEffect, useRef } from 'react';
import { ActionIcon, Avatar, Group, Paper, Stack, Text } from '@mantine/core';
import { IconPhone, IconPhoneOff, IconPhoneIncoming } from '@tabler/icons-react';
import { soundService } from '../../lib/soundService';

interface IncomingCallNotificationProps {
  callerName: string;
  callerAvatar?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallNotification({
  callerName,
  callerAvatar,
  onAccept,
  onDecline,
}: IncomingCallNotificationProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Play ringtone sound if available
    try {
      soundService.playNotification();
    } catch {
      // soundService may not have a ringtone — that's fine
    }

    // Auto-dismiss after 30 seconds
    timeoutRef.current = setTimeout(() => {
      onDecline();
    }, 30000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: 'fixed',
        top: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        animation: 'incomingCallSlideDown 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes incomingCallSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes incomingCallPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <Paper
        shadow="xl"
        radius="lg"
        p="md"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          minWidth: 300,
        }}
      >
        <Group gap="sm" mb="md">
          <div style={{ position: 'relative' }}>
            <Avatar src={callerAvatar} size={48} radius="xl" color="brand">
              {callerName.charAt(0).toUpperCase()}
            </Avatar>
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'var(--online)',
                border: '2px solid var(--bg-secondary)',
                animation: 'incomingCallPulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
          <Stack gap={2} style={{ flex: 1 }}>
            <Text fw={600} size="sm" c="var(--text-primary)">
              {callerName}
            </Text>
            <Text
              size="xs"
              c="var(--text-muted)"
              style={{ animation: 'incomingCallPulse 1.5s ease-in-out infinite' }}
            >
              Incoming Call...
            </Text>
          </Stack>
          <IconPhoneIncoming
            size={22}
            color="var(--online)"
            style={{ animation: 'incomingCallPulse 1s ease-in-out infinite' }}
          />
        </Group>

        <Group gap="sm" grow>
          <ActionIcon
            variant="light"
            color="red"
            size="xl"
            radius="md"
            onClick={onDecline}
            style={{ flex: 1, height: 40 }}
          >
            <Group gap={6}>
              <IconPhoneOff size={16} />
              <Text size="sm" fw={500}>Decline</Text>
            </Group>
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="green"
            size="xl"
            radius="md"
            onClick={onAccept}
            style={{ flex: 1, height: 40 }}
          >
            <Group gap={6}>
              <IconPhone size={16} />
              <Text size="sm" fw={500}>Accept</Text>
            </Group>
          </ActionIcon>
        </Group>
      </Paper>
    </div>
  );
}
