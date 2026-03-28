import { useState, useEffect } from 'react';
import { Button, Group, Modal, TextInput } from '@mantine/core';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';

interface NicknameModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  currentNickname: string;
  serverId: string;
  /** 'self' = editing own nickname; 'admin' = admin editing another user's nickname */
  mode?: 'self' | 'admin';
  /** When mode is 'admin', the target user's ID to update */
  targetUserId?: string;
}

export function NicknameModal({ opened, onClose, userId, currentNickname, serverId, mode = 'self', targetUserId }: NicknameModalProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setNickname(currentNickname);
    }
  }, [opened, currentNickname]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'self') {
        // Self: PATCH own member nickname
        await api.patch(`/api/servers/${serverId}/members/me/nickname`, {
          nickname: nickname.trim() || null,
        });
      } else {
        // Admin: PATCH target user's member nickname
        const target = targetUserId || userId;
        await api.patch(`/api/servers/${serverId}/members/${target}/nickname`, {
          nickname: nickname.trim() || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['members', serverId] });
      toastStore.addToast({
        type: 'system',
        title: 'Nickname Updated',
        message: nickname.trim() ? `Nickname set to "${nickname.trim()}".` : 'Nickname has been reset.',
      });
      onClose();
    } catch (err) {
      toastStore.addToast({
        type: 'warning',
        title: 'Failed to Update Nickname',
        message: (err as Error)?.message || 'Could not update nickname.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNickname('');
  };

  const title = mode === 'admin' ? 'Change Nickname (Admin)' : 'Change Nickname';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="sm"
      transitionProps={{ transition: 'pop', duration: 200 }}
    >
      <TextInput
        label="Nickname"
        placeholder="Enter a nickname"
        value={nickname}
        onChange={(e) => setNickname(e.currentTarget.value)}
        maxLength={32}
        description={`${nickname.length}/32 characters`}
        mb={16}
      />

      <Group justify="flex-end">
        <Button variant="subtle" color="gray" onClick={handleReset} disabled={!nickname}>
          Reset
        </Button>
        <Button variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </Group>
    </Modal>
  );
}
