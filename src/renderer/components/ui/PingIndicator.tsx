import { Tooltip } from '@mantine/core';
import { IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useVoiceStore, type ConnectionQualityState } from '../../stores/voiceStore';

const qualityColors: Record<string, string> = {
  excellent: 'var(--status-online)',
  good: 'var(--status-online)',
  poor: 'var(--status-idle)',
  lost: 'var(--status-dnd)',
};

const qualityLabels: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  poor: 'Poor',
  lost: 'Disconnected',
};

interface PingIndicatorProps {
  size?: number;
}

export function PingIndicator({ size = 14 }: PingIndicatorProps) {
  const quality = useVoiceStore((s) => s.connectionQuality);
  const connected = useVoiceStore((s) => s.connected);

  if (!connected) return null;

  const color = qualityColors[quality.quality] || 'var(--text-muted)';
  const label = `Connection: ${qualityLabels[quality.quality] || 'Unknown'}`;

  return (
    <Tooltip label={label} position="top" withArrow>
      {quality.quality === 'lost' ? (
        <IconWifiOff size={size} style={{ color, flexShrink: 0 }} />
      ) : (
        <IconWifi size={size} style={{ color, flexShrink: 0 }} />
      )}
    </Tooltip>
  );
}
