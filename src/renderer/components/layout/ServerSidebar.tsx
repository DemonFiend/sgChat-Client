import { useState } from 'react';
import { ActionIcon, Avatar, Indicator, ScrollArea, Stack, Tooltip, Divider } from '@mantine/core';
import { IconHome, IconPlus, IconLogin } from '@tabler/icons-react';
import { useServers, type Server } from '../../hooks/useServers';
import { useUIStore } from '../../stores/uiStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { CreateServerModal } from '../ui/CreateServerModal';
import { JoinServerModal } from '../ui/JoinServerModal';

export function ServerSidebar() {
  const { data: servers } = useServers();
  const activeServerId = useUIStore((s) => s.activeServerId);
  const setActiveServer = useUIStore((s) => s.setActiveServer);
  const setView = useUIStore((s) => s.setView);
  const view = useUIStore((s) => s.view);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const totalDMUnread = useUnreadStore((s) => {
    const dm = s.dmUnreads;
    let sum = 0;
    for (const k in dm) sum += dm[k];
    return sum;
  });

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
      <div style={{ position: 'relative' }}>
        {totalDMUnread > 0 && (
          <div style={{
            position: 'absolute',
            left: -4,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            borderRadius: '0 4px 4px 0',
            background: 'white',
          }} />
        )}
        <Tooltip label="Direct Messages" position="right" withArrow>
          <Indicator
            label={totalDMUnread > 0 ? (totalDMUnread > 99 ? '99+' : String(totalDMUnread)) : undefined}
            disabled={totalDMUnread === 0}
            color="red"
            size={16}
            offset={4}
            position="bottom-end"
          >
            <ActionIcon
              aria-label="Direct Messages"
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
          </Indicator>
        </Tooltip>
      </div>

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
          <Tooltip label="Create Server" position="right" withArrow>
            <ActionIcon
              aria-label="Create Server"
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

          {/* Join server button */}
          <Tooltip label="Join Server" position="right" withArrow>
            <ActionIcon
              aria-label="Join Server"
              variant="subtle"
              color="blue"
              size={48}
              radius="xl"
              style={{ transition: 'border-radius 0.2s' }}
              onClick={() => setJoinModalOpen(true)}
            >
              <IconLogin size={24} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </ScrollArea>

      <CreateServerModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(server) => setActiveServer(server.id)}
      />

      <JoinServerModal
        opened={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoined={(server) => setActiveServer(server.id)}
      />
    </div>
  );
}

function ServerIcon({ server, active, onClick }: { server: Server; active: boolean; onClick: () => void }) {
  const initial = server.name.charAt(0).toUpperCase();
  const serverUnread = useUnreadStore((s) => s.serverUnreads[server.id]);
  const hasUnread = !active && serverUnread && serverUnread.count > 0;
  const hasMentions = !active && serverUnread && serverUnread.mentions > 0;

  // Pill height: 8px for unread only, 24px for mentions
  const pillHeight = hasMentions ? 24 : hasUnread ? 8 : 0;

  const iconContent = server.icon_url ? (
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
  );

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
      {/* Unread pill (white, on left side) */}
      {!active && hasUnread && (
        <div style={{
          position: 'absolute',
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 4,
          height: pillHeight,
          borderRadius: '0 4px 4px 0',
          background: 'white',
          transition: 'height 0.2s',
        }} />
      )}
      <Tooltip label={server.name} position="right" withArrow>
        {hasMentions ? (
          <Indicator
            label={serverUnread.mentions > 99 ? '99+' : String(serverUnread.mentions)}
            color="red"
            size={16}
            offset={4}
            position="bottom-end"
          >
            {iconContent}
          </Indicator>
        ) : (
          iconContent
        )}
      </Tooltip>
    </div>
  );
}
