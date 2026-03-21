import { useState } from 'react';
import { Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconClock,
  IconPencil,
  IconUserMinus,
  IconBan,
  IconAlertTriangle,
  IconList,
} from '@tabler/icons-react';
import { api } from '../../lib/api';
import { toastStore } from '../../stores/toastNotifications';
import { TimeoutModal } from './TimeoutModal';
import { NicknameModal } from './NicknameModal';

interface AdminMenuProps {
  userId: string;
  username: string;
  serverId: string;
  position: { x: number; y: number };
  onClose: () => void;
  currentNickname?: string;
  permissions: {
    canTimeout?: boolean;
    canKick?: boolean;
    canBan?: boolean;
    canWarn?: boolean;
    canViewWarnings?: boolean;
    canChangeNickname?: boolean;
  };
}

interface MenuAction {
  label: string;
  icon: React.ReactNode;
  color?: string;
  permKey: keyof AdminMenuProps['permissions'];
  onClick: () => void;
}

export function AdminMenu({
  userId,
  username,
  serverId,
  position,
  onClose,
  currentNickname,
  permissions,
}: AdminMenuProps) {
  const [timeoutOpen, setTimeoutOpen] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [kickConfirm, setKickConfirm] = useState(false);
  const [banConfirm, setBanConfirm] = useState(false);

  const handleKick = async () => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/kick`);
      toastStore.addToast({
        type: 'system',
        title: 'User Kicked',
        message: `${username} has been kicked from the server.`,
      });
      onClose();
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Kick Failed',
        message: (err as any)?.message || 'Could not kick user.',
      });
    }
  };

  const handleBan = async () => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/ban`);
      toastStore.addToast({
        type: 'system',
        title: 'User Banned',
        message: `${username} has been banned from the server.`,
      });
      onClose();
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Ban Failed',
        message: (err as any)?.message || 'Could not ban user.',
      });
    }
  };

  const handleWarn = async () => {
    try {
      await api.post(`/api/servers/${serverId}/members/${userId}/warn`, {
        reason: 'Warned by moderator',
      });
      toastStore.addToast({
        type: 'system',
        title: 'User Warned',
        message: `${username} has been warned.`,
      });
      onClose();
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Warn Failed',
        message: (err as any)?.message || 'Could not warn user.',
      });
    }
  };

  const actions: MenuAction[] = [
    {
      label: 'Timeout',
      icon: <IconClock size={16} />,
      permKey: 'canTimeout',
      onClick: () => setTimeoutOpen(true),
    },
    {
      label: 'Change Nickname',
      icon: <IconPencil size={16} />,
      permKey: 'canChangeNickname',
      onClick: () => setNicknameOpen(true),
    },
    {
      label: 'Warn',
      icon: <IconAlertTriangle size={16} />,
      permKey: 'canWarn',
      onClick: handleWarn,
    },
    {
      label: 'View Warnings',
      icon: <IconList size={16} />,
      permKey: 'canViewWarnings',
      onClick: () => {
        // TODO: open warnings panel
        onClose();
      },
    },
    {
      label: kickConfirm ? 'Confirm Kick' : 'Kick',
      icon: <IconUserMinus size={16} />,
      color: 'var(--danger)',
      permKey: 'canKick',
      onClick: () => {
        if (kickConfirm) {
          handleKick();
        } else {
          setKickConfirm(true);
          setBanConfirm(false);
        }
      },
    },
    {
      label: banConfirm ? 'Confirm Ban' : 'Ban',
      icon: <IconBan size={16} />,
      color: 'var(--danger)',
      permKey: 'canBan',
      onClick: () => {
        if (banConfirm) {
          handleBan();
        } else {
          setBanConfirm(true);
          setKickConfirm(false);
        }
      },
    },
  ];

  const visibleActions = actions.filter((a) => permissions[a.permKey]);

  if (visibleActions.length === 0) return null;

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />

      <Paper
        shadow="lg"
        radius="md"
        p={6}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          minWidth: 180,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <Text size="xs" c="dimmed" px={8} py={4} fw={600}>
          Admin Actions
        </Text>
        <Stack gap={2}>
          {visibleActions.map((action) => (
            <UnstyledButton
              key={action.label}
              px={8}
              py={6}
              style={{
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: action.color || 'var(--text-primary)',
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={action.onClick}
            >
              {action.icon}
              <Text size="sm" style={{ color: 'inherit' }}>
                {action.label}
              </Text>
            </UnstyledButton>
          ))}
        </Stack>
      </Paper>

      <TimeoutModal
        opened={timeoutOpen}
        onClose={() => {
          setTimeoutOpen(false);
          onClose();
        }}
        userId={userId}
        username={username}
        serverId={serverId}
      />

      <NicknameModal
        opened={nicknameOpen}
        onClose={() => {
          setNicknameOpen(false);
          onClose();
        }}
        userId={userId}
        currentNickname={currentNickname || ''}
        serverId={serverId}
      />
    </>
  );
}
