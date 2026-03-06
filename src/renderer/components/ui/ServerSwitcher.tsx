import { useEffect, useState } from 'react';
import { ActionIcon, Group, Popover, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconServer2, IconTrash, IconCheck } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';

const electronAPI = (window as any).electronAPI;

interface SavedServer {
  url: string;
  name: string;
  email: string;
  lastUsed: number;
}

export function ServerSwitcher() {
  const [opened, setOpened] = useState(false);
  const [servers, setServers] = useState<SavedServer[]>([]);
  const [switching, setSwitching] = useState(false);
  const currentServerUrl = useAuthStore((s) => s.serverUrl);

  // Load saved servers when popover opens
  useEffect(() => {
    if (opened) {
      electronAPI.servers.getSaved().then((saved: SavedServer[]) => {
        setServers(saved.sort((a: SavedServer, b: SavedServer) => b.lastUsed - a.lastUsed));
      });
    }
  }, [opened]);

  const handleSwitch = async (targetUrl: string) => {
    if (targetUrl === currentServerUrl || switching) return;
    setSwitching(true);
    try {
      const result = await electronAPI.servers.switch(targetUrl);
      if (result) {
        // Reload the app to re-initialize with new credentials
        window.location.reload();
      }
    } catch (err) {
      console.error('[ServerSwitcher] Switch failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    await electronAPI.servers.remove(url);
    setServers((prev) => prev.filter((s) => s.url !== url));
  };

  // Extract display name from URL (remove protocol, trailing slash)
  const displayUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.host;
    } catch {
      return url;
    }
  };

  const hasOtherServers = servers.some((s) => s.url !== currentServerUrl);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      shadow="lg"
      radius="md"
      width={280}
    >
      <Popover.Target>
        <Tooltip label="Quick Connect" position="bottom" withArrow>
          <UnstyledButton
            onClick={() => setOpened((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 16,
              background: opened ? 'var(--accent)' : 'transparent',
              color: opened ? 'var(--accent-text)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <IconServer2 size={14} />
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          padding: 0,
        }}
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <Text size="xs" fw={600}>Quick Connect</Text>
          <Text size="xs" c="dimmed">Switch between saved servers</Text>
        </div>

        <div style={{ padding: 4, maxHeight: 300, overflow: 'auto' }}>
          {servers.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py={16}>
              No saved servers yet. Log in with "Remember me" to save a server.
            </Text>
          )}

          {servers.map((server) => {
            const isCurrent = server.url === currentServerUrl;
            return (
              <UnstyledButton
                key={server.url}
                onClick={() => handleSwitch(server.url)}
                disabled={isCurrent || switching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: isCurrent ? 'rgba(var(--accent-rgb, 99,102,241), 0.1)' : 'transparent',
                  opacity: switching && !isCurrent ? 0.5 : 1,
                  cursor: isCurrent ? 'default' : switching ? 'wait' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isCurrent ? 'var(--accent)' : 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isCurrent ? (
                    <IconCheck size={16} style={{ color: 'var(--accent-text)' }} />
                  ) : (
                    <IconServer2 size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" fw={600} truncate>
                    {server.name !== server.url ? server.name : displayUrl(server.url)}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>{server.email}</Text>
                </div>

                {!isCurrent && (
                  <Tooltip label="Remove" position="left" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size={20}
                      onClick={(e) => handleRemove(e, server.url)}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </UnstyledButton>
            );
          })}
        </div>

        {!hasOtherServers && servers.length > 0 && (
          <div style={{ padding: '4px 12px 8px', borderTop: '1px solid var(--border)' }}>
            <Text size="xs" c="dimmed" ta="center">
              Log into another server with "Remember me" to enable quick switching.
            </Text>
          </div>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
