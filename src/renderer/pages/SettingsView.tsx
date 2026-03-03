import { Avatar, Button, Divider, Group, NavLink, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconUser, IconPalette, IconBell, IconKeyboard, IconVolume, IconLogout, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useThemeStore, type ThemeName } from '../stores/themeStore';
import { VoiceBar } from '../components/voice/VoiceBar';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'keybinds' | 'voice';

const electronAPI = (window as any).electronAPI;

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { user, logout } = useAuthStore();
  const setView = useUIStore((s) => s.setView);

  return (
    <div style={{ flex: 1, display: 'flex', background: 'var(--bg-secondary)' }}>
      {/* Settings sidebar */}
      <div style={{
        width: 240,
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <IconArrowLeft
            size={18}
            style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
            onClick={() => setView('servers')}
          />
          <Text fw={600} size="sm">Settings</Text>
        </div>

        <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
          <Stack gap={2} p={8}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={8} py={4} style={{ letterSpacing: '0.5px' }}>
              User Settings
            </Text>
            <NavLink
              label="My Account"
              leftSection={<IconUser size={18} />}
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              variant="subtle"
            />
            <NavLink
              label="Appearance"
              leftSection={<IconPalette size={18} />}
              active={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              variant="subtle"
            />
            <NavLink
              label="Notifications"
              leftSection={<IconBell size={18} />}
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
              variant="subtle"
            />
            <NavLink
              label="Keybinds"
              leftSection={<IconKeyboard size={18} />}
              active={activeTab === 'keybinds'}
              onClick={() => setActiveTab('keybinds')}
              variant="subtle"
            />
            <NavLink
              label="Voice & Video"
              leftSection={<IconVolume size={18} />}
              active={activeTab === 'voice'}
              onClick={() => setActiveTab('voice')}
              variant="subtle"
            />

            <Divider my={8} style={{ borderColor: 'var(--border)' }} />

            <NavLink
              label="Log Out"
              leftSection={<IconLogout size={18} />}
              color="red"
              variant="subtle"
              onClick={logout}
            />
          </Stack>
        </ScrollArea>
        <VoiceBar compact />
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, background: 'var(--bg-primary)' }}>
        <ScrollArea style={{ height: '100%' }} scrollbarSize={6} type="hover">
          <div style={{ maxWidth: 600, padding: 32 }}>
            {activeTab === 'profile' && <ProfileSettings user={user} />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'keybinds' && <KeybindSettings />}
            {activeTab === 'voice' && <VoiceSettings />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>My Account</Text>
      <Group gap={16}>
        <Avatar src={user?.avatar_url} size={80} radius="xl" color="brand">
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <Text fw={600} size="lg">{user?.username}</Text>
          <Text c="dimmed" size="sm">{user?.email}</Text>
        </div>
      </Group>
      <Divider style={{ borderColor: 'var(--border)' }} />
      <Stack gap={12}>
        <TextInput label="Username" value={user?.username || ''} readOnly />
        <TextInput label="Email" value={user?.email || ''} readOnly />
      </Stack>
    </Stack>
  );
}

const THEME_OPTIONS: Array<{ id: ThemeName; name: string; colors: [string, string, string, string] }> = [
  { id: 'green', name: 'Soft Green', colors: ['#152019', '#1e2b27', '#4ade80', '#e8f5e9'] },
  { id: 'midnight', name: 'Midnight Blue', colors: ['#111322', '#1a1d2e', '#6380ff', '#e0e4f7'] },
  { id: 'light', name: 'Light', colors: ['#e3e5e8', '#ffffff', '#2d7d46', '#2e3338'] },
];

function AppearanceSettings() {
  const { theme, setTheme } = useThemeStore();
  const [density, setDensity] = useState('cozy');
  const [fontSize, setFontSize] = useState(16);

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Appearance</Text>
      <Text c="dimmed" size="sm">Customize how sgChat looks on your device.</Text>

      <Text size="sm" fw={600}>Theme</Text>
      <Group gap={12}>
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.id;
          return (
            <UnstyledButton
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              style={{
                width: 120,
                borderRadius: 8,
                border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Color swatch preview */}
              <div style={{ display: 'flex', height: 48 }}>
                <div style={{ flex: 1, background: opt.colors[0] }} />
                <div style={{ flex: 1, background: opt.colors[1] }} />
                <div style={{ flex: 1, background: opt.colors[2] }} />
                <div style={{ flex: 1, background: opt.colors[3] }} />
              </div>
              <div style={{
                padding: '6px 8px',
                background: 'var(--bg-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Text size="xs" fw={500}>{opt.name}</Text>
                {isActive && <IconCheck size={14} style={{ color: 'var(--accent)' }} />}
              </div>
            </UnstyledButton>
          );
        })}
      </Group>

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Text size="sm" fw={600}>Message Display</Text>
      <SegmentedControl
        value={density}
        onChange={setDensity}
        data={[
          { label: 'Compact', value: 'compact' },
          { label: 'Cozy', value: 'cozy' },
          { label: 'Comfortable', value: 'comfortable' },
        ]}
      />

      <div>
        <Group justify="space-between" mb={8}>
          <Text size="sm" fw={600}>Font Size</Text>
          <Text size="xs" c="dimmed">{fontSize}px</Text>
        </Group>
        <Slider
          value={fontSize}
          onChange={setFontSize}
          min={12}
          max={20}
          step={1}
          marks={[
            { value: 12, label: '12' },
            { value: 16, label: '16' },
            { value: 20, label: '20' },
          ]}
        />
      </div>
    </Stack>
  );
}

function NotificationSettings() {
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [notifSounds, setNotifSounds] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [flashTaskbar, setFlashTaskbar] = useState(true);

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Notifications</Text>
      <Switch
        label="Desktop Notifications"
        description="Show notifications for new messages and mentions"
        checked={desktopNotifs}
        onChange={(e) => setDesktopNotifs(e.currentTarget.checked)}
      />
      <Switch
        label="Notification Sounds"
        description="Play a sound when you receive a notification"
        checked={notifSounds}
        onChange={(e) => setNotifSounds(e.currentTarget.checked)}
      />
      <Switch
        label="Flash Taskbar"
        description="Flash the taskbar icon on new mentions and DMs"
        checked={flashTaskbar}
        onChange={(e) => setFlashTaskbar(e.currentTarget.checked)}
      />
      <Divider style={{ borderColor: 'var(--border)' }} />
      <Switch
        label="Start with System"
        description="Launch sgChat when you log in to your computer"
        checked={autoStart}
        onChange={(e) => {
          setAutoStart(e.currentTarget.checked);
          electronAPI?.setAutoStart(e.currentTarget.checked);
        }}
      />
    </Stack>
  );
}

function KeybindSettings() {
  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Keybinds</Text>
      <Stack gap={8}>
        <Group justify="space-between" py={8}>
          <Text size="sm">Toggle Mute</Text>
          <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>Ctrl+Shift+M</Text>
        </Group>
        <Divider style={{ borderColor: 'var(--border)' }} />
        <Group justify="space-between" py={8}>
          <Text size="sm">Toggle Deafen</Text>
          <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>Ctrl+Shift+D</Text>
        </Group>
      </Stack>
    </Stack>
  );
}

function VoiceSettings() {
  const [inputDevice, setInputDevice] = useState<string | null>(null);
  const [outputDevice, setOutputDevice] = useState<string | null>(null);
  const [inputVolume, setInputVolume] = useState(100);
  const [outputVolume, setOutputVolume] = useState(100);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [vad, setVad] = useState(true);

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Voice & Video</Text>
      <Text c="dimmed" size="sm">Configure your audio and video devices.</Text>

      <Select
        label="Input Device"
        placeholder="Default microphone"
        value={inputDevice}
        onChange={setInputDevice}
        data={[{ value: 'default', label: 'Default — System Microphone' }]}
      />

      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">Input Volume</Text>
          <Text size="xs" c="dimmed">{inputVolume}%</Text>
        </Group>
        <Slider value={inputVolume} onChange={setInputVolume} min={0} max={200} />
      </div>

      <Select
        label="Output Device"
        placeholder="Default speakers"
        value={outputDevice}
        onChange={setOutputDevice}
        data={[{ value: 'default', label: 'Default — System Speakers' }]}
      />

      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">Output Volume</Text>
          <Text size="xs" c="dimmed">{outputVolume}%</Text>
        </Group>
        <Slider value={outputVolume} onChange={setOutputVolume} min={0} max={200} />
      </div>

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Switch
        label="Voice Activity Detection"
        description="Automatically detect when you're speaking"
        checked={vad}
        onChange={(e) => setVad(e.currentTarget.checked)}
      />

      <Switch
        label="Noise Suppression"
        description="Reduce background noise from your microphone"
        checked={noiseSuppression}
        onChange={(e) => setNoiseSuppression(e.currentTarget.checked)}
      />

      <Switch
        label="Echo Cancellation"
        description="Prevent echo from speakers feeding back into microphone"
        checked={echoCancellation}
        onChange={(e) => setEchoCancellation(e.currentTarget.checked)}
      />
    </Stack>
  );
}
