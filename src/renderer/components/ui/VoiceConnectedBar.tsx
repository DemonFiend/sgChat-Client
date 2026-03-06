import { Group, Text } from '@mantine/core';
import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceControls } from './VoiceControls';

interface VoiceConnectedBarProps {
  compact?: boolean;
}

export function VoiceConnectedBar({ compact }: VoiceConnectedBarProps) {
  const connected = useVoiceStore((s) => s.connected);
  const channelName = useVoiceStore((s) => s.channelName);
  const connectionState = useVoiceStore((s) => s.connectionState);

  if (!connected && connectionState !== 'connecting' && connectionState !== 'reconnecting') {
    return null;
  }

  const qualityStabilized = useVoiceStore((s) => s.qualityStabilized);

  const statusLabel =
    connectionState === 'connecting' ? 'Connecting...' :
    connectionState === 'reconnecting' ? 'Reconnecting...' :
    !qualityStabilized ? 'Connecting...' :
    'Voice Connected';

  const statusColor =
    connectionState === 'connected' && qualityStabilized ? 'var(--accent)' :
    connectionState === 'reconnecting' ? 'var(--warning)' :
    'var(--text-muted)';

  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      borderTop: '1px solid var(--border)',
      padding: compact ? 8 : '8px 12px',
      flexShrink: 0,
    }}>
      <Group gap={8} mb={compact ? 6 : 4}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} style={{ color: statusColor }} truncate>
            {statusLabel}
          </Text>
          {channelName && (
            <Text size="xs" c="dimmed" truncate>
              {channelName}
            </Text>
          )}
        </div>
      </Group>

      <VoiceControls size={compact ? 28 : 32} />
    </div>
  );
}
