import { Menu } from '@mantine/core';
import {
  IconSettings,
  IconHash,
  IconFolder,
  IconUserPlus,
  IconDoorExit,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';

interface ServerGearMenuProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function ServerGearMenu({ opened, onClose, serverId, isAdmin, children }: ServerGearMenuProps) {
  const openAdminView = useUIStore((s) => s.openAdminView);
  const setView = useUIStore((s) => s.setView);

  const handleServerSettings = () => {
    openAdminView('roles');
    onClose();
  };

  const handleCreateChannel = () => {
    openAdminView('channels');
    onClose();
  };

  const handleCreateCategory = () => {
    openAdminView('channels');
    onClose();
  };

  const handleInvitePeople = () => {
    openAdminView('invites');
    onClose();
  };

  const handleLeaveServer = async () => {
    try {
      await api.post(`/api/servers/${serverId}/leave`);
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setView('servers');
      toastStore.addToast({
        type: 'system',
        title: 'Left Server',
        message: 'You have left the server.',
      });
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed to Leave',
        message: (err as any)?.message || 'Could not leave the server.',
      });
    }
    onClose();
  };

  return (
    <Menu
      opened={opened}
      onClose={onClose}
      position="bottom-end"
      withinPortal
      shadow="lg"
    >
      <Menu.Target>
        {children}
      </Menu.Target>

      <Menu.Dropdown
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          minWidth: 200,
        }}
      >
        {isAdmin && (
          <>
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              onClick={handleServerSettings}
            >
              Server Settings
            </Menu.Item>
            <Menu.Divider />
          </>
        )}

        <Menu.Item
          leftSection={<IconHash size={16} />}
          onClick={handleCreateChannel}
        >
          Create Channel
        </Menu.Item>

        <Menu.Item
          leftSection={<IconFolder size={16} />}
          onClick={handleCreateCategory}
        >
          Create Category
        </Menu.Item>

        <Menu.Item
          leftSection={<IconUserPlus size={16} />}
          onClick={handleInvitePeople}
        >
          Invite People
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconDoorExit size={16} />}
          color="red"
          onClick={handleLeaveServer}
        >
          Leave Server
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
