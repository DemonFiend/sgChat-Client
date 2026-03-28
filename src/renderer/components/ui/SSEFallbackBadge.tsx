/**
 * Subtle indicator shown when the SSE fallback transport is active
 * (Socket.IO unavailable). Displays a small badge in the bottom-left
 * corner of the app window.
 */

import { useEffect, useState } from 'react';
import { Badge, Tooltip } from '@mantine/core';
import { IconPlugConnected } from '@tabler/icons-react';
import { type SSEGatewayState, getSSEState, onSSEStateChange } from '../../lib/sseGateway';

export function SSEFallbackBadge() {
  const [sseState, setSSEState] = useState<SSEGatewayState>(getSSEState);

  useEffect(() => {
    const unsub = onSSEStateChange(setSSEState);
    return unsub;
  }, []);

  // Only show when SSE is actively connecting or connected
  if (sseState === 'inactive') return null;

  const labelMap: Record<SSEGatewayState, string> = {
    inactive: '',
    connecting: 'Reconnecting via SSE...',
    connected: 'Using SSE fallback — limited connectivity',
    error: 'SSE fallback failed — retrying...',
  };

  const colorMap: Record<SSEGatewayState, string> = {
    inactive: 'gray',
    connecting: 'yellow',
    connected: 'orange',
    error: 'red',
  };

  return (
    <Tooltip label={labelMap[sseState]} position="top" withArrow>
      <Badge
        size="xs"
        variant="dot"
        color={colorMap[sseState]}
        leftSection={<IconPlugConnected size={10} />}
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          zIndex: 1000,
          opacity: 0.85,
          cursor: 'default',
          pointerEvents: 'auto',
        }}
      >
        SSE
      </Badge>
    </Tooltip>
  );
}
