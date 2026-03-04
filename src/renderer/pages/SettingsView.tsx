import { Button, Divider, Group, NavLink, Progress, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Text, Textarea, TextInput, UnstyledButton } from '@mantine/core';
import { IconUser, IconPalette, IconBell, IconKeyboard, IconVolume, IconLogout, IconArrowLeft, IconCheck, IconMicrophone, IconPlayerPlay } from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useThemeStore, type ThemeName, themeNames } from '../stores/themeStore';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { switchInputDevice, switchOutputDevice, setGlobalOutputVolume, applyAudioProcessingSettings } from '../lib/voiceService';
import { VoiceBar } from '../components/voice/VoiceBar';
import { AvatarPicker } from '../components/ui/AvatarPicker';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'keybinds' | 'voice';

const electronAPI = (window as any).electronAPI;

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
  const updateAvatarUrl = useAuthStore((s) => s.updateAvatarUrl);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await electronAPI.api.request('PATCH', '/api/users/me', {
        display_name: displayName || null,
        bio: bio || null,
      });
      if (res.ok) {
        updateUser({ display_name: displayName || null, bio: bio || null });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
    setIsSaving(false);
  };

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>My Account</Text>

      <AvatarPicker
        currentAvatarUrl={user?.avatar_url}
        username={user?.username}
        displayName={user?.display_name}
        onAvatarChange={(url) => updateAvatarUrl(url)}
      />

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Stack gap={12}>
        <TextInput label="Username" value={user?.username || ''} readOnly />
        <TextInput label="Email" value={user?.email || ''} readOnly />
        <TextInput
          label="Display Name"
          placeholder="How others see you"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          maxLength={32}
        />
        <Textarea
          label="Bio"
          placeholder="Tell us about yourself..."
          value={bio}
          onChange={(e) => setBio(e.currentTarget.value)}
          maxLength={190}
          autosize
          minRows={2}
          maxRows={4}
        />
        <Group gap="xs">
          <Button
            size="sm"
            onClick={handleSaveProfile}
            loading={isSaving}
            disabled={isSaving}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}

const THEME_OPTIONS: Array<{ id: ThemeName; name: string; colors: [string, string, string, string] }> = [
  { id: 'green', name: themeNames.green, colors: ['#152019', '#1e2b27', '#4ade80', '#e8f5e9'] },
  { id: 'midnight', name: themeNames.midnight, colors: ['#111322', '#1a1d2e', '#6380ff', '#e0e4f7'] },
  { id: 'dark', name: themeNames.dark, colors: ['#1e1f22', '#313338', '#5865f2', '#f2f3f5'] },
  { id: 'light', name: themeNames.light, colors: ['#e3e5e8', '#ffffff', '#2d7d46', '#2e3338'] },
  { id: 'oled', name: themeNames.oled, colors: ['#000000', '#0a0a0a', '#5865f2', '#ffffff'] },
  { id: 'nord', name: themeNames.nord, colors: ['#434c5e', '#2e3440', '#5e81ac', '#eceff4'] },
];

function AppearanceSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
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
  const inputDevice = useVoiceSettingsStore((s) => s.inputDevice);
  const outputDevice = useVoiceSettingsStore((s) => s.outputDevice);
  const inputVolume = useVoiceSettingsStore((s) => s.inputVolume);
  const outputVolume = useVoiceSettingsStore((s) => s.outputVolume);
  const noiseSuppression = useVoiceSettingsStore((s) => s.noiseSuppression);
  const echoCancellation = useVoiceSettingsStore((s) => s.echoCancellation);
  const autoGainControl = useVoiceSettingsStore((s) => s.autoGainControl);
  const vad = useVoiceSettingsStore((s) => s.vad);
  const setInputDeviceSetting = useVoiceSettingsStore((s) => s.setInputDevice);
  const setOutputDeviceSetting = useVoiceSettingsStore((s) => s.setOutputDevice);
  const setInputVolumeSetting = useVoiceSettingsStore((s) => s.setInputVolume);
  const setOutputVolumeSetting = useVoiceSettingsStore((s) => s.setOutputVolume);
  const setNoiseSuppressionSetting = useVoiceSettingsStore((s) => s.setNoiseSuppression);
  const setEchoCancellationSetting = useVoiceSettingsStore((s) => s.setEchoCancellation);
  const setAutoGainControlSetting = useVoiceSettingsStore((s) => s.setAutoGainControl);
  const setVadSetting = useVoiceSettingsStore((s) => s.setVad);
  const validateDevices = useVoiceSettingsStore((s) => s.validateDevices);

  const [inputDevices, setInputDevices] = useState<{ value: string; label: string }[]>([
    { value: 'default', label: 'Default — System Microphone' },
  ]);
  const [outputDevices, setOutputDevices] = useState<{ value: string; label: string }[]>([
    { value: 'default', label: 'Default — System Speakers' },
  ]);

  // Enumerate real audio devices and validate saved selections
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request mic permission to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(
          (d) => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications',
        );
        const outputs = devices.filter(
          (d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications',
        );

        setInputDevices([
          { value: 'default', label: 'Default' },
          ...inputs.map((d) => ({ value: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` })),
        ]);
        setOutputDevices([
          { value: 'default', label: 'Default' },
          ...outputs.map((d) => ({ value: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 8)}` })),
        ]);

        // Validate saved device IDs — reset to default if device was unplugged
        validateDevices(
          inputs.map((d) => d.deviceId),
          outputs.map((d) => d.deviceId),
        );
      } catch {
        // Permission denied or no devices — keep defaults
      }
    }
    loadDevices();

    // Re-validate when devices change (plug/unplug)
    const onChange = () => { loadDevices(); };
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
  }, [validateDevices]);

  const handleInputDeviceChange = (deviceId: string | null) => {
    if (!deviceId) return;
    setInputDeviceSetting(deviceId);
    switchInputDevice(deviceId);
  };

  const handleOutputDeviceChange = (deviceId: string | null) => {
    if (!deviceId) return;
    setOutputDeviceSetting(deviceId);
    switchOutputDevice(deviceId);
  };

  const handleOutputVolumeChange = (volume: number) => {
    setOutputVolumeSetting(volume);
    setGlobalOutputVolume(volume);
  };

  // ── Mic test ────────────────────────────────────────────────────
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const testStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  const updateMicLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    setMicLevel(Math.min(100, (avg / 128) * 100 * (inputVolume / 100)));
    rafRef.current = requestAnimationFrame(updateMicLevel);
  }, [inputVolume]);

  const stopMicTest = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    testStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    testStreamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
    setIsMicTesting(false);
  }, []);

  const startMicTest = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: inputDevice !== 'default' ? { exact: inputDevice } : undefined,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicTesting(true);
      rafRef.current = requestAnimationFrame(updateMicLevel);
    } catch {
      // Permission denied or device error
    }
  }, [inputDevice, echoCancellation, noiseSuppression, autoGainControl, updateMicLevel]);

  // Cleanup on unmount
  useEffect(() => () => { stopMicTest(); }, [stopMicTest]);

  // ── Speaker test ────────────────────────────────────────────────
  const testSpeakers = useCallback(() => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    gain.gain.value = (outputVolume / 100) * 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => {});
    }, 1000);
  }, [outputVolume]);

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Voice & Video</Text>
      <Text c="dimmed" size="sm">Configure your audio and video devices.</Text>

      <Select
        label="Input Device"
        placeholder="Default microphone"
        value={inputDevice}
        onChange={handleInputDeviceChange}
        data={inputDevices}
      />

      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">Input Volume</Text>
          <Text size="xs" c="dimmed">{inputVolume}%</Text>
        </Group>
        <Slider value={inputVolume} onChange={setInputVolumeSetting} min={0} max={200} />
      </div>

      <Group>
        <Button
          variant={isMicTesting ? 'filled' : 'light'}
          color={isMicTesting ? 'red' : 'brand'}
          size="xs"
          leftSection={<IconMicrophone size={14} />}
          onClick={isMicTesting ? stopMicTest : startMicTest}
        >
          {isMicTesting ? 'Stop Testing' : 'Test Microphone'}
        </Button>
        {isMicTesting && (
          <Progress value={micLevel} color="green" size="lg" style={{ flex: 1 }} />
        )}
      </Group>

      <Select
        label="Output Device"
        placeholder="Default speakers"
        value={outputDevice}
        onChange={handleOutputDeviceChange}
        data={outputDevices}
      />

      <div>
        <Group justify="space-between" mb={4}>
          <Text size="sm">Output Volume</Text>
          <Text size="xs" c="dimmed">{outputVolume}%</Text>
        </Group>
        <Slider value={outputVolume} onChange={handleOutputVolumeChange} min={0} max={200} />
      </div>

      <Button
        variant="light"
        color="brand"
        size="xs"
        leftSection={<IconPlayerPlay size={14} />}
        onClick={testSpeakers}
        style={{ alignSelf: 'flex-start' }}
      >
        Test Speakers
      </Button>

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Switch
        label="Voice Activity Detection"
        description="Automatically detect when you're speaking"
        checked={vad}
        onChange={(e) => setVadSetting(e.currentTarget.checked)}
      />

      <Switch
        label="Noise Suppression"
        description="Reduce background noise from your microphone"
        checked={noiseSuppression}
        onChange={(e) => {
          setNoiseSuppressionSetting(e.currentTarget.checked);
          applyAudioProcessingSettings();
        }}
      />

      <Switch
        label="Echo Cancellation"
        description="Prevent echo from speakers feeding back into microphone"
        checked={echoCancellation}
        onChange={(e) => {
          setEchoCancellationSetting(e.currentTarget.checked);
          applyAudioProcessingSettings();
        }}
      />

      <Switch
        label="Automatic Gain Control"
        description="Automatically adjust microphone volume to a consistent level"
        checked={autoGainControl}
        onChange={(e) => {
          setAutoGainControlSetting(e.currentTarget.checked);
          applyAudioProcessingSettings();
        }}
      />
    </Stack>
  );
}
