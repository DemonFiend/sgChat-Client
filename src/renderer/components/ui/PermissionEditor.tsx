import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconMinus, IconX } from '@tabler/icons-react';

interface PermissionEntry {
  key: string;
  label: string;
  description: string;
  category: 'general' | 'text' | 'voice';
}

const PERMISSION_ENTRIES: PermissionEntry[] = [
  { key: 'view_channels', label: 'View Channels', description: 'Allows viewing channels', category: 'general' },
  { key: 'manage_channels', label: 'Manage Channels', description: 'Create, edit, and delete channels', category: 'general' },
  { key: 'manage_roles', label: 'Manage Roles', description: 'Create and edit roles below theirs', category: 'general' },
  { key: 'manage_server', label: 'Manage Server', description: 'Edit server name, icon, and settings', category: 'general' },
  { key: 'create_invites', label: 'Create Invites', description: 'Create invite links', category: 'general' },
  { key: 'kick_members', label: 'Kick Members', description: 'Remove members from the server', category: 'general' },
  { key: 'ban_members', label: 'Ban Members', description: 'Permanently ban members', category: 'general' },
  { key: 'manage_nicknames', label: 'Manage Nicknames', description: 'Change other members\' nicknames', category: 'general' },
  { key: 'view_audit_log', label: 'View Audit Log', description: 'View the server audit log', category: 'general' },
  { key: 'send_messages', label: 'Send Messages', description: 'Send messages in text channels', category: 'text' },
  { key: 'manage_messages', label: 'Manage Messages', description: 'Delete or pin other users\' messages', category: 'text' },
  { key: 'attach_files', label: 'Attach Files', description: 'Upload files and images', category: 'text' },
  { key: 'add_reactions', label: 'Add Reactions', description: 'Add reactions to messages', category: 'text' },
  { key: 'mention_everyone', label: 'Mention @everyone', description: 'Use @everyone and @here', category: 'text' },
  { key: 'connect', label: 'Connect', description: 'Join voice channels', category: 'voice' },
  { key: 'speak', label: 'Speak', description: 'Speak in voice channels', category: 'voice' },
  { key: 'mute_members', label: 'Mute Members', description: 'Server mute other members', category: 'voice' },
  { key: 'deafen_members', label: 'Deafen Members', description: 'Server deafen other members', category: 'voice' },
  { key: 'move_members', label: 'Move Members', description: 'Move members between channels', category: 'voice' },
];

type PermissionState = 'allow' | 'neutral' | 'deny';

interface PermissionEditorProps {
  permissions: Record<string, PermissionState>;
  onChange: (permissions: Record<string, PermissionState>) => void;
  channelType?: 'text' | 'voice';
}

export function PermissionEditor({ permissions, onChange, channelType }: PermissionEditorProps) {
  const entries = useMemo(() => {
    if (!channelType) return PERMISSION_ENTRIES;
    return PERMISSION_ENTRIES.filter(
      (e) => e.category === 'general' || e.category === channelType,
    );
  }, [channelType]);

  const categories = useMemo(() => {
    const grouped: Record<string, PermissionEntry[]> = {};
    for (const entry of entries) {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push(entry);
    }
    return grouped;
  }, [entries]);

  const handleToggle = (key: string) => {
    const current = permissions[key] || 'neutral';
    const next: PermissionState =
      current === 'neutral' ? 'allow' : current === 'allow' ? 'deny' : 'neutral';
    onChange({ ...permissions, [key]: next });
  };

  const categoryLabels: Record<string, string> = {
    general: 'General Permissions',
    text: 'Text Channel Permissions',
    voice: 'Voice Channel Permissions',
  };

  return (
    <Stack gap={16}>
      {Object.entries(categories).map(([cat, catEntries]) => (
        <div key={cat}>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
            {categoryLabels[cat] || cat}
          </Text>
          <Stack gap={2}>
            {catEntries.map((entry) => (
              <PermissionRow
                key={entry.key}
                entry={entry}
                state={permissions[entry.key] || 'neutral'}
                onToggle={() => handleToggle(entry.key)}
              />
            ))}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}

function PermissionRow({
  entry,
  state,
  onToggle,
}: {
  entry: PermissionEntry;
  state: PermissionState;
  onToggle: () => void;
}) {
  return (
    <Group
      gap={8}
      px={8}
      py={6}
      style={{ borderRadius: 4, background: 'var(--bg-hover)' }}
      wrap="nowrap"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{entry.label}</Text>
        <Text size="xs" c="dimmed">{entry.description}</Text>
      </div>
      <Tooltip label={state === 'allow' ? 'Allowed' : state === 'deny' ? 'Denied' : 'Neutral'} withArrow>
        <ActionIcon
          variant={state === 'neutral' ? 'subtle' : 'filled'}
          color={state === 'allow' ? 'green' : state === 'deny' ? 'red' : 'gray'}
          size={28}
          onClick={onToggle}
        >
          {state === 'allow' ? (
            <IconCheck size={14} />
          ) : state === 'deny' ? (
            <IconX size={14} />
          ) : (
            <IconMinus size={14} />
          )}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
