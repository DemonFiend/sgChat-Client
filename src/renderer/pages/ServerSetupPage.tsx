import { useState, useEffect } from 'react';
import {
  ActionIcon, Alert, Button, Center, Divider, Group, Paper, Popover,
  Stack, Text, TextInput, Title, Tooltip, UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle, IconBrandGithub, IconChevronDown, IconHelp,
  IconServer2, IconStar, IconStarFilled, IconTrash,
} from '@tabler/icons-react';
import { useAuthStore } from '../stores/authStore';
import { LINKS } from '../lib/constants';

const electronAPI = (window as any).electronAPI;

interface SavedServer {
  url: string;
  name: string;
  email: string;
  lastUsed: number;
}

export function ServerSetupPage({ onComplete }: { onComplete: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<SavedServer[]>([]);
  const [favoriteUrl, setFavoriteUrl] = useState('');
  const [serversOpen, setServersOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);

  // Load saved servers and favorite on mount
  useEffect(() => {
    electronAPI.servers.getSaved().then((saved: SavedServer[]) => {
      setServers(saved.sort((a: SavedServer, b: SavedServer) => b.lastUsed - a.lastUsed));
    });
    electronAPI.servers.getFavorite().then((fav: string) => {
      setFavoriteUrl(fav || '');
    });
    electronAPI.config.getServerUrl().then((saved: string) => {
      if (saved) setUrl(saved);
    });
  }, []);

  const handleConnect = async () => {
    setError('');
    const normalized = url.trim().replace(/\/+$/, '');
    if (!normalized) {
      setError('Please enter a server URL.');
      return;
    }

    try {
      new URL(normalized);
    } catch {
      setError('Please enter a valid URL (e.g., https://chat.example.com).');
      return;
    }

    setLoading(true);
    try {
      const result = await electronAPI.config.healthCheck(normalized);
      if (!result.ok) {
        setError(result.error || 'Could not reach server.');
        return;
      }

      setServerUrl(normalized);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickConnect = async (targetUrl: string) => {
    if (switching) return;
    setSwitching(true);
    try {
      const result = await electronAPI.servers.switch(targetUrl);
      if (result) {
        setServersOpen(false);
        onComplete();
      }
    } catch (err) {
      console.error('[ServerSetup] Quick connect failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, serverUrl: string) => {
    e.stopPropagation();
    const newFav = favoriteUrl === serverUrl ? '' : serverUrl;
    await electronAPI.servers.setFavorite(newFav);
    setFavoriteUrl(newFav);
  };

  const handleRemoveServer = async (e: React.MouseEvent, serverUrl: string) => {
    e.stopPropagation();
    await electronAPI.servers.remove(serverUrl);
    setServers((prev) => prev.filter((s) => s.url !== serverUrl));
    if (favoriteUrl === serverUrl) {
      setFavoriteUrl('');
    }
  };

  const displayUrl = (rawUrl: string) => {
    try {
      return new URL(rawUrl).host;
    } catch {
      return rawUrl;
    }
  };

  // Sort: favorite first, then by lastUsed
  const sortedServers = [...servers].sort((a, b) => {
    if (a.url === favoriteUrl) return -1;
    if (b.url === favoriteUrl) return 1;
    return b.lastUsed - a.lastUsed;
  });

  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)', position: 'relative', overflow: 'hidden' }}>
      {/* Drag region */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 32,
          WebkitAppRegion: 'drag',
          zIndex: 10,
        } as React.CSSProperties}
      />

      {/* Faded watermark background */}
      <img
        src="./sgchat-logo.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          opacity: 0.04,
          pointerEvents: 'none',
          userSelect: 'none',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <Paper w={440} p="xl" radius="lg" withBorder style={{ position: 'relative', zIndex: 1 }}>
        <Stack gap="sm" align="center">
          {/* Logo */}
          <img
            src="./sgchat-logo.png"
            alt="sgChat"
            draggable={false}
            style={{ width: 80, height: 80, userSelect: 'none' }}
          />

          <Title order={1} ta="center" c="brand" fz="2.5rem" fw={700} style={{ letterSpacing: '-0.5px' }}>
            sgChat
          </Title>
          <Text ta="center" c="dimmed" size="sm" mb="xs">
            Connect to your sgChat server
          </Text>

          {/* Saved Servers dropdown — only shown if servers exist */}
          {servers.length > 0 && (
            <Popover
              opened={serversOpen}
              onChange={setServersOpen}
              position="bottom"
              shadow="lg"
              radius="md"
              width={380}
            >
              <Popover.Target>
                <Button
                  variant="subtle"
                  color="gray"
                  rightSection={<IconChevronDown size={14} />}
                  leftSection={<IconServer2 size={14} />}
                  onClick={() => setServersOpen((o) => !o)}
                  fullWidth
                >
                  Saved Servers ({servers.length})
                </Button>
              </Popover.Target>

              <Popover.Dropdown
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  padding: 0,
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <Text size="xs" fw={600}>Saved Servers</Text>
                  <Text size="xs" c="dimmed">Click to quick connect</Text>
                </div>

                <div style={{ padding: 4, maxHeight: 240, overflow: 'auto' }}>
                  {sortedServers.map((server) => {
                    const isFavorite = server.url === favoriteUrl;
                    return (
                      <UnstyledButton
                        key={server.url}
                        onClick={() => handleQuickConnect(server.url)}
                        disabled={switching}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: isFavorite ? 'rgba(var(--accent-rgb, 99,102,241), 0.08)' : 'transparent',
                          opacity: switching ? 0.5 : 1,
                          cursor: switching ? 'wait' : 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--bg-tertiary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <IconServer2 size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" fw={600} truncate>
                            {server.name !== server.url ? server.name : displayUrl(server.url)}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>{server.email}</Text>
                        </div>

                        <Tooltip label={isFavorite ? 'Remove favorite' : 'Set as favorite'} position="left" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color={isFavorite ? 'yellow' : 'gray'}
                            size={24}
                            onClick={(e) => handleToggleFavorite(e, server.url)}
                          >
                            {isFavorite ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Remove server" position="left" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size={24}
                            onClick={(e) => handleRemoveServer(e, server.url)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </UnstyledButton>
                    );
                  })}
                </div>
              </Popover.Dropdown>
            </Popover>
          )}

          {/* Connect to new server */}
          <Divider
            label="Connect to a new server"
            labelPosition="center"
            w="100%"
            my="xs"
          />

          <TextInput
            label="Server URL"
            placeholder="https://chat.example.com"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            autoFocus
            w="100%"
          />

          {error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} w="100%">
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            loading={loading}
            onClick={handleConnect}
          >
            Connect
          </Button>

          {/* Resource links */}
          <Divider w="100%" my="xs" />

          <Group gap="xs" justify="center">
            <Tooltip label="GitHub" withArrow>
              <ActionIcon
                component="a"
                href={LINKS.GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                color="gray"
                size="lg"
              >
                <IconBrandGithub size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="How to Self Host" withArrow>
              <ActionIcon
                component="a"
                href={LINKS.SELF_HOST}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                color="gray"
                size="lg"
              >
                <IconServer2 size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="FAQ" withArrow>
              <ActionIcon
                component="a"
                href={LINKS.FAQ}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                color="gray"
                size="lg"
              >
                <IconHelp size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Paper>
    </Center>
  );
}
