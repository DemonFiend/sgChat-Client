import { useState, useEffect, useRef, useCallback } from 'react';
import { ActionIcon, Group, Loader, Stack, Text } from '@mantine/core';
import { IconCheck, IconMinus, IconX } from '@tabler/icons-react';

interface ChannelPermissionEditorProps {
  channelType: string;
  textAllow: string;
  textDeny: string;
  voiceAllow: string;
  voiceDeny: string;
  onSave: (values: {
    text_allow: string;
    text_deny: string;
    voice_allow: string;
    voice_deny: string;
  }) => Promise<void>;
}

type PermState = 'allow' | 'neutral' | 'deny';

const TEXT_PERMS = [
  { bit: 0, label: 'View Channel', description: 'See the channel in the list' },
  { bit: 1, label: 'Send Messages', description: 'Send messages in channels' },
  { bit: 2, label: 'Send TTS', description: 'Send text-to-speech messages' },
  { bit: 3, label: 'Read History', description: 'Read past messages' },
  { bit: 4, label: 'Embed Links', description: 'Post links with previews' },
  { bit: 5, label: 'Attach Files', description: 'Upload files and images' },
  { bit: 6, label: 'External Emojis', description: 'Use emojis from other servers' },
  { bit: 7, label: 'External Stickers', description: 'Use stickers from other servers' },
  { bit: 8, label: 'Add Reactions', description: 'React to messages' },
  { bit: 9, label: 'Mention @everyone', description: 'Use @everyone and @here' },
  { bit: 10, label: 'Mention Roles', description: 'Mention any role' },
  { bit: 11, label: 'Manage Messages', description: "Delete/pin others' messages" },
  { bit: 12, label: 'Delete Own Messages', description: 'Delete own messages' },
  { bit: 13, label: 'Edit Own Messages', description: 'Edit own messages' },
  { bit: 14, label: 'Create Public Threads', description: 'Create public threads' },
  { bit: 15, label: 'Create Private Threads', description: 'Create private threads' },
  { bit: 16, label: 'Send in Threads', description: 'Send messages in threads' },
  { bit: 17, label: 'Manage Threads', description: 'Archive and delete threads' },
  { bit: 18, label: 'App Commands', description: 'Use slash commands' },
  { bit: 19, label: 'Manage Webhooks', description: 'Manage channel webhooks' },
  { bit: 20, label: 'Bypass Slowmode', description: 'Ignore slowmode restrictions' },
];

const VOICE_PERMS = [
  { bit: 0, label: 'Connect', description: 'Join voice channels' },
  { bit: 1, label: 'View Channel', description: 'See the voice channel' },
  { bit: 2, label: 'Speak', description: 'Transmit audio' },
  { bit: 3, label: 'Video', description: 'Share camera' },
  { bit: 4, label: 'Stream', description: 'Screen share' },
  { bit: 5, label: 'Voice Activity', description: 'Use voice activity detection' },
  { bit: 6, label: 'Priority Speaker', description: "Lower others' volume when speaking" },
  { bit: 7, label: 'Use Soundboard', description: 'Play soundboard sounds' },
  { bit: 8, label: 'External Sounds', description: 'Use sounds from other servers' },
  { bit: 9, label: 'Mute Members', description: 'Server mute others' },
  { bit: 10, label: 'Deafen Members', description: 'Server deafen others' },
  { bit: 11, label: 'Move Members', description: 'Move members between channels' },
  { bit: 12, label: 'Disconnect Members', description: 'Disconnect from voice' },
  { bit: 13, label: 'Request to Speak', description: 'Request in stage channels' },
  { bit: 14, label: 'Manage Stage', description: 'Manage stage speakers' },
  { bit: 15, label: 'Manage Voice Channel', description: 'Edit voice channel settings' },
  { bit: 16, label: 'Set Voice Status', description: 'Set a custom voice channel status' },
];

export function ChannelPermissionEditor({
  channelType,
  textAllow: textAllowProp,
  textDeny: textDenyProp,
  voiceAllow: voiceAllowProp,
  voiceDeny: voiceDenyProp,
  onSave,
}: ChannelPermissionEditorProps) {
  const [textAllow, setTextAllow] = useState(BigInt(textAllowProp || '0'));
  const [textDeny, setTextDeny] = useState(BigInt(textDenyProp || '0'));
  const [voiceAllow, setVoiceAllow] = useState(BigInt(voiceAllowProp || '0'));
  const [voiceDeny, setVoiceDeny] = useState(BigInt(voiceDenyProp || '0'));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const showText = channelType === 'text' || channelType === 'announcement' || channelType === 'category';
  const showVoice = channelType === 'voice' || channelType === 'temp_voice_generator' || channelType === 'music' || channelType === 'category';

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave({
          text_allow: textAllow.toString(),
          text_deny: textDeny.toString(),
          voice_allow: voiceAllow.toString(),
          voice_deny: voiceDeny.toString(),
        });
        setSaveStatus('saved');
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 600);
  }, [textAllow, textDeny, voiceAllow, voiceDeny, onSave]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scheduleAutoSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleAutoSave intentionally excluded; we only want to fire on state changes
  }, [textAllow, textDeny, voiceAllow, voiceDeny]);

  const getState = (allow: bigint, deny: bigint, bit: number): PermState => {
    const flag = 1n << BigInt(bit);
    if ((allow & flag) !== 0n) return 'allow';
    if ((deny & flag) !== 0n) return 'deny';
    return 'neutral';
  };

  const setState = (
    setAllow: React.Dispatch<React.SetStateAction<bigint>>,
    setDenyFn: React.Dispatch<React.SetStateAction<bigint>>,
    bit: number,
    state: PermState,
  ) => {
    const flag = 1n << BigInt(bit);
    switch (state) {
      case 'allow':
        setAllow((prev) => prev | flag);
        setDenyFn((prev) => prev & ~flag);
        break;
      case 'neutral':
        setAllow((prev) => prev & ~flag);
        setDenyFn((prev) => prev & ~flag);
        break;
      case 'deny':
        setAllow((prev) => prev & ~flag);
        setDenyFn((prev) => prev | flag);
        break;
    }
  };

  return (
    <Stack gap={12} py={8}>
      <Group justify="flex-end" gap={4}>
        {saveStatus === 'saving' && (
          <Group gap={4}>
            <Loader size={12} />
            <Text size="xs" c="dimmed">Saving...</Text>
          </Group>
        )}
        {saveStatus === 'saved' && (
          <Group gap={4}>
            <IconCheck size={12} color="var(--mantine-color-green-5)" />
            <Text size="xs" c="green">Saved</Text>
          </Group>
        )}
        {saveStatus === 'error' && (
          <Group gap={4}>
            <IconX size={12} color="var(--mantine-color-red-5)" />
            <Text size="xs" c="red">Failed to save</Text>
          </Group>
        )}
      </Group>

      {showText && (
        <>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Text Channel Permissions</Text>
          <Stack gap={2}>
            {TEXT_PERMS.map((perm) => (
              <PermissionRow
                key={`text-${perm.bit}`}
                label={perm.label}
                description={perm.description}
                state={getState(textAllow, textDeny, perm.bit)}
                onStateChange={(s) => setState(setTextAllow, setTextDeny, perm.bit, s)}
              />
            ))}
          </Stack>
        </>
      )}

      {showVoice && (
        <>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">Voice Channel Permissions</Text>
          <Stack gap={2}>
            {VOICE_PERMS.map((perm) => (
              <PermissionRow
                key={`voice-${perm.bit}`}
                label={perm.label}
                description={perm.description}
                state={getState(voiceAllow, voiceDeny, perm.bit)}
                onStateChange={(s) => setState(setVoiceAllow, setVoiceDeny, perm.bit, s)}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}

function PermissionRow({
  label,
  description,
  state,
  onStateChange,
}: {
  label: string;
  description: string;
  state: PermState;
  onStateChange: (state: PermState) => void;
}) {
  return (
    <Group
      gap={8}
      px={8}
      py={4}
      style={{ borderRadius: 4 }}
      wrap="nowrap"
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm">{label}</Text>
        <Text size="xs" c="dimmed" truncate>{description}</Text>
      </div>
      <Group gap={2} wrap="nowrap">
        <ActionIcon
          variant={state === 'deny' ? 'filled' : 'subtle'}
          color={state === 'deny' ? 'red' : 'gray'}
          size={24}
          onClick={() => onStateChange(state === 'deny' ? 'neutral' : 'deny')}
        >
          <IconX size={12} />
        </ActionIcon>
        <ActionIcon
          variant={state === 'neutral' ? 'light' : 'subtle'}
          color="gray"
          size={24}
          onClick={() => onStateChange('neutral')}
          style={state === 'neutral' ? { outline: '1px solid var(--border)' } : undefined}
        >
          <IconMinus size={12} />
        </ActionIcon>
        <ActionIcon
          variant={state === 'allow' ? 'filled' : 'subtle'}
          color={state === 'allow' ? 'green' : 'gray'}
          size={24}
          onClick={() => onStateChange(state === 'allow' ? 'neutral' : 'allow')}
        >
          <IconCheck size={12} />
        </ActionIcon>
      </Group>
    </Group>
  );
}
