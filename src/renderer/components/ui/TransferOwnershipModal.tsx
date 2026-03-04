import { useState, useMemo } from 'react';
import { Alert, Avatar, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCrown } from '@tabler/icons-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface Member {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface TransferOwnershipModalProps {
  opened: boolean;
  onClose: () => void;
  serverId: string;
  currentOwnerId: string;
  members: Member[];
}

export function TransferOwnershipModal({
  opened,
  onClose,
  serverId,
  currentOwnerId,
  members,
}: TransferOwnershipModalProps) {
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const eligibleMembers = useMemo(
    () => members.filter((m) => m.id !== currentOwnerId),
    [members, currentOwnerId],
  );

  const filtered = useMemo(
    () =>
      eligibleMembers.filter(
        (m) =>
          m.username.toLowerCase().includes(search.toLowerCase()) ||
          m.display_name?.toLowerCase().includes(search.toLowerCase()),
      ),
    [eligibleMembers, search],
  );

  const handleTransfer = async () => {
    if (!selectedUser || confirmText !== 'TRANSFER') return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post(`/api/servers/${serverId}/transfer-ownership`, {
        new_owner_id: selectedUser.id,
      });
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedUser(null);
    setConfirmText('');
    setError(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Transfer Ownership" centered size="md">
      <Stack gap={16}>
        {step === 'select' ? (
          <>
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
              Transferring ownership will make the selected user the new server owner. You will lose all owner privileges.
            </Alert>

            <TextInput
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <Stack gap={4} style={{ maxHeight: 300, overflow: 'auto' }}>
              {filtered.map((member) => (
                <Group
                  key={member.id}
                  gap={8}
                  px={12}
                  py={8}
                  onClick={() => {
                    setSelectedUser(member);
                    setStep('confirm');
                  }}
                  style={{
                    borderRadius: 4,
                    background: 'var(--bg-hover)',
                    cursor: 'pointer',
                  }}
                >
                  <Avatar src={member.avatar_url} size={28} radius="xl" color="brand">
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm" style={{ flex: 1 }}>
                    {member.display_name || member.username}
                  </Text>
                  <IconCrown size={14} style={{ color: 'var(--text-muted)' }} />
                </Group>
              ))}
              {filtered.length === 0 && (
                <Text c="dimmed" size="sm" ta="center" py={16}>
                  No eligible members found.
                </Text>
              )}
            </Stack>
          </>
        ) : (
          <>
            <Alert color="red" icon={<IconAlertTriangle size={16} />} variant="light">
              You are about to transfer ownership to <strong>{selectedUser?.display_name || selectedUser?.username}</strong>.
              This action cannot be easily undone.
            </Alert>

            <Text size="sm">
              Type <strong>TRANSFER</strong> to confirm:
            </Text>
            <TextInput
              value={confirmText}
              onChange={(e) => setConfirmText(e.currentTarget.value)}
              placeholder="TRANSFER"
              styles={{ input: { fontFamily: 'monospace' } }}
            />

            {error && (
              <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
                {error}
              </Alert>
            )}

            <Group justify="flex-end" gap={8}>
              <Button variant="subtle" color="gray" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                color="red"
                onClick={handleTransfer}
                loading={isLoading}
                disabled={confirmText !== 'TRANSFER'}
              >
                Transfer Ownership
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
