import { useState } from 'react';
import { ActionIcon, Avatar, Indicator, ScrollArea, Stack, Tooltip, Divider } from '@mantine/core';
import { IconHome, IconPlus } from '@tabler/icons-react';
import { useServers, type Server } from '../../hooks/useServers';
import { useUIStore } from '../../stores/uiStore';
import { CreateServerModal } from '../ui/CreateServerModal';

export function ServerSidebar() {
  const { data: servers } = useServers();
  const { activeServerId, setActiveServer, setView, view } = useUIStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div style={{
      width: 72,
      background: 'var(--bg-tertiary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 8,
      flexShrink: 0,
    }}>
      {/* Home / DMs button */}
      <Tooltip label="Direct Messages" position="right" withArrow>
        <ActionIcon
          variant={view === 'dms' || view === 'friends' ? 'filled' : 'subtle'}
          color={view === 'dms' || view === 'friends' ? 'brand' : 'gray'}
          size={48}
          radius="xl"
          onClick={() => setView('dms')}
          style={{
            transition: 'border-radius 0.2s',
            borderRadius: view === 'dms' || view === 'friends' ? 16 : 24,
          }}
        >
          <IconHome size={24} />
        </ActionIcon>
      </Tooltip>

      <Divider
        w={32}
        my={8}
        style={{ borderColor: 'var(--border)' }}
      />

      {/* Server list */}
      <ScrollArea
        style={{ flex: 1, width: '100%' }}
        scrollbarSize={4}
        type="hover"
      >
        <Stack align="center" gap={8} pb={8}>
          {servers?.map((server) => (
            <ServerIcon
              key={server.id}
              server={server}
              active={activeServerId === server.id}
              onClick={() => setActiveServer(server.id)}
            />
          ))}

          {/* Add server button */}
          <Tooltip label="Add Server" position="right" withArrow>
            <ActionIcon
              variant="subtle"
              color="green"
              size={48}
              radius="xl"
              style={{ transition: 'border-radius 0.2s' }}
              onClick={() => setCreateModalOpen(true)}
            >
              <IconPlus size={24} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </ScrollArea>

      <CreateServerModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(server) => setActiveServer(server.id)}
      />
    </div>
  );
}

function ServerIcon({ server, active, onClick }: { server: Server; active: boolean; onClick: () => void }) {
  const initial = server.name.charAt(0).toUpperCase();

  return (
    <div style={{ position: 'relative' }}>
      {/* Active indicator pill */}
      {active && (
        <div style={{
          position: 'absolute',
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 4,
          height: 36,
          borderRadius: '0 4px 4px 0',
          background: 'var(--text-primary)',
        }} />
      )}
      <Tooltip label={server.name} position="right" withArrow>
        {server.icon_url ? (
          <Avatar
            src={server.icon_url}
            size={48}
            radius={active ? 16 : 24}
            onClick={onClick}
            style={{
              cursor: 'pointer',
              transition: 'border-radius 0.2s',
            }}
          />
        ) : (
          <ActionIcon
            variant={active ? 'filled' : 'subtle'}
            color={active ? 'brand' : 'gray'}
            size={48}
            radius={active ? 16 : 24}
            onClick={onClick}
            style={{
              cursor: 'pointer',
              transition: 'border-radius 0.2s',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            {initial}
          </ActionIcon>
        )}
      </Tooltip>
    </div>
  );
}
