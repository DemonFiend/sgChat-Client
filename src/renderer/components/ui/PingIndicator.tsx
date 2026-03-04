import { Tooltip } from '@mantine/core';
import { IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';

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
  // Select primitives — connectionQuality is an object that gets replaced every 2s,
  // selecting the whole object would cause unnecessary re-renders.
  const qualityLevel = useVoiceStore((s) => s.connectionQuality.quality);
  const connected = useVoiceStore((s) => s.connected);

  if (!connected) return null;

  const color = qualityColors[qualityLevel] || 'var(--text-muted)';
  const label = `Connection: ${qualityLabels[qualityLevel] || 'Unknown'}`;

  return (
    <Tooltip label={label} position="top" withArrow>
      {qualityLevel === 'lost' ? (
        <IconWifiOff size={size} style={{ color, flexShrink: 0 }} />
      ) : (
        <IconWifi size={size} style={{ color, flexShrink: 0 }} />
      )}
    </Tooltip>
  );
}
