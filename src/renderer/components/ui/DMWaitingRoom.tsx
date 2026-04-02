import { Avatar, Button, Group, Stack, Text } from '@mantine/core';
import { IconHeadphonesOff, IconPhone } from '@tabler/icons-react';

interface DMWaitingRoomProps {
  callerName: string;
  callerAvatar?: string | null;
  onJoin: () => void;
  onJoinDeafened: () => void;
}

/**
 * Inline waiting room panel shown in the DM chat area when someone
 * is in an active call that the current user hasn't joined.
 * Appears after the 30s IncomingCallNotification times out, or when
 * the user navigates to a DM where a call is in progress.
 */
export function DMWaitingRoom({ callerName, callerAvatar, onJoin, onJoinDeafened }: DMWaitingRoomProps) {
  return (
    <div style={{
      padding: '32px 16px',
      background: 'linear-gradient(180deg, rgba(74,222,128,0.04) 0%, rgba(74,222,128,0.01) 100%)',
      borderBottom: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes waitingRoomPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(74,222,128,0); }
        }
        @keyframes waitingRoomDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Faded ambient background circles */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Stack align="center" gap={16} style={{ position: 'relative', zIndex: 1 }}>
        {/* Caller avatar with pulsing green ring */}
        <div style={{
          borderRadius: '50%',
          animation: 'waitingRoomPulse 2s ease-in-out infinite',
        }}>
          <Avatar
            src={callerAvatar}
            size={72}
            radius="xl"
            color="green"
            style={{
              border: '3px solid var(--mantine-color-green-5)',
            }}
          >
            {callerName.charAt(0).toUpperCase()}
          </Avatar>
        </div>

        {/* Status text with animated dots */}
        <Stack align="center" gap={4}>
          <Text fw={600} size="sm">{callerName} is in a call</Text>
          <Group gap={4}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--mantine-color-green-5)',
                  animation: 'waitingRoomDot 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </Group>
        </Stack>

        {/* Join buttons */}
        <Group gap={12}>
          <Button
            size="lg"
            color="green"
            leftSection={<IconPhone size={20} />}
            onClick={onJoin}
            style={{
              boxShadow: '0 4px 16px rgba(74,222,128,0.25)',
              fontWeight: 700,
            }}
          >
            Join Call
          </Button>
          <Button
            size="md"
            variant="light"
            color="yellow"
            leftSection={<IconHeadphonesOff size={16} />}
            onClick={onJoinDeafened}
          >
            Join Deafened
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
