import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Group, Text, Popover, Stack, ActionIcon, Tooltip, CopyButton,
} from '@mantine/core';
import { IconCopy, IconCheck, IconServer2, IconRefresh } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';

interface ServerStatusPillProps {
  /** Called when user clicks "Change Server" in the popover */
  onChangeServer?: () => void;
  /** Compact mode for login page (slightly different styling) */
  variant?: 'titlebar' | 'login';
}

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export function ServerStatusPill({ onChangeServer, variant = 'titlebar' }: ServerStatusPillProps) {
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const [serverName, setServerName] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use electronAPI.config.healthCheck if available (works inside Electron)
  // Fall back to direct fetch (works in browser/Vite dev)
  const measurePing = useCallback(async () => {
    if (!serverUrl) {
      setConnectionState('disconnected');
      setServerName('');
      return;
    }

    const start = performance.now();

    // Try electronAPI first (Electron main process proxies the request — avoids CORS)
    const electronBridge = (window as unknown as { electronAPI?: { config?: { healthCheck?: (url: string) => Promise<{ name?: string; version?: string; status?: string }> } } }).electronAPI;

    if (electronBridge?.config?.healthCheck) {
      try {
        const info = await electronBridge.config.healthCheck(serverUrl);
        const elapsed = Math.round(performance.now() - start);
        if (info) {
          setServerName(info.name || 'Server');
          setConnectionState('connected');
          setPingMs(elapsed);
          return;
        }
      } catch {
        // Fall through to direct fetch
      }
    }

    // Fallback: direct fetch (for browser/Vite dev mode)
    try {
      const healthUrl = serverUrl.replace(/\/$/, '') + '/api/health';
      const resp = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
      const elapsed = Math.round(performance.now() - start);

      if (resp.ok) {
        const data = await resp.json();
        setServerName(data.name || 'Server');
        setConnectionState('connected');
        setPingMs(elapsed);
      } else {
        setConnectionState('disconnected');
      }
    } catch {
      setConnectionState('disconnected');
      setPingMs(null);
    }
  }, [serverUrl]);

  // Initial ping + periodic refresh
  useEffect(() => {
    measurePing();
    pingInterval.current = setInterval(measurePing, 30000);
    return () => {
      if (pingInterval.current) clearInterval(pingInterval.current);
    };
  }, [measurePing]);

  // Hover open with 400ms delay
  const handleMouseEnter = () => {
    // Cancel any pending close
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    hoverTimeout.current = setTimeout(() => setPopoverOpen(true), 400);
  };

  // Delayed close — gives user time to move mouse into the popover
  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    closeTimeout.current = setTimeout(() => setPopoverOpen(false), 300);
  };

  // Keep popover open when mouse enters the dropdown
  const handleDropdownMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  // Close when mouse leaves the dropdown
  const handleDropdownMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setPopoverOpen(false), 300);
  };

  // Dot color
  const dotColor = connectionState === 'connected'
    ? 'var(--status-online, #4ade80)'
    : connectionState === 'connecting'
      ? 'var(--status-idle, #f59e0b)'
      : 'var(--status-dnd, #ef4444)';

  // Dot animation
  const dotAnimation = connectionState === 'connecting'
    ? 'pulse 1.5s ease-in-out infinite'
    : 'none';

  const isLogin = variant === 'login';

  let displayName = serverName;
  if (!displayName && serverUrl) {
    try { displayName = new URL(serverUrl).hostname; } catch { displayName = serverUrl; }
  }
  if (!displayName) displayName = 'No Server';

  // Ping color
  const pingColor = pingMs === null ? 'dimmed'
    : pingMs < 100 ? 'green'
      : pingMs < 300 ? 'yellow'
        : 'red';

  return (
    <Popover
      opened={popoverOpen}
      position={isLogin ? 'bottom' : 'bottom-start'}
      withArrow
      shadow="lg"
      radius="md"
      width={280}
      onClose={() => setPopoverOpen(false)}
    >
      <Popover.Target>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setPopoverOpen((o) => !o)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 24,
            paddingLeft: 8,
            paddingRight: 10,
            borderRadius: 12,
            background: 'var(--bg-secondary)',
            border: connectionState === 'disconnected'
              ? '1px solid var(--danger, #ef4444)'
              : '1px solid var(--border)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color 0.2s, background 0.2s',
            maxWidth: 160,
            ...(isLogin ? {} : { WebkitAppRegion: 'no-drag' } as React.CSSProperties),
          }}
        >
          {/* Status dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: connectionState === 'connected' ? `0 0 6px ${dotColor}` : 'none',
              animation: dotAnimation,
              flexShrink: 0,
            }}
          />
          {/* Server name */}
          <Text
            size="xs"
            fw={500}
            truncate
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1,
              maxWidth: 120,
              fontStyle: connectionState === 'connecting' ? 'italic' : 'normal',
            }}
          >
            {connectionState === 'connecting' ? 'Connecting...' : displayName}
          </Text>
        </div>
      </Popover.Target>

      <Popover.Dropdown
        onMouseEnter={handleDropdownMouseEnter}
        onMouseLeave={handleDropdownMouseLeave}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          padding: 0,
        }}
      >
        <Stack gap={0}>
          {/* Header */}
          <Group gap={8} p="sm" style={{ borderBottom: '1px solid var(--border)' }}>
            <IconServer2 size={16} style={{ color: dotColor, flexShrink: 0 }} />
            <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
              {displayName}
            </Text>
            <Tooltip label="Refresh" withArrow position="top">
              <ActionIcon
                size={20}
                variant="subtle"
                color="gray"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); measurePing(); }}
              >
                <IconRefresh size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Latency */}
          <Group gap={8} px="sm" py={8} style={{ borderBottom: '1px solid var(--border)' }}>
            <Text size="xs" c="dimmed" style={{ width: 50 }}>Latency</Text>
            <Text size="xs" fw={600} c={pingColor}>
              {pingMs !== null ? `${pingMs}ms` : '—'}
            </Text>
          </Group>

          {/* Server URL */}
          <Group gap={8} px="sm" py={8} style={{ borderBottom: onChangeServer ? '1px solid var(--border)' : 'none' }}>
            <Text size="xs" c="dimmed" style={{ width: 50 }}>URL</Text>
            <Text
              size="xs"
              c="dimmed"
              truncate
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 10 }}
            >
              {serverUrl || 'Not configured'}
            </Text>
            {serverUrl && (
              <CopyButton value={serverUrl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied!' : 'Copy URL'} withArrow position="top">
                    <ActionIcon size={18} variant="subtle" color={copied ? 'green' : 'gray'} onClick={(e: React.MouseEvent) => { e.stopPropagation(); copy(); }}>
                      {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            )}
          </Group>

          {/* Change Server action */}
          {onChangeServer && (
            <Group
              gap={8}
              px="sm"
              py={8}
              style={{
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderRadius: '0 0 8px 8px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover, var(--bg-secondary))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={(e) => {
                e.stopPropagation();
                setPopoverOpen(false);
                onChangeServer();
              }}
            >
              <IconRefresh size={14} style={{ color: 'var(--accent)' }} />
              <Text size="xs" fw={500} style={{ color: 'var(--accent)' }}>
                Change Server
              </Text>
            </Group>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
