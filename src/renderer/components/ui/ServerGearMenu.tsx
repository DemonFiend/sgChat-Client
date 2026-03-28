import { useState } from 'react';
import { Button, Group, Menu, Modal, Stack, Text } from '@mantine/core';
import {
  IconSettings,
  IconHash,
  IconFolder,
  IconUserPlus,
  IconDoorExit,
  IconServer2,
} from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';

interface ServerGearMenuProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function ServerGearMenu({ opened, onClose, serverId, serverName, isAdmin, children }: ServerGearMenuProps) {
  const openAdminView = useUIStore((s) => s.openAdminView);
  const setView = useUIStore((s) => s.setView);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

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

  const handleRelayServers = () => {
    openAdminView('relay-servers');
    onClose();
  };

  const handleLeaveClick = () => {
    onClose();
    setLeaveConfirmOpen(true);
  };

  const handleLeaveConfirm = async () => {
    setLeaving(true);
    try {
      await api.post(`/api/servers/${serverId}/leave`);
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setView('servers');
      toastStore.addToast({
        type: 'system',
        title: 'Left Server',
        message: `Left ${serverName}`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not leave the server.';
      toastStore.addToast({
        type: 'warning',
        title: 'Failed to Leave',
        message,
      });
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
    }
  };

  return (
    <>
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

          {isAdmin && (
            <Menu.Item
              leftSection={<IconServer2 size={16} />}
              onClick={handleRelayServers}
            >
              Relay Servers
            </Menu.Item>
          )}

          <Menu.Divider />

          <Menu.Item
            leftSection={<IconDoorExit size={16} />}
            color="red"
            onClick={handleLeaveClick}
          >
            Leave Server
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Leave server confirmation modal */}
      <Modal
        opened={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title={`Leave '${serverName}'`}
        centered
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm" c="dimmed">
            Are you sure you want to leave <Text span fw={600}>{serverName}</Text>?
            You will need a new invite to rejoin.
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleLeaveConfirm}
              loading={leaving}
            >
              Leave Server
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
