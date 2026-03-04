import { ActionIcon, Tooltip } from '@mantine/core';
import { IconScreenShare, IconScreenShareOff } from '@tabler/icons-react';
import { useVoiceStore } from '../../stores/voiceStore';

export function ScreenShareButton({ size = 28 }: { size?: number }) {
  const isSharing = useVoiceStore((s) => s.screenShare.isSharing);
  const toggleScreenShare = useVoiceStore((s) => s.toggleScreenShare);
  const canStream = useVoiceStore((s) => s.permissions?.canStream ?? false);

  if (!canStream) return null;

  return (
    <Tooltip label={isSharing ? 'Stop Sharing' : 'Share Screen'} position="top" withArrow>
      <ActionIcon
        variant={isSharing ? 'filled' : 'subtle'}
        color={isSharing ? 'green' : 'gray'}
        size={size}
        onClick={toggleScreenShare}
      >
        {isSharing ? <IconScreenShareOff size={size * 0.57} /> : <IconScreenShare size={size * 0.57} />}
      </ActionIcon>
    </Tooltip>
  );
}
