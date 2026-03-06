import { ActionIcon, Badge, Group, Menu, Text, Tooltip } from '@mantine/core';
import {
  IconScreenShare, IconScreenShareOff,
  IconSettings, IconCheck, IconDeviceDesktop,
} from '@tabler/icons-react';
import { useVoiceStore, type ScreenShareQuality } from '../../stores/voiceStore';

const QUALITY_OPTIONS: {
  key: ScreenShareQuality;
  label: string;
  detail: string;
  badge: string;
  color: string;
}[] = [
  { key: 'standard', label: 'Standard', detail: '720p @ 30fps', badge: 'SD', color: 'blue' },
  { key: 'high', label: 'High Quality', detail: '1080p @ 60fps', badge: 'HD', color: 'violet' },
  { key: 'native', label: 'Native', detail: 'Full resolution', badge: '4K', color: 'green' },
];

export function ScreenShareButton({ size = 28 }: { size?: number }) {
  const isSharing = useVoiceStore((s) => s.screenShare.isSharing);
  const quality = useVoiceStore((s) => s.screenShare.quality);
  const startScreenShare = useVoiceStore((s) => s.startScreenShare);
  const stopScreenShare = useVoiceStore((s) => s.stopScreenShare);
  const canStream = useVoiceStore((s) => s.permissions?.canStream ?? false);

  if (!canStream) return null;

  const handleQualitySelect = async (q: ScreenShareQuality) => {
    if (isSharing) {
      await stopScreenShare();
    }
    await startScreenShare(q);
  };

  return (
    <Group gap={2}>
      {/* Main button — stop if sharing, quality menu if not */}
      {isSharing ? (
        <Tooltip label="Stop Sharing" position="top" withArrow>
          <ActionIcon
            variant="filled"
            color="green"
            size={size}
            onClick={() => stopScreenShare()}
          >
            <IconScreenShareOff size={size * 0.57} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Menu position="top" withArrow>
          <Menu.Target>
            <Tooltip label="Share Screen" position="top" withArrow>
              <ActionIcon variant="subtle" color="gray" size={size}>
                <IconScreenShare size={size * 0.57} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Select Quality</Menu.Label>
            {QUALITY_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.key}
                leftSection={<Badge size="xs" color={opt.color}>{opt.badge}</Badge>}
                onClick={() => handleQualitySelect(opt.key)}
              >
                <Text size="sm" fw={500}>{opt.label}</Text>
                <Text size="xs" c="dimmed">{opt.detail}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}

      {/* Settings button when sharing — change quality live */}
      {isSharing && (
        <Menu position="top" withArrow>
          <Menu.Target>
            <Tooltip label="Stream Settings" position="top" withArrow>
              <ActionIcon variant="subtle" color="gray" size={size}>
                <IconSettings size={size * 0.57} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Change Quality</Menu.Label>
            {QUALITY_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.key}
                leftSection={<Badge size="xs" color={opt.color}>{opt.badge}</Badge>}
                rightSection={quality === opt.key ? <IconCheck size={14} color="var(--mantine-color-green-5)" /> : null}
                onClick={() => handleQualitySelect(opt.key)}
              >
                <Text size="sm" fw={500}>{opt.label}</Text>
                <Text size="xs" c="dimmed">{opt.detail}</Text>
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconDeviceDesktop size={16} />}
              onClick={async () => { await stopScreenShare(); await startScreenShare(quality); }}
            >
              <Text size="sm" fw={500}>Change Source</Text>
              <Text size="xs" c="dimmed">Pick a different window or screen</Text>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
