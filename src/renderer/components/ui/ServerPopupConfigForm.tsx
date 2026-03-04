import { useState, useEffect } from 'react';
import { Button, Group, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useServerConfigStore, type ServerPopupConfig } from '../../stores/serverConfig';

interface ServerPopupConfigFormProps {
  serverId: string;
}

export function ServerPopupConfigForm({ serverId }: ServerPopupConfigFormProps) {
  const config = useServerConfigStore((s) => s.config);
  const isSaving = useServerConfigStore((s) => s.isSaving);
  const updatePopupConfig = useServerConfigStore((s) => s.updatePopupConfig);

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config?.popup_config) {
      setEnabled(config.popup_config.enabled);
      setTitle(config.popup_config.title || '');
      setBody(config.popup_config.body || '');
      setImageUrl(config.popup_config.image_url || '');
    }
  }, [config]);

  const handleSave = async () => {
    const popup: ServerPopupConfig = {
      enabled,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
    };
    await updatePopupConfig(serverId, popup);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Welcome Popup</Text>
      <Text size="sm" c="dimmed">
        Configure a welcome popup that displays when members enter the server.
        You can use {'{username}'} and {'{servername}'} as template variables.
      </Text>

      <Switch
        label="Enable Welcome Popup"
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
      />

      <TextInput
        label="Title"
        placeholder="Welcome to {servername}!"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        disabled={!enabled}
        maxLength={100}
      />

      <Textarea
        label="Body"
        placeholder="Hey {username}, welcome to our server! Check out #rules to get started."
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        disabled={!enabled}
        minRows={3}
        maxRows={6}
        autosize
        maxLength={1000}
      />

      <TextInput
        label="Image URL"
        placeholder="https://example.com/welcome-banner.png"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.currentTarget.value)}
        disabled={!enabled}
      />

      <Group>
        <Button onClick={handleSave} loading={isSaving}>
          {saved ? 'Saved!' : 'Save Popup Config'}
        </Button>
      </Group>
    </Stack>
  );
}
