import { useState, useRef, useEffect } from 'react';
import { Badge, Group, Popover, Text, TextInput, Tooltip } from '@mantine/core';
import { IconPencil, IconUsers } from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { getSocket } from '../../api/socket';
import { VoiceControls } from './VoiceControls';
import { PingIndicator } from './PingIndicator';
import { VoiceParticipantsList } from './VoiceParticipantsList';

interface VoiceConnectedBarProps {
  compact?: boolean;
}

export function VoiceConnectedBar({ compact }: VoiceConnectedBarProps) {
  const connected = useVoiceStore((s) => s.connected);
  const channelName = useVoiceStore((s) => s.channelName);
  const connectionState = useVoiceStore((s) => s.connectionState);
  const qualityStabilized = useVoiceStore((s) => s.qualityStabilized);
  const participants = useVoiceStore((s) => s.participants);

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const statusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingStatus) {
      statusInputRef.current?.focus();
    }
  }, [editingStatus]);

  if (!connected && connectionState !== 'connecting' && connectionState !== 'reconnecting') {
    return null;
  }

  const statusLabel =
    connectionState === 'connecting' ? 'Connecting...' :
    connectionState === 'reconnecting' ? 'Reconnecting...' :
    !qualityStabilized ? 'Connecting...' :
    'Voice Connected';

  const statusColor =
    connectionState === 'connected' && qualityStabilized ? 'var(--accent)' :
    connectionState === 'reconnecting' ? 'var(--warning)' :
    'var(--text-muted)';

  const handleStatusEditStart = () => {
    setStatusDraft(voiceStatus);
    setEditingStatus(true);
  };

  const handleStatusSave = () => {
    const trimmed = statusDraft.trim();
    setVoiceStatus(trimmed);
    setEditingStatus(false);
    getSocket()?.emit('voice:setStatus', { status: trimmed });
  };

  const handleStatusCancel = () => {
    setEditingStatus(false);
    setStatusDraft('');
  };

  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      borderTop: '1px solid var(--border)',
      padding: compact ? 8 : '8px 12px',
      flexShrink: 0,
    }}>
      <Group gap={8} mb={compact ? 6 : 4}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor,
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6}>
            <Text size="xs" fw={600} style={{ color: statusColor }} truncate>
              {statusLabel}
            </Text>
            <PingIndicator size={12} />
          </Group>
          {channelName && (
            <Group gap={6}>
              <Text size="xs" c="dimmed" truncate>
                {channelName}
              </Text>
              {connected && participants.length > 0 && (
                <Popover opened={participantsOpen} onChange={setParticipantsOpen} position="top" withArrow shadow="md">
                  <Popover.Target>
                    <Badge
                      size="xs"
                      variant="filled"
                      color="brand"
                      leftSection={<IconUsers size={10} />}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setParticipantsOpen((o) => !o)}
                    >
                      {participants.length}
                    </Badge>
                  </Popover.Target>
                  <Popover.Dropdown style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: 8 }}>
                    <VoiceParticipantsList participants={participants} compact />
                  </Popover.Dropdown>
                </Popover>
              )}
            </Group>
          )}
        </div>
      </Group>

      {/* Voice status — click to edit */}
      {editingStatus ? (
        <TextInput
          ref={statusInputRef}
          value={statusDraft}
          onChange={(e) => setStatusDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStatusSave();
            if (e.key === 'Escape') handleStatusCancel();
          }}
          onBlur={handleStatusSave}
          placeholder="Set a voice status..."
          size="xs"
          styles={{
            input: {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              fontSize: '0.65rem',
              height: 22,
            },
          }}
          mb={4}
        />
      ) : connected && (
        <Tooltip label="Click to set voice status" position="top" withArrow>
          <Group
            gap={4}
            mb={4}
            style={{ cursor: 'pointer' }}
            onClick={handleStatusEditStart}
          >
            <Text size="xs" c="dimmed" style={{ fontSize: '0.6rem', fontStyle: voiceStatus ? 'normal' : 'italic' }}>
              {voiceStatus || 'Set a status'}
            </Text>
            <IconPencil size={9} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          </Group>
        </Tooltip>
      )}

      <VoiceControls size={compact ? 28 : 32} />
    </div>
  );
}
