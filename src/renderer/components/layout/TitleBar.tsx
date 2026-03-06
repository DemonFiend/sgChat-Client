import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Group, Indicator, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconBell, IconMinus, IconSquare, IconX, IconServer2, IconMessageCircle, IconUsers, IconSettings, IconServerCog } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { useUnreadStore } from '../../stores/unreadStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useServers } from '../../hooks/useServers';
import { canManageServer } from '../../stores/permissions';
import { ServerSettingsModal } from '../ui/ServerSettingsModal';
import { NotificationPanel } from '../ui/NotificationPanel';

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
  const unreads = useUnreadStore((s) => s.unreads);
  const totalUnread = Object.values(unreads).reduce((sum, e) => sum + e.count, 0);
  const { data: servers } = useServers();
  const activeServer = servers?.find((s) => s.id === activeServerId);
  const showServerSettings = view === 'servers' && !!activeServerId && canManageServer(activeServer?.owner_id);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const notifPanelOpen = useNotificationStore((s) => s.panelOpen);
  const toggleNotifPanel = useNotificationStore((s) => s.togglePanel);
  const { data: unreadNotifCount } = useUnreadNotificationCount();
  const notifBadge = unreadNotifCount?.count || 0;

  // Update window title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `sgChat (${totalUnread})` : 'sgChat';
  }, [totalUnread]);

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
      {/* Left: Logo */}
      <Text
        size="xs"
        fw={700}
        className="drag-region"
        style={{ color: 'var(--accent)', letterSpacing: '-0.5px', flexShrink: 0, paddingRight: 12 }}
      >
        sgChat
      </Text>

      {/* Center: Navigation tabs */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="drag-region">
        <Group gap={2} className="no-drag">
          {NAV_TABS.map((tab) => {
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
                {tab.id === 'dms' && totalUnread > 0 && !active && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color="red"
                    circle
                    style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.6rem', minWidth: 16, height: 16 }}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
              </UnstyledButton>
            );
          })}

          {/* Server Settings — admin only, after Friends */}
          {showServerSettings && (
            <UnstyledButton
              onClick={() => setServerSettingsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 16,
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <IconServerCog size={14} />
              Admin
            </UnstyledButton>
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
          <Tooltip label="Notifications" position="bottom" withArrow>
            <UnstyledButton
              onClick={toggleNotifPanel}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: 16,
                background: notifPanelOpen ? 'var(--accent)' : 'transparent',
                color: notifPanelOpen ? 'var(--accent-text)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'background 0.15s, color 0.15s',
                position: 'relative',
              }}
            >
              <IconBell size={14} />
              {notifBadge > 0 && (
                <Badge
                  size="xs"
                  variant="filled"
                  color="red"
                  circle
                  style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.6rem', minWidth: 16, height: 16 }}
                >
                  {notifBadge > 99 ? '99+' : notifBadge}
                </Badge>
              )}
            </UnstyledButton>
          </Tooltip>
        </Group>
      </div>

      {/* Right: Window controls */}
      <Group gap={0} className="no-drag">
        <Tooltip label="Minimize" position="bottom" withArrow>
          <ActionIcon
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
