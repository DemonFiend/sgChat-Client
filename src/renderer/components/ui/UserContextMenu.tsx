import { Menu } from '@mantine/core';
import { IconUser, IconMessage, IconUserPlus, IconUserMinus, IconVolume, IconVolumeOff, IconBan, IconLock, IconLockOpen, IconAlertTriangle, IconClock } from '@tabler/icons-react';
import { hasPermission } from '../../stores/permissions';

interface UserContextMenuProps {
  userId: string;
  username: string;
  isFriend?: boolean;
  isBlocked?: boolean;
  isCurrentUser?: boolean;
  opened: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onViewProfile?: () => void;
  onSendMessage?: () => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  onMute?: () => void;
  onKick?: () => void;
  onBan?: () => void;
  onWarn?: () => void;
  onTimeout?: () => void;
}

export function UserContextMenu({
  userId,
  username,
  isFriend,
  isBlocked,
  isCurrentUser,
  opened,
  position,
  onClose,
  onViewProfile,
  onSendMessage,
  onAddFriend,
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
  onMute,
  onKick,
  onBan,
  onWarn,
  onTimeout,
}: UserContextMenuProps) {
  if (!opened) return null;

  const canKick = hasPermission('kick_members');
  const canBan = hasPermission('ban_members');
  const canModerate = hasPermission('moderate_members');
  const canTimeout = hasPermission('timeout_members');

  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 1000,
      }}
    >
      <Menu opened={true} onClose={onClose} position="bottom-start" withinPortal={false}>
        <Menu.Dropdown style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <Menu.Label>{username}</Menu.Label>

          {onViewProfile && (
            <Menu.Item leftSection={<IconUser size={14} />} onClick={onViewProfile}>
              Profile
            </Menu.Item>
          )}

          {!isCurrentUser && onSendMessage && (
            <Menu.Item leftSection={<IconMessage size={14} />} onClick={onSendMessage}>
              Message
            </Menu.Item>
          )}

          {!isCurrentUser && !isFriend && onAddFriend && (
            <Menu.Item leftSection={<IconUserPlus size={14} />} onClick={onAddFriend} color="green">
              Add Friend
            </Menu.Item>
          )}

          {!isCurrentUser && isFriend && onRemoveFriend && (
            <Menu.Item leftSection={<IconUserMinus size={14} />} onClick={onRemoveFriend} color="red">
              Remove Friend
            </Menu.Item>
          )}

          {!isCurrentUser && (onMute || onBlockUser || onUnblockUser) && (
            <>
              <Menu.Divider />
              {onMute && (
                <Menu.Item leftSection={<IconVolumeOff size={14} />} onClick={onMute}>
                  Mute
                </Menu.Item>
              )}
              {!isBlocked && onBlockUser && (
                <Menu.Item leftSection={<IconLock size={14} />} onClick={onBlockUser} color="red">
                  Block
                </Menu.Item>
              )}
              {isBlocked && onUnblockUser && (
                <Menu.Item leftSection={<IconLockOpen size={14} />} onClick={onUnblockUser}>
                  Unblock
                </Menu.Item>
              )}
            </>
          )}

          {!isCurrentUser && (canModerate || canTimeout || canKick || canBan) && (
            <>
              <Menu.Divider />
              {canModerate && onWarn && (
                <Menu.Item leftSection={<IconAlertTriangle size={14} />} onClick={onWarn} color="yellow">
                  Warn {username}
                </Menu.Item>
              )}
              {canTimeout && onTimeout && (
                <Menu.Item leftSection={<IconClock size={14} />} onClick={onTimeout} color="orange">
                  Timeout {username}
                </Menu.Item>
              )}
              {canKick && onKick && (
                <Menu.Item leftSection={<IconUserMinus size={14} />} onClick={onKick} color="red">
                  Kick {username}
                </Menu.Item>
              )}
              {canBan && onBan && (
                <Menu.Item leftSection={<IconBan size={14} />} onClick={onBan} color="red">
                  Ban {username}
                </Menu.Item>
              )}
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
