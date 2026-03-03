import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Divider, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useUIStore } from '../../stores/uiStore';

interface ChannelSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  channelId: string;
  serverId: string;
}

interface ChannelData {
  id: string;
  name: string;
  topic?: string;
  type: string;
  position: number;
  category_id?: string;
}

export function ChannelSettingsModal({ opened, onClose, channelId, serverId }: ChannelSettingsModalProps) {
  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api.get<ChannelData>(`/api/channels/${channelId}`),
    enabled: opened && !!channelId,
  });

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setActiveChannel = useUIStore((s) => s.setActiveChannel);

  useEffect(() => {
    if (channel) {
      setName(channel.name || '');
      setTopic(channel.topic || '');
    }
  }, [channel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/channels/${channelId}`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        topic: topic.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
      onClose();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/channels/${channelId}`);
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
      setActiveChannel(null);
      onClose();
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Channel Settings — #${channel?.name || ''}`}
      centered
      size="md"
    >
      <Stack gap={16}>
        <TextInput
          label="Channel Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          description="Lowercase, no spaces (hyphens will replace spaces)"
        />

        <Textarea
          label="Channel Topic"
          description="Describe what this channel is for"
          value={topic}
          onChange={(e) => setTopic(e.currentTarget.value)}
          minRows={2}
          maxRows={4}
          autosize
        />

        <Group>
          <Button onClick={handleSave} loading={saving} disabled={!name.trim()}>
            Save Changes
          </Button>
        </Group>

        <Divider style={{ borderColor: 'var(--border)' }} />

        {/* Danger zone */}
        <div style={{
          padding: 12,
          borderRadius: 6,
          border: '1px solid var(--danger)',
          background: 'var(--danger-bg)',
        }}>
          <Text size="sm" fw={600} mb={8}>Danger Zone</Text>
          {!deleteConfirm ? (
            <Button
              color="red"
              variant="outline"
              leftSection={<IconTrash size={14} />}
              onClick={() => setDeleteConfirm(true)}
            >
              Delete Channel
            </Button>
          ) : (
            <Stack gap={8}>
              <Text size="sm">Are you sure? This will permanently delete <strong>#{channel?.name}</strong> and all its messages.</Text>
              <Group gap={8}>
                <Button color="red" onClick={handleDelete} loading={deleting}>
                  Yes, Delete
                </Button>
                <Button variant="subtle" color="gray" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          )}
        </div>
      </Stack>
    </Modal>
  );
}
