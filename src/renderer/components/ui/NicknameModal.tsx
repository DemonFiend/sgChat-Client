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
}

export function NicknameModal({ opened, onClose, userId, currentNickname, serverId }: NicknameModalProps) {
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
      await api.patch(`/api/servers/${serverId}/members/${userId}`, {
        nickname: nickname.trim() || null,
      });
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
        message: (err as any)?.message || 'Could not update nickname.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNickname('');
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Change Nickname"
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
