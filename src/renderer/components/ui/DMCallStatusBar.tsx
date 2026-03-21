import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Avatar, Group, Text, Tooltip } from '@mantine/core';
import { IconPhoneOff } from '@tabler/icons-react';
import { useDMConversations } from '../../hooks/useDMConversations';
import { useAuthStore } from '../../stores/authStore';
import { isDMConnected, leaveDMVoice, onDMVoiceEvent } from '../../lib/dmVoiceService';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function DMCallStatusBar() {
  const [isInCall, setIsInCall] = useState(() => isDMConnected());
  const [dmChannelId, setDmChannelId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const userId = useAuthStore((s) => s.user?.id);
  const { data: conversations } = useDMConversations();

  useEffect(() => {
    const cleanup = onDMVoiceEvent((event, data) => {
      switch (event) {
        case 'connected':
          setIsInCall(true);
          setDmChannelId(data?.dmChannelId ?? null);
          startRef.current = Date.now();
          setElapsed(0);
          break;
        case 'disconnected':
          setIsInCall(false);
          setDmChannelId(null);
          setElapsed(0);
          break;
      }
    });
    return cleanup;
  }, []);

  // Timer
  useEffect(() => {
    if (!isInCall) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInCall]);

  if (!isInCall) return null;

  // Find the conversation and the other user
  const conversation = conversations?.find((c) => c.id === dmChannelId);
  const otherUser = conversation?.participants?.find((p) => p.id !== userId) || conversation?.participants?.[0];

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(74,222,128,0.1) 0%, var(--bg-tertiary) 100%)',
      borderBottom: '1px solid var(--border)',
      padding: '6px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    }}>
      <Avatar
        src={otherUser?.avatar_url}
        size={24}
        radius="xl"
        color="brand"
      >
        {otherUser?.username?.[0]?.toUpperCase() || '?'}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Group gap={8} wrap="nowrap">
          <Text size="xs" fw={600} style={{ color: 'var(--online)' }}>
            In Call
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {otherUser?.username || 'DM Call'}
          </Text>
        </Group>
      </div>

      <Text size="xs" fw={500} style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
        {formatDuration(elapsed)}
      </Text>

      <Tooltip label="Hang Up" position="bottom" withArrow>
        <ActionIcon
          variant="filled"
          color="red"
          size={24}
          radius="xl"
          onClick={leaveDMVoice}
        >
          <IconPhoneOff size={14} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
