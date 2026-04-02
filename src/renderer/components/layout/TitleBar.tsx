import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Group, Menu, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconMinus, IconSquare, IconX, IconServer2, IconMessageCircle, IconUsers, IconSettings, IconServerCog, IconBell, IconCalendarEvent, IconHash, IconLink, IconPlus, IconShield, IconDatabase, IconHistory, IconMoodSmile, IconHeartHandshake, IconZzz, IconBug, IconEye } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useServers } from '../../hooks/useServers';
import { canManageServer } from '../../stores/permissions';
import { ServerSettingsModal } from '../ui/ServerSettingsModal';
import { ServerSwitcher } from '../ui/ServerSwitcher';
import { NotificationPanel } from '../ui/NotificationPanel';
import { ServerStatusPill } from '../ui/ServerStatusPill';

const electronAPI = (window as any).electronAPI;

const NAV_TABS = [
  { id: 'servers' as const, label: 'Server', icon: IconServer2 },
  { id: 'dms' as const, label: 'Messages', icon: IconMessageCircle },
  { id: 'friends' as const, label: 'Friends', icon: IconUsers },
];

export function TitleBar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const dmUnreads = useUnreadStore((s) => s.dmUnreads);
  const totalDMUnread = Object.values(dmUnreads).reduce((sum, c) => sum + c, 0);
  const unreads = useUnreadStore((s) => s.unreads);
  const totalMentions = Object.values(unreads).reduce((sum, e) => sum + e.mentions, 0);
  const { data: servers } = useServers();
  const activeServer = servers?.find((s) => s.id === activeServerId);
  const showServerSettings = view === 'servers' && !!activeServerId && canManageServer(activeServer?.owner_id);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const toggleNotifPanel = useNotificationStore((s) => s.togglePanel);
  const { data: unreadNotifCount } = useUnreadNotificationCount();

  // Update window title with total unread count (DMs + mentions)
  const totalBadge = totalDMUnread + totalMentions;
  useEffect(() => {
    document.title = totalBadge > 0 ? `sgChat (${totalBadge})` : 'sgChat';
  }, [totalBadge]);

  return (
    <div
      className="drag-region"
      style={{
        height: 36,
        background: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 0,
        flexShrink: 0,
      }}
    >
      {/* Left: Logo + Server Status */}
      <Group gap={8} style={{ flexShrink: 0, paddingRight: 12 }} className="drag-region">
        <Text
          size="xs"
          fw={700}
          style={{ color: 'var(--accent)', letterSpacing: '-0.5px' }}
        >
          sgChat
        </Text>
        <ServerStatusPill variant="titlebar" />
      </Group>

      {/* Center: Navigation tabs */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="drag-region">
        <Group gap={2} className="no-drag">
          <ServerSwitcher />
          {/* Server tab — with dropdown for Events */}
          <Menu shadow="md" width={180} position="bottom" withArrow>
            <Menu.Target>
              <UnstyledButton
                onClick={() => setView('servers')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 16,
                  background: view === 'servers' ? 'var(--accent)' : 'transparent',
                  color: view === 'servers' ? 'var(--accent-text)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                }}
              >
                <IconServer2 size={14} />
                Server
                {totalMentions > 0 && view !== 'servers' && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color="red"
                    circle
                    style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.6rem', minWidth: 16, height: 16 }}
                  >
                    {totalMentions > 99 ? '99+' : totalMentions}
                  </Badge>
                )}
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
              <Menu.Item
                leftSection={<IconHash size={14} />}
                onClick={() => setView('servers')}
              >
                Channels
              </Menu.Item>
              <Menu.Item
                leftSection={<IconCalendarEvent size={14} />}
                onClick={() => {
                  setView('servers');
                  setTimeout(() => window.dispatchEvent(new Event('toggleServerEvents')), 50);
                }}
              >
                Events
              </Menu.Item>
              {activeServerId && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconSettings size={14} />}
                    onClick={() => setServerSettingsOpen(true)}
                  >
                    Server Settings
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconPlus size={14} />}
                    onClick={() => setServerSettingsOpen(true)}
                  >
                    Create Channel
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLink size={14} />}
                    onClick={() => setServerSettingsOpen(true)}
                  >
                    Invite People
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconBell size={14} />}>
                    Notification Settings
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>

          {/* DMs & Friends tabs */}
          {NAV_TABS.filter((t) => t.id !== 'servers').map((tab) => {
            const active = view === tab.id;
            return (
              <UnstyledButton
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 16,
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent-text)' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.id === 'dms' && totalDMUnread > 0 && !active && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color="red"
                    circle
                    style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.6rem', minWidth: 16, height: 16 }}
                  >
                    {totalDMUnread > 99 ? '99+' : totalDMUnread}
                  </Badge>
                )}
              </UnstyledButton>
            );
          })}

          {/* Server Admin — admin only, dropdown with section links */}
          {showServerSettings && (
            <Menu shadow="md" width={200} position="bottom" withArrow>
              <Menu.Target>
                <UnstyledButton
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 16,
                    background: view === 'server-admin' ? 'var(--accent)' : 'transparent',
                    color: view === 'server-admin' ? 'var(--accent-text)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <IconServerCog size={14} />
                  Admin
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => setServerSettingsOpen(true)}>
                  Server Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Label>Administration</Menu.Label>
                <Menu.Item leftSection={<IconShield size={14} />} onClick={() => useUIStore.getState().openAdminView('roles')}>
                  Roles & Permissions
                </Menu.Item>
                <Menu.Item leftSection={<IconUsers size={14} />} onClick={() => useUIStore.getState().openAdminView('members')}>
                  Members
                </Menu.Item>
                <Menu.Item leftSection={<IconDatabase size={14} />} onClick={() => useUIStore.getState().openAdminView('storage')}>
                  Storage Dashboard
                </Menu.Item>
                <Menu.Item leftSection={<IconHistory size={14} />} onClick={() => useUIStore.getState().openAdminView('audit')}>
                  Audit Log
                </Menu.Item>
                <Menu.Item leftSection={<IconMoodSmile size={14} />} onClick={() => useUIStore.getState().openAdminView('emojis')}>
                  Emoji Packs
                </Menu.Item>
                <Menu.Item leftSection={<IconHeartHandshake size={14} />} onClick={() => useUIStore.getState().openAdminView('role-reactions')}>
                  Role Reactions
                </Menu.Item>
                <Menu.Item leftSection={<IconServer2 size={14} />} onClick={() => useUIStore.getState().openAdminView('relay-servers')}>
                  Relay Servers
                </Menu.Item>
                <Menu.Item leftSection={<IconZzz size={14} />} onClick={() => useUIStore.getState().openAdminView('afk-settings')}>
                  AFK Settings
                </Menu.Item>
                <Menu.Item leftSection={<IconBug size={14} />} onClick={() => useUIStore.getState().openAdminView('crash-reports')}>
                  Crash Reports
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconEye size={14} />} onClick={() => useUIStore.getState().openAdminView('impersonation')}>
                  Impersonate User
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}

          {/* User Settings — always visible, at end */}
          <UnstyledButton
            onClick={() => setView('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 16,
              background: view === 'settings' ? 'var(--accent)' : 'transparent',
              color: view === 'settings' ? 'var(--accent-text)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <IconSettings size={14} />
            Settings
          </UnstyledButton>

          {/* Notification bell */}
          <UnstyledButton
            onClick={toggleNotifPanel}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: 16,
              background: 'transparent',
              color: 'var(--text-muted)',
              position: 'relative',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <IconBell size={14} />
            {(unreadNotifCount ?? 0) > 0 && (
              <Badge
                size="xs"
                variant="filled"
                color="red"
                circle
                style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.6rem', minWidth: 16, height: 16 }}
              >
                {(unreadNotifCount ?? 0) > 99 ? '99+' : unreadNotifCount}
              </Badge>
            )}
          </UnstyledButton>

        </Group>
      </div>

      {/* Right: Window controls */}
      <Group gap={0} className="no-drag">
        <Tooltip label="Minimize" position="bottom" withArrow>
          <ActionIcon
            aria-label="Minimize"
            variant="subtle"
            color="gray"
            size={36}
            radius={0}
            onClick={() => electronAPI.minimize()}
            style={{ borderRadius: 0 }}
          >
            <IconMinus size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Maximize" position="bottom" withArrow>
          <ActionIcon
            aria-label="Maximize"
            variant="subtle"
            color="gray"
            size={36}
            radius={0}
            onClick={() => electronAPI.maximize()}
            style={{ borderRadius: 0 }}
          >
            <IconSquare size={12} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Close" position="bottom" withArrow>
          <ActionIcon
            aria-label="Close"
            variant="subtle"
            color="red"
            size={36}
            radius={0}
            onClick={() => electronAPI.close()}
            style={{ borderRadius: 0 }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {activeServerId && (
        <ServerSettingsModal
          opened={serverSettingsOpen}
          onClose={() => setServerSettingsOpen(false)}
          serverId={activeServerId}
        />
      )}
      <NotificationPanel />
    </div>
  );
}
