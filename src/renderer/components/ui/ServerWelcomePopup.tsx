import { useState, useEffect } from 'react';
import { Button, Center, Modal, Stack, Text } from '@mantine/core';
import { useServerPopupStore } from '../../stores/serverPopup';
import type { ServerPopupConfig } from '../../stores/serverConfig';
import { renderMarkdown } from '../../lib/markdownParser';

interface ServerWelcomePopupProps {
  serverId: string;
  serverName: string;
  popupConfig?: ServerPopupConfig;
  username?: string;
}

function LiveClock({ timezone }: { timezone: string }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      try {
        setTime(
          new Date().toLocaleTimeString([], {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        );
      } catch {
        setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  return (
    <Text size="xs" c="dimmed" ta="center">
      Server time: {time}
    </Text>
  );
}

export function ServerWelcomePopup({ serverId, serverName, popupConfig, username }: ServerWelcomePopupProps) {
  const visibleServerId = useServerPopupStore((s) => s.visibleServerId);
  const dismiss = useServerPopupStore((s) => s.dismiss);

  if (!popupConfig?.enabled || visibleServerId !== serverId) return null;

  // Template variable substitution
  const replaceVars = (text: string) => {
    const now = new Date();
    let serverTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (popupConfig.timezone) {
      try {
        serverTimeStr = now.toLocaleTimeString([], {
          timeZone: popupConfig.timezone,
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch { /* fallback to local time */ }
    }
    return text
      .replace(/\{username\}/g, username || 'User')
      .replace(/\{servername\}/g, serverName)
      .replace(/\{servertime\}/g, serverTimeStr);
  };

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
          <div style={{ lineHeight: 1.6, fontSize: 14 }}>
            {renderMarkdown(body, true)}
          </div>
        )}

        {popupConfig.show_clock && popupConfig.timezone && (
          <LiveClock timezone={popupConfig.timezone} />
        )}

        <Button onClick={dismiss} fullWidth>
          Got it!
        </Button>
      </Stack>
    </Modal>
  );
}
