import { Button, Center, Modal, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useServerPopupStore } from '../../stores/serverPopup';
import type { ServerPopupConfig } from '../../stores/serverConfig';

interface ServerWelcomePopupProps {
  serverId: string;
  serverName: string;
  popupConfig?: ServerPopupConfig;
  username?: string;
}

export function ServerWelcomePopup({ serverId, serverName, popupConfig, username }: ServerWelcomePopupProps) {
  const visibleServerId = useServerPopupStore((s) => s.visibleServerId);
  const dismiss = useServerPopupStore((s) => s.dismiss);

  if (!popupConfig?.enabled || visibleServerId !== serverId) return null;

  // Template variable substitution
  const replaceVars = (text: string) =>
    text
      .replace(/\{username\}/g, username || 'User')
      .replace(/\{servername\}/g, serverName);

  const title = popupConfig.title ? replaceVars(popupConfig.title) : `Welcome to ${serverName}!`;
  const body = popupConfig.body ? replaceVars(popupConfig.body) : '';

  return (
    <Modal
      opened
      onClose={dismiss}
      title={title}
      centered
      size="md"
      styles={{
        header: { borderBottom: '1px solid var(--border)' },
      }}
    >
      <Stack gap={16} py={8}>
        {popupConfig.image_url && (
          <Center>
            <img
              src={popupConfig.image_url}
              alt="Server banner"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 8,
                objectFit: 'cover',
              }}
            />
          </Center>
        )}

        {body && (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {body}
          </Text>
        )}

        <Button onClick={dismiss} fullWidth>
          Got it!
        </Button>
      </Stack>
    </Modal>
  );
}
