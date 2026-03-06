import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Group, Modal, SegmentedControl, SimpleGrid, Stack, Tabs, Text } from '@mantine/core';
import { IconDeviceDesktop, IconApps } from '@tabler/icons-react';

const electronAPI = (window as any).electronAPI;

type AudioMode = 'none' | 'app' | 'system';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
  display_id: string;
}

export function ScreenSharePicker() {
  const [opened, setOpened] = useState(false);
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('screens');
  const [audioMode, setAudioMode] = useState<AudioMode>('none');
  const [appAudioSupported, setAppAudioSupported] = useState(false);

  // Check if per-app audio is supported on this platform
  useEffect(() => {
    electronAPI?.appAudio?.isSupported?.().then((supported: boolean) => {
      setAppAudioSupported(supported);
    });
  }, []);

  // Listen for pick requests from main process
  useEffect(() => {
    if (!electronAPI?.screenShare?.onPickRequest) return;

    const cleanup = electronAPI.screenShare.onPickRequest((incoming: ScreenSource[]) => {
      setSources(incoming);
      setSelectedId(null);
      setActiveTab('screens');
      setAudioMode('none');
      setOpened(true);
    });

    return cleanup;
  }, []);

  // Derive selected source info
  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedId) ?? null,
    [sources, selectedId],
  );
  const isSelectedWindow = selectedSource?.display_id === '';

  // When selecting a source, auto-pick a sensible audio default
  const handleSourceSelect = useCallback((sourceId: string) => {
    setSelectedId(sourceId);
    const source = sources.find((s) => s.id === sourceId);
    if (source) {
      const isWindow = source.display_id === '';
      setAudioMode(isWindow && appAudioSupported ? 'app' : 'none');
    }
  }, [sources, appAudioSupported]);

  const handleShare = useCallback(() => {
    if (selectedId) {
      electronAPI.screenShare.selectSource(selectedId, audioMode);
      setOpened(false);
    }
  }, [selectedId, audioMode]);

  const handleCancel = useCallback(() => {
    electronAPI.screenShare.selectSource(null, 'none');
    setOpened(false);
  }, []);

  const screens = sources.filter((s) => s.display_id !== '');
  const apps = sources.filter((s) => s.display_id === '');

  // Build audio mode options based on context
  const audioModeOptions = useMemo(() => {
    const options = [
      { label: 'No Audio', value: 'none' as const },
    ];
    if (isSelectedWindow && appAudioSupported) {
      options.push({ label: 'App Audio', value: 'app' as const });
    }
    options.push({ label: 'System Audio', value: 'system' as const });
    return options;
  }, [isSelectedWindow, appAudioSupported]);

  const renderSourceCard = (source: ScreenSource) => {
    const isSelected = selectedId === source.id;
    return (
      <div
        key={source.id}
        onClick={() => handleSourceSelect(source.id)}
        onDoubleClick={() => {
          const isWindow = source.display_id === '';
          const mode = isWindow && appAudioSupported ? 'app' : 'none';
          electronAPI.screenShare.selectSource(source.id, mode);
          setOpened(false);
        }}
        style={{
          cursor: 'pointer',
          borderRadius: 8,
          border: isSelected
            ? '2px solid var(--mantine-color-violet-5)'
            : '2px solid transparent',
          background: isSelected
            ? 'rgba(139, 92, 246, 0.1)'
            : 'var(--mantine-color-dark-6)',
          padding: 6,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <img
          src={source.thumbnail}
          alt={source.name}
          style={{
            width: '100%',
            height: 120,
            objectFit: 'contain',
            borderRadius: 4,
            background: '#000',
            display: 'block',
          }}
        />
        <Group gap={6} mt={6} wrap="nowrap">
          {source.appIcon && (
            <img
              src={source.appIcon}
              alt=""
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
          )}
          <Text size="xs" truncate style={{ flex: 1, minWidth: 0 }}>
            {source.name}
          </Text>
        </Group>
      </div>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title="Choose what to share"
      size="lg"
      centered
      overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
      styles={{
        title: { fontWeight: 600, fontSize: '1.1rem' },
      }}
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="screens" leftSection={<IconDeviceDesktop size={16} />}>
            Screens
          </Tabs.Tab>
          <Tabs.Tab value="apps" leftSection={<IconApps size={16} />}>
            Apps
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="screens">
          {screens.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No screens found</Text>
          ) : (
            <SimpleGrid cols={3} spacing="sm">
              {screens.map(renderSourceCard)}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="apps">
          {apps.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No applications found</Text>
          ) : (
            <SimpleGrid cols={3} spacing="sm">
              {apps.map(renderSourceCard)}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>

      {selectedId && (
        <Stack gap="xs" mt="md">
          <Text size="sm" fw={500}>Audio</Text>
          <SegmentedControl
            value={audioMode}
            onChange={(val) => setAudioMode(val as AudioMode)}
            data={audioModeOptions}
            size="sm"
          />
          {audioMode === 'app' && (
            <Text size="xs" c="dimmed">
              Only audio from this application will be shared
            </Text>
          )}
          {audioMode === 'system' && (
            <Text size="xs" c="yellow.5">
              All system audio will be shared (may cause echo in voice chat)
            </Text>
          )}
        </Stack>
      )}

      <Group justify="flex-end" mt="lg">
        <Button variant="subtle" color="gray" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          color="violet"
          disabled={!selectedId}
          onClick={handleShare}
        >
          Share
        </Button>
      </Group>
    </Modal>
  );
}
