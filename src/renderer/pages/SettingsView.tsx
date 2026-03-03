import { Avatar, Button, Divider, Group, NavLink, ScrollArea, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconUser, IconPalette, IconBell, IconKeyboard, IconVolume, IconLogout, IconArrowLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'keybinds' | 'voice';

const electronAPI = (window as any).electronAPI;

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { user, logout } = useAuthStore();
  const setView = useUIStore((s) => s.setView);

  return (
    <div style={{ flex: 1, display: 'flex', background: '#2b2d31' }}>
      {/* Settings sidebar */}
      <div style={{
        width: 240,
        background: '#2b2d31',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid #1a1b1e',
      }}>
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          borderBottom: '1px solid #1a1b1e',
          flexShrink: 0,
        }}>
          <IconArrowLeft
            size={18}
            style={{ cursor: 'pointer', color: '#8e8e93' }}
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

            <Divider my={8} color="dark.5" />

            <NavLink
              label="Log Out"
              leftSection={<IconLogout size={18} />}
              color="red"
              variant="subtle"
              onClick={logout}
            />
          </Stack>
        </ScrollArea>
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, background: '#313338' }}>
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
      <Divider color="dark.5" />
      <Stack gap={12}>
        <TextInput label="Username" value={user?.username || ''} readOnly />
        <TextInput label="Email" value={user?.email || ''} readOnly />
      </Stack>
    </Stack>
  );
}

function AppearanceSettings() {
  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Appearance</Text>
      <Text c="dimmed" size="sm">Customize how sgChat looks on your device.</Text>
      <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>Theme customization coming soon.</Text>
    </Stack>
  );
}

function NotificationSettings() {
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [autoStart, setAutoStart] = useState(false);

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
        label="Start with System"
        description="Launch sgChat when you log in to your computer"
        checked={autoStart}
        onChange={(e) => {
          setAutoStart(e.currentTarget.checked);
          electronAPI.setAutoStart(e.currentTarget.checked);
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
        <Divider color="dark.5" />
        <Group justify="space-between" py={8}>
          <Text size="sm">Toggle Deafen</Text>
          <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>Ctrl+Shift+D</Text>
        </Group>
      </Stack>
    </Stack>
  );
}

function VoiceSettings() {
  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Voice & Video</Text>
      <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>
        Voice and video settings will be available once LiveKit integration is complete.
      </Text>
    </Stack>
  );
}
