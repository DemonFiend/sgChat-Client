import { ActionIcon, Button, CopyButton, Divider, Group, Kbd, Modal, NavLink, PasswordInput, Progress, ScrollArea, SegmentedControl, Select, Slider, Stack, Switch, Text, Textarea, TextInput, UnstyledButton, Image, Paper, SimpleGrid, Tooltip } from '@mantine/core';
import { IconUser, IconPalette, IconBell, IconKeyboard, IconVolume, IconLogout, IconArrowLeft, IconCheck, IconMicrophone, IconPlayerPlay, IconRefresh, IconLock, IconMail, IconHistory, IconShield, IconEye, IconEyeOff, IconUpload, IconCopy, IconMusic, IconTrash, IconId, IconDeviceDesktop, IconPencil } from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useThemeStore, type ThemeName, themeNames } from '../stores/themeStore';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { useKeybindsStore, KEYBIND_LABELS, DEFAULT_KEYBINDS } from '../stores/keybindsStore';
import { useDevModeStore } from '../stores/devModeStore';
import { useServerVersion } from '../hooks/useServerInfo';
import { useToastStore } from '../stores/toastNotifications';
import { switchInputDevice, switchOutputDevice, setGlobalOutputVolume, applyAudioProcessingSettings } from '../lib/voiceService';
import { noiseSuppressionService, type CpuLevel } from '../lib/noiseSuppressionService';
import { VoiceBar } from '../components/voice/VoiceBar';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TIMEZONES } from '../lib/timezones';

type SettingsTab = 'account' | 'profile' | 'appearance' | 'notifications' | 'keybinds' | 'voice';

const electronAPI = (window as any).electronAPI;

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);
  const setView = useUIStore((s) => s.setView);
  const { data: serverVersion } = useServerVersion();

  const handleLogout = (forgetDevice: boolean) => {
    if (forgetDevice) {
      // Clear stored server URL so user sees the setup screen on next launch
      electronAPI.config.clearServerUrl?.();
      setServerUrl('');
    }
    logout();
  };

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
              leftSection={<IconId size={18} />}
              active={activeTab === 'account'}
              onClick={() => setActiveTab('account')}
              variant="subtle"
            />
            <NavLink
              label="Profile"
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
              onClick={() => handleLogout(false)}
            />
            <NavLink
              label="Log Out & Forget Device"
              leftSection={<IconDeviceDesktop size={18} />}
              color="red"
              variant="subtle"
              onClick={() => handleLogout(true)}
            />
          </Stack>
        </ScrollArea>
        {serverVersion && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <Text size="xs" c="dimmed">
              Server v{serverVersion.version}{serverVersion.node ? ` (${serverVersion.node})` : ''}
            </Text>
          </div>
        )}
        <VoiceBar compact />
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, background: 'var(--bg-primary)' }}>
        <ScrollArea style={{ height: '100%' }} scrollbarSize={6} type="hover">
          <div style={{ maxWidth: 600, padding: 32 }}>
            {activeTab === 'account' && <AccountSettings user={user} />}
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

function AccountSettings({ user }: { user: any }) {
  const updateAvatarUrl = useAuthStore((s) => s.updateAvatarUrl);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useToastStore((s) => s.addToast);

  // Username editing
  const [username, setUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const usernameChanged = username !== (user?.username || '');

  // Email change
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Password change
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Privacy settings
  const [friendRequests, setFriendRequests] = useState<string>(user?.privacy_friend_requests || 'anyone');
  const [dmPrivacy, setDmPrivacy] = useState<string>(user?.privacy_dms || 'server_members');
  const [showOnline, setShowOnline] = useState(user?.privacy_show_online !== false);
  const [showActivity, setShowActivity] = useState(user?.privacy_show_activity !== false);
  const [privacySaving, setPrivacySaving] = useState(false);

  // Timezone privacy — persisted via /api/users/me/settings
  // NOTE: Desktop already has friend/DM privacy controls above.
  // Timezone privacy is the bidirectional complement — server team should
  // ensure GET/PATCH /api/users/me/settings includes timezone_*, and that
  // user profile responses respect privacy_show_timezone.
  const [timezone, setTimezone] = useState<string>(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [showTimezonePublicly, setShowTimezonePublicly] = useState(user?.privacy_show_timezone !== false);
  const [observeDst, setObserveDst] = useState(user?.observe_dst !== false);
  const [timezoneSaving, setTimezoneSaving] = useState(false);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
  const [tfaSetupOpen, setTfaSetupOpen] = useState(false);
  const [tfaQrUrl, setTfaQrUrl] = useState<string | null>(null);
  const [tfaBackupCodes, setTfaBackupCodes] = useState<string[]>([]);
  const [tfaVerifyCode, setTfaVerifyCode] = useState('');
  const [tfaStep, setTfaStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaError, setTfaError] = useState('');
  const [tfaDisableOpen, setTfaDisableOpen] = useState(false);
  const [tfaDisablePassword, setTfaDisablePassword] = useState('');
  const [tfaDisableLoading, setTfaDisableLoading] = useState(false);

  const validateUsername = (value: string): string => {
    if (value.length < 2) return 'Username must be at least 2 characters';
    if (value.length > 32) return 'Username must be 32 characters or fewer';
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Only letters, numbers, underscores, and hyphens allowed';
    return '';
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (usernameError) {
      const error = validateUsername(value);
      setUsernameError(error);
    }
  };

  const handleSaveUsername = async () => {
    const error = validateUsername(username);
    if (error) { setUsernameError(error); return; }
    setUsernameError('');
    setUsernameSaving(true);
    try {
      const res = await electronAPI.api.request('PATCH', '/api/users/me', {
        username,
      });
      if (res.ok) {
        updateUser({ username });
        addToast({ type: 'system', title: 'Username Updated', message: 'Your username has been changed.' });
      } else if (res.status === 409) {
        setUsernameError('Username already in use');
      } else {
        setUsernameError(res.data?.error || 'Failed to update username');
      }
    } catch {
      setUsernameError('Failed to update username');
    }
    setUsernameSaving(false);
  };

  const handleChangeEmail = async () => {
    setEmailError('');
    if (!newEmail.includes('@')) { setEmailError('Enter a valid email'); return; }
    if (!emailPassword) { setEmailError('Current password is required'); return; }
    setEmailSaving(true);
    try {
      const hashedPw = await electronAPI.auth.hashPassword(emailPassword);
      const res = await electronAPI.api.request('PATCH', '/api/users/me/email', {
        new_email: newEmail,
        current_password: hashedPw,
      });
      if (res.ok) {
        updateUser({ email: newEmail });
        setEmailModalOpen(false);
        setNewEmail('');
        setEmailPassword('');
        addToast({ type: 'system', title: 'Email Changed', message: 'Your email has been updated.' });
      } else {
        setEmailError(res.body?.message || 'Failed to change email');
      }
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Failed to change email');
    }
    setEmailSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw) { setPwError('Current password is required'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    setPwSaving(true);
    try {
      const [hashedCurrent, hashedNew] = await Promise.all([
        electronAPI.auth.hashPassword(currentPw),
        electronAPI.auth.hashPassword(newPw),
      ]);
      const res = await electronAPI.api.request('PATCH', '/api/users/me/password', {
        current_password: hashedCurrent,
        new_password: hashedNew,
      });
      if (res.ok) {
        setPwModalOpen(false);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        addToast({ type: 'system', title: 'Password Changed', message: 'Your password has been updated.' });
      } else {
        setPwError(res.body?.message || 'Failed to change password');
      }
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    }
    setPwSaving(false);
  };

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      const res = await electronAPI.api.request('PATCH', '/api/users/me/privacy', {
        privacy_friend_requests: friendRequests,
        privacy_dms: dmPrivacy,
        privacy_show_online: showOnline,
        privacy_show_activity: showActivity,
      });
      if (res.ok) {
        updateUser({
          privacy_friend_requests: friendRequests as any,
          privacy_dms: dmPrivacy as any,
          privacy_show_online: showOnline,
          privacy_show_activity: showActivity,
        });
        addToast({ type: 'system', title: 'Privacy Updated', message: 'Your privacy settings have been saved.' });
      }
    } catch { /* ignore */ }
    setPrivacySaving(false);
  };

  const handleSetup2FA = async () => {
    setTfaLoading(true);
    setTfaError('');
    try {
      const data = await api.post<{ qr_code: string; backup_codes: string[] }>('/api/users/2fa/setup');
      setTfaQrUrl(data.qr_code);
      setTfaBackupCodes(data.backup_codes || []);
      setTfaStep('qr');
      setTfaVerifyCode('');
      setTfaSetupOpen(true);
    } catch (err: unknown) {
      setTfaError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
    }
    setTfaLoading(false);
  };

  const handleVerify2FA = async () => {
    setTfaLoading(true);
    setTfaError('');
    try {
      await api.post('/api/users/2fa/verify', { code: tfaVerifyCode });
      setTfaStep('backup');
      setTwoFactorEnabled(true);
      updateUser({ two_factor_enabled: true });
      addToast({ type: 'system', title: '2FA Enabled', message: 'Two-factor authentication is now active.' });
    } catch (err: unknown) {
      setTfaError(err instanceof Error ? err.message : 'Invalid verification code');
    }
    setTfaLoading(false);
  };

  const handleDisable2FA = async () => {
    setTfaDisableLoading(true);
    setTfaError('');
    try {
      const hashedPw = await electronAPI.auth.hashPassword(tfaDisablePassword);
      await api.post('/api/users/2fa/disable', { password: hashedPw });
      setTwoFactorEnabled(false);
      updateUser({ two_factor_enabled: false });
      setTfaDisableOpen(false);
      setTfaDisablePassword('');
      addToast({ type: 'system', title: '2FA Disabled', message: 'Two-factor authentication has been removed.' });
    } catch (err: unknown) {
      setTfaError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    }
    setTfaDisableLoading(false);
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

      <AvatarHistory onRevert={(url) => updateAvatarUrl(url)} />

      {/* Banner upload */}
      <BannerUpload currentBannerUrl={user?.banner_url} onBannerChange={(url) => updateUser({ banner_url: url })} />

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Stack gap={12}>
        <Group align="flex-end" gap={8}>
          <TextInput
            label="Username"
            description="Changing your username may affect how others find you"
            value={username}
            onChange={(e) => handleUsernameChange(e.currentTarget.value)}
            error={usernameError || undefined}
            maxLength={32}
            style={{ flex: 1 }}
          />
          {usernameChanged && (
            <Button
              variant="light"
              size="sm"
              leftSection={<IconPencil size={14} />}
              onClick={handleSaveUsername}
              loading={usernameSaving}
            >
              Save
            </Button>
          )}
        </Group>
        <Group align="flex-end" gap={8}>
          <TextInput label="Email" value={user?.email || ''} readOnly style={{ flex: 1 }} />
          <Button
            variant="light"
            size="sm"
            leftSection={<IconMail size={14} />}
            onClick={() => { setNewEmail(''); setEmailPassword(''); setEmailError(''); setEmailModalOpen(true); }}
          >
            Change
          </Button>
        </Group>
        <Group>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconLock size={14} />}
            onClick={() => { setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); setPwModalOpen(true); }}
          >
            Change Password
          </Button>
        </Group>
      </Stack>

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Privacy Settings */}
      <Stack gap={12}>
        <Text size="lg" fw={600}>Privacy</Text>
        <Select
          label="Who can send you friend requests"
          value={friendRequests}
          onChange={(v) => v && setFriendRequests(v)}
          data={[
            { value: 'anyone', label: 'Anyone' },
            { value: 'friends_of_friends', label: 'Friends of friends' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />
        <Select
          label="Who can send you direct messages"
          value={dmPrivacy}
          onChange={(v) => v && setDmPrivacy(v)}
          data={[
            { value: 'server_members', label: 'Server members' },
            { value: 'friends_only', label: 'Friends only' },
          ]}
        />
        <Switch
          label="Show Online Status"
          description="Let others see when you're online"
          checked={showOnline}
          onChange={(e) => setShowOnline(e.currentTarget.checked)}
        />
        <Switch
          label="Show Activity"
          description="Display what you're currently doing"
          checked={showActivity}
          onChange={(e) => setShowActivity(e.currentTarget.checked)}
        />
        <Button size="sm" variant="light" onClick={handleSavePrivacy} loading={privacySaving} style={{ alignSelf: 'flex-start' }}>
          Save Privacy Settings
        </Button>
      </Stack>

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Timezone Privacy */}
      <Stack gap={12}>
        <Text size="lg" fw={600}>Timezone</Text>
        <Select
          label="Your timezone"
          description="Used for scheduling and displayed on your profile if public"
          value={timezone}
          onChange={(v) => v && setTimezone(v)}
          data={TIMEZONES}
          searchable
          nothingFoundMessage="No matching timezone"
        />
        <Switch
          label="Show Timezone Publicly"
          description="Allow other users to see your timezone on your profile"
          checked={showTimezonePublicly}
          onChange={(e) => setShowTimezonePublicly(e.currentTarget.checked)}
        />
        <Switch
          label="Observe Daylight Saving Time"
          description="Automatically adjust for DST changes in your timezone"
          checked={observeDst}
          onChange={(e) => setObserveDst(e.currentTarget.checked)}
        />
        <Button
          size="sm"
          variant="light"
          onClick={async () => {
            setTimezoneSaving(true);
            try {
              await api.patch('/api/users/me/settings', {
                timezone,
                privacy_show_timezone: showTimezonePublicly,
                observe_dst: observeDst,
              });
              updateUser({ timezone, privacy_show_timezone: showTimezonePublicly, observe_dst: observeDst } as Partial<typeof user>);
              addToast({ type: 'system', title: 'Timezone Updated', message: 'Your timezone settings have been saved.' });
            } catch {
              addToast({ type: 'warning', title: 'Save Failed', message: 'Could not save timezone settings.' });
            }
            setTimezoneSaving(false);
          }}
          loading={timezoneSaving}
          style={{ alignSelf: 'flex-start' }}
        >
          Save Timezone Settings
        </Button>
      </Stack>

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Security — 2FA */}
      <Stack gap={12}>
        <Text size="lg" fw={600}>Security</Text>
        <Group gap={12} align="center">
          <IconShield size={20} style={{ color: twoFactorEnabled ? 'var(--accent)' : 'var(--text-muted)' }} />
          <div style={{ flex: 1 }}>
            <Text size="sm" fw={500}>Two-Factor Authentication</Text>
            <Text size="xs" c="dimmed">
              {twoFactorEnabled ? 'Your account is secured with 2FA.' : 'Add an extra layer of security to your account.'}
            </Text>
          </div>
          {twoFactorEnabled ? (
            <Button variant="light" color="red" size="sm" onClick={() => { setTfaDisablePassword(''); setTfaError(''); setTfaDisableOpen(true); }}>
              Disable 2FA
            </Button>
          ) : (
            <Button variant="light" size="sm" leftSection={<IconShield size={14} />} onClick={handleSetup2FA} loading={tfaLoading}>
              Enable 2FA
            </Button>
          )}
        </Group>
      </Stack>

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Account Removal (scaffolded) */}
      <Stack gap={12}>
        <Text size="lg" fw={600} c="red">Account Removal</Text>
        <Text size="sm" c="dimmed">
          Disabling your account means you can recover it at any time after taking this action.
          Deleting your account will permanently remove all your data.
        </Text>
        <Group gap={8}>
          <Button
            variant="light"
            color="yellow"
            size="sm"
            onClick={() => addToast({ type: 'system', title: 'Not Available', message: 'Account disabling is not yet available.' })}
          >
            Disable Account
          </Button>
          <Button
            variant="light"
            color="red"
            size="sm"
            onClick={() => addToast({ type: 'system', title: 'Not Available', message: 'Account deletion is not yet available.' })}
          >
            Delete Account
          </Button>
        </Group>
      </Stack>

      {/* Change Email Modal */}
      <Modal opened={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Change Email" centered>
        <Stack gap={12}>
          {emailError && (
            <Text size="sm" c="red">{emailError}</Text>
          )}
          <TextInput
            label="New Email"
            type="email"
            name="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
            placeholder="new@example.com"
          />
          <PasswordInput
            label="Current Password"
            name="current-password"
            autoComplete="current-password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.currentTarget.value)}
            placeholder="Confirm your password"
          />
          <Group justify="flex-end" mt={8}>
            <Button variant="subtle" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeEmail} loading={emailSaving}>Change Email</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Change Password Modal */}
      <Modal opened={pwModalOpen} onClose={() => setPwModalOpen(false)} title="Change Password" centered>
        <Stack gap={12}>
          {pwError && (
            <Text size="sm" c="red">{pwError}</Text>
          )}
          <PasswordInput
            label="Current Password"
            name="current-password"
            autoComplete="current-password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.currentTarget.value)}
          />
          <PasswordInput
            label="New Password"
            name="new-password"
            autoComplete="new-password"
            value={newPw}
            onChange={(e) => setNewPw(e.currentTarget.value)}
            description="Must be at least 8 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt={8}>
            <Button variant="subtle" onClick={() => setPwModalOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} loading={pwSaving}>Change Password</Button>
          </Group>
        </Stack>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal opened={tfaSetupOpen} onClose={() => setTfaSetupOpen(false)} title="Set Up Two-Factor Authentication" centered size="md">
        <Stack gap={16}>
          {tfaError && <Text size="sm" c="red">{tfaError}</Text>}

          {tfaStep === 'qr' && (
            <>
              <Text size="sm">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).</Text>
              {tfaQrUrl && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                  <img src={tfaQrUrl} alt="2FA QR Code" style={{ width: 200, height: 200, imageRendering: 'pixelated' }} />
                </div>
              )}
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => setTfaSetupOpen(false)}>Cancel</Button>
                <Button onClick={() => { setTfaStep('verify'); setTfaError(''); }}>Next</Button>
              </Group>
            </>
          )}

          {tfaStep === 'verify' && (
            <>
              <Text size="sm">Enter the 6-digit code from your authenticator app to verify setup.</Text>
              <TextInput
                label="Verification Code"
                placeholder="000000"
                value={tfaVerifyCode}
                onChange={(e) => setTfaVerifyCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ fontFamily: 'monospace' }}
              />
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => setTfaStep('qr')}>Back</Button>
                <Button onClick={handleVerify2FA} loading={tfaLoading} disabled={tfaVerifyCode.length !== 6}>Verify</Button>
              </Group>
            </>
          )}

          {tfaStep === 'backup' && (
            <>
              <Text size="sm" fw={500} c="yellow.5">Save these backup codes in a secure location. Each code can only be used once.</Text>
              <Paper p={16} style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <SimpleGrid cols={2} spacing={4}>
                  {tfaBackupCodes.map((code, i) => (
                    <Text key={i} size="sm" style={{ fontFamily: 'monospace' }}>{code}</Text>
                  ))}
                </SimpleGrid>
              </Paper>
              <CopyButton value={tfaBackupCodes.join('\n')}>
                {({ copied, copy }) => (
                  <Button variant="light" size="sm" leftSection={<IconCopy size={14} />} onClick={copy}>
                    {copied ? 'Copied!' : 'Copy All Codes'}
                  </Button>
                )}
              </CopyButton>
              <Group justify="flex-end">
                <Button onClick={() => setTfaSetupOpen(false)}>Done</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal opened={tfaDisableOpen} onClose={() => setTfaDisableOpen(false)} title="Disable Two-Factor Authentication" centered>
        <Stack gap={12}>
          {tfaError && <Text size="sm" c="red">{tfaError}</Text>}
          <Text size="sm">Enter your password to disable two-factor authentication.</Text>
          <PasswordInput
            label="Password"
            value={tfaDisablePassword}
            onChange={(e) => setTfaDisablePassword(e.currentTarget.value)}
            placeholder="Enter your password"
          />
          <Group justify="flex-end" mt={8}>
            <Button variant="subtle" onClick={() => setTfaDisableOpen(false)}>Cancel</Button>
            <Button color="red" onClick={handleDisable2FA} loading={tfaDisableLoading}>Disable 2FA</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useToastStore((s) => s.addToast);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Custom status with clear-after
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [clearAfter, setClearAfter] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await electronAPI.api.request('PATCH', '/api/users/me', {
        display_name: displayName || null,
        bio: bio || null,
        pronouns: pronouns || null,
      });
      if (res.ok) {
        updateUser({ display_name: displayName || null, bio: bio || null, pronouns: pronouns || null });
        setSaved(true);
        addToast({ type: 'system', title: 'Profile Updated', message: 'Your profile has been saved.' });
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
    setIsSaving(false);
  };

  const handleSaveCustomStatus = async () => {
    setStatusSaving(true);
    try {
      let expiresAt: string | null = null;
      if (clearAfter) {
        const now = new Date();
        switch (clearAfter) {
          case '30m': expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); break;
          case '1h': expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); break;
          case '4h': expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); break;
          case 'today': {
            const eod = new Date(now);
            eod.setHours(23, 59, 59, 999);
            expiresAt = eod.toISOString();
            break;
          }
          case 'week': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); break;
        }
      }
      const res = await electronAPI.api.request('PATCH', '/api/users/me/status', {
        custom_status: customStatus || null,
        custom_status_expires_at: expiresAt,
      });
      if (res.ok) {
        useAuthStore.getState().updateCustomStatus(customStatus || null, expiresAt);
        addToast({ type: 'system', title: 'Status Updated', message: customStatus ? 'Custom status set.' : 'Custom status cleared.' });
      }
    } catch { /* ignore */ }
    setStatusSaving(false);
  };

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Profile</Text>

      {/* Custom Status with Clear After */}
      <Stack gap={8}>
        <Text size="sm" fw={600}>Custom Status</Text>
        <Group align="flex-end" gap={8}>
          <TextInput
            placeholder="What's on your mind?"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.currentTarget.value)}
            maxLength={128}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Clear after..."
            value={clearAfter}
            onChange={setClearAfter}
            data={[
              { value: 'none', label: "Don't clear" },
              { value: '30m', label: '30 minutes' },
              { value: '1h', label: '1 hour' },
              { value: '4h', label: '4 hours' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
            ]}
            clearable
            style={{ width: 160 }}
          />
        </Group>
        <Button size="xs" variant="light" onClick={handleSaveCustomStatus} loading={statusSaving} style={{ alignSelf: 'flex-start' }}>
          {customStatus ? 'Set Status' : 'Clear Status'}
        </Button>
      </Stack>

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Stack gap={12}>
        <TextInput
          label="Display Name"
          placeholder="How others see you"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          maxLength={32}
        />
        <TextInput
          label="Pronouns"
          placeholder="e.g. they/them, she/her, he/him"
          value={pronouns}
          onChange={(e) => setPronouns(e.currentTarget.value)}
          maxLength={40}
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

function BannerUpload({ currentBannerUrl, onBannerChange }: { currentBannerUrl?: string | null; onBannerChange: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await electronAPI.api.upload('/api/users/me/banner', buffer, file.name, file.type);
      if (res.ok && res.data?.banner_url) {
        onBannerChange(res.data.banner_url);
      }
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleRemove = async () => {
    try {
      const res = await electronAPI.api.request('DELETE', '/api/users/me/banner');
      if (res.ok) onBannerChange(null);
    } catch { /* ignore */ }
  };

  return (
    <Stack gap={8}>
      <Text size="sm" fw={500}>Profile Banner</Text>
      <div style={{
        width: '100%',
        height: 120,
        borderRadius: 8,
        background: currentBannerUrl ? `url(${currentBannerUrl}) center/cover` : 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <Button variant="light" size="xs" loading={uploading} onClick={() => fileRef.current?.click()}>
          {currentBannerUrl ? 'Change' : 'Upload Banner'}
        </Button>
        {currentBannerUrl && (
          <Button variant="light" size="xs" color="red" onClick={handleRemove}>Remove</Button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) handleUpload(f);
        e.target.value = '';
      }} />
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
  const devMode = useDevModeStore((s) => s.enabled);
  const toggleDevMode = useDevModeStore((s) => s.toggle);
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

      <Divider style={{ borderColor: 'var(--border)' }} />

      <Text size="sm" fw={600}>Advanced</Text>
      <Switch
        label="Developer Mode"
        description="Show detailed error messages and stack traces for debugging"
        checked={devMode}
        onChange={() => toggleDevMode()}
      />
    </Stack>
  );
}

function NotificationSettings() {
  const desktopNotifs = useNotificationSettingsStore((s) => s.desktopNotifications);
  const setDesktopNotifs = useNotificationSettingsStore((s) => s.setDesktopNotifications);
  const notifSounds = useNotificationSettingsStore((s) => s.notificationSounds);
  const setNotifSounds = useNotificationSettingsStore((s) => s.setNotificationSounds);
  const flashTaskbar = useNotificationSettingsStore((s) => s.flashTaskbar);
  const setFlashTaskbar = useNotificationSettingsStore((s) => s.setFlashTaskbar);
  const mentionOnly = useNotificationSettingsStore((s) => s.mentionOnly);
  const setMentionOnly = useNotificationSettingsStore((s) => s.setMentionOnly);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    electronAPI?.getAutoStart?.().then((val: boolean) => {
      if (typeof val === 'boolean') setAutoStart(val);
    }).catch(() => {});
  }, []);

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
      <Switch
        label="Mentions Only"
        description="Only show notifications for direct mentions, not all messages"
        checked={mentionOnly}
        onChange={(e) => setMentionOnly(e.currentTarget.checked)}
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
  const keybinds = useKeybindsStore((s) => s.keybinds);
  const loaded = useKeybindsStore((s) => s.loaded);
  const fetchKeybinds = useKeybindsStore((s) => s.fetchKeybinds);
  const updateKeybind = useKeybindsStore((s) => s.updateKeybind);
  const resetKeybind = useKeybindsStore((s) => s.resetKeybind);
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) fetchKeybinds();
  }, [loaded, fetchKeybinds]);

  const handleKeyRecord = useCallback((e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    // Build combo string
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');

    const key = e.key;
    // Ignore standalone modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

    // Normalize key name
    const keyName = key.length === 1 ? key.toUpperCase() : key;
    parts.push(keyName);

    const combo = parts.join('+');
    updateKeybind(recording, combo);
    setRecording(null);
  }, [recording, updateKeybind]);

  const actions = Object.keys(KEYBIND_LABELS);

  return (
    <Stack gap={24}>
      <Text size="xl" fw={700}>Keybinds</Text>
      <Text c="dimmed" size="sm">Click a keybind to record a new shortcut. Press Escape to cancel.</Text>
      <Stack gap={0}>
        {actions.map((action, i) => {
          const combo = keybinds[action] || '';
          const isRecording = recording === action;
          const isDefault = combo === (DEFAULT_KEYBINDS[action] || '');

          return (
            <div key={action}>
              <Group justify="space-between" py={10}>
                <Text size="sm">{KEYBIND_LABELS[action]}</Text>
                <Group gap={4}>
                  <UnstyledButton
                    onKeyDown={handleKeyRecord}
                    onClick={() => {
                      if (isRecording) {
                        setRecording(null);
                      } else {
                        setRecording(action);
                      }
                    }}
                    onBlur={() => { if (isRecording) setRecording(null); }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: isRecording
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
                      background: isRecording ? 'var(--bg-active)' : 'var(--bg-hover)',
                      minWidth: 120,
                      textAlign: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    tabIndex={0}
                  >
                    <Text size="xs" style={{ fontFamily: 'monospace' }} c={isRecording ? 'var(--accent)' : combo ? undefined : 'dimmed'}>
                      {isRecording ? 'Press keys...' : combo || 'Not set'}
                    </Text>
                  </UnstyledButton>
                  {!isDefault && combo && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size={24}
                      onClick={() => resetKeybind(action)}
                      title="Reset to default"
                    >
                      <IconRefresh size={12} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
              {i < actions.length - 1 && <Divider style={{ borderColor: 'var(--border)' }} />}
            </div>
          );
        })}
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
  const inputSensitivity = useVoiceSettingsStore((s) => s.inputSensitivity);
  const setInputSensitivitySetting = useVoiceSettingsStore((s) => s.setInputSensitivity);
  const aiNoiseSuppression = useVoiceSettingsStore((s) => s.aiNoiseSuppression);
  const setAiNoiseSuppressionSetting = useVoiceSettingsStore((s) => s.setAiNoiseSuppression);
  const validateDevices = useVoiceSettingsStore((s) => s.validateDevices);
  const joinSoundEnabled = useVoiceSettingsStore((s) => s.joinSoundEnabled);
  const leaveSoundEnabled = useVoiceSettingsStore((s) => s.leaveSoundEnabled);
  const joinSoundUrl = useVoiceSettingsStore((s) => s.joinSoundUrl);
  const leaveSoundUrl = useVoiceSettingsStore((s) => s.leaveSoundUrl);
  const setJoinSoundEnabled = useVoiceSettingsStore((s) => s.setJoinSoundEnabled);
  const setLeaveSoundEnabled = useVoiceSettingsStore((s) => s.setLeaveSoundEnabled);
  const setJoinSoundUrl = useVoiceSettingsStore((s) => s.setJoinSoundUrl);
  const setLeaveSoundUrl = useVoiceSettingsStore((s) => s.setLeaveSoundUrl);
  const addToast = useToastStore((s) => s.addToast);

  const joinSoundRef = useRef<HTMLInputElement>(null);
  const leaveSoundRef = useRef<HTMLInputElement>(null);

  const [aiNsSupported, setAiNsSupported] = useState(true);
  const [aiNsUnsupportedReason, setAiNsUnsupportedReason] = useState<string | null>(null);
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>('low');

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

  // Check AI noise suppression capabilities and subscribe to CPU level
  useEffect(() => {
    const caps = noiseSuppressionService.checkCapabilities();
    setAiNsSupported(caps.supported);
    if (!caps.supported) setAiNsUnsupportedReason(caps.reason || 'Not supported');
    const unsub = noiseSuppressionService.onCpuLevelChange(setCpuLevel);
    return unsub;
  }, []);

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

      {vad && (
        <div>
          <Text size="sm" fw={500} mb={4}>Input Sensitivity</Text>
          <Text size="xs" c="dimmed" mb={8}>
            Audio below this threshold will be ignored. Lower values pick up more sound.
          </Text>
          <Slider
            value={inputSensitivity}
            onChange={setInputSensitivitySetting}
            min={0}
            max={100}
            step={1}
            marks={[
              { value: 0, label: '0' },
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 75, label: '75' },
              { value: 100, label: '100' },
            ]}
            label={(v) => `${v}%`}
          />
        </div>
      )}

      <div>
        <Group gap={8} mb={4}>
          <Text size="sm" fw={500}>AI Noise Suppression</Text>
          {aiNoiseSuppression && aiNsSupported && (
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: cpuLevel === 'low' ? '#4ade80' : cpuLevel === 'moderate' ? '#facc15' : '#ef4444',
            }} />
          )}
        </Group>
        <Switch
          label=""
          description={
            aiNsSupported
              ? 'AI-powered noise removal using DTLN (processes audio locally)'
              : aiNsUnsupportedReason || 'Not supported in this environment'
          }
          checked={aiNoiseSuppression}
          disabled={!aiNsSupported}
          onChange={(e) => {
            setAiNoiseSuppressionSetting(e.currentTarget.checked);
            applyAudioProcessingSettings();
          }}
        />
      </div>

      {!aiNoiseSuppression && (
        <Switch
          label="Browser Noise Suppression"
          description="Basic browser-level noise reduction (fallback)"
          checked={noiseSuppression}
          onChange={(e) => {
            setNoiseSuppressionSetting(e.currentTarget.checked);
            applyAudioProcessingSettings();
          }}
        />
      )}

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

      <Divider style={{ borderColor: 'var(--border)' }} />

      {/* Voice Sounds */}
      <Text size="lg" fw={600}>Voice Sounds</Text>
      <Text c="dimmed" size="sm">Control sounds played when users join or leave voice channels.</Text>

      <Stack gap={12}>
        <Group justify="space-between">
          <div style={{ flex: 1 }}>
            <Switch
              label="Join Sound"
              description="Play a sound when someone joins the voice channel"
              checked={joinSoundEnabled}
              onChange={(e) => setJoinSoundEnabled(e.currentTarget.checked)}
            />
          </div>
          {joinSoundEnabled && (
            <Group gap={4}>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => {
                  const audio = new Audio(joinSoundUrl || '/sounds/voice-join.mp3');
                  audio.volume = outputVolume / 100;
                  audio.play().catch(() => {});
                }}
              >
                Preview
              </Button>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconUpload size={14} />}
                onClick={() => joinSoundRef.current?.click()}
              >
                Custom
              </Button>
              {joinSoundUrl && (
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => setJoinSoundUrl(null)} title="Reset to default">
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Group>

        <Group justify="space-between">
          <div style={{ flex: 1 }}>
            <Switch
              label="Leave Sound"
              description="Play a sound when someone leaves the voice channel"
              checked={leaveSoundEnabled}
              onChange={(e) => setLeaveSoundEnabled(e.currentTarget.checked)}
            />
          </div>
          {leaveSoundEnabled && (
            <Group gap={4}>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => {
                  const audio = new Audio(leaveSoundUrl || '/sounds/voice-leave.mp3');
                  audio.volume = outputVolume / 100;
                  audio.play().catch(() => {});
                }}
              >
                Preview
              </Button>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconUpload size={14} />}
                onClick={() => leaveSoundRef.current?.click()}
              >
                Custom
              </Button>
              {leaveSoundUrl && (
                <ActionIcon variant="subtle" color="red" size={24} onClick={() => setLeaveSoundUrl(null)} title="Reset to default">
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Group>

        {joinSoundUrl && (
          <Text size="xs" c="dimmed">Custom join sound: {joinSoundUrl.split('/').pop()}</Text>
        )}
        {leaveSoundUrl && (
          <Text size="xs" c="dimmed">Custom leave sound: {leaveSoundUrl.split('/').pop()}</Text>
        )}
      </Stack>

      {/* Hidden file inputs for custom sound uploads */}
      <input ref={joinSoundRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const data = await api.upload<{ url: string }>('/api/users/voice-sounds', file, { type: 'join' });
          setJoinSoundUrl(data.url);
          addToast({ type: 'system', title: 'Sound Uploaded', message: 'Custom join sound set.' });
        } catch {
          addToast({ type: 'warning', title: 'Upload Failed', message: 'Could not upload custom sound.' });
        }
        e.target.value = '';
      }} />
      <input ref={leaveSoundRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const data = await api.upload<{ url: string }>('/api/users/voice-sounds', file, { type: 'leave' });
          setLeaveSoundUrl(data.url);
          addToast({ type: 'system', title: 'Sound Uploaded', message: 'Custom leave sound set.' });
        } catch {
          addToast({ type: 'warning', title: 'Upload Failed', message: 'Could not upload custom sound.' });
        }
        e.target.value = '';
      }} />
    </Stack>
  );
}

/* ─── Avatar History ─── */

function AvatarHistory({ onRevert }: { onRevert: (url: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: history } = useQuery({
    queryKey: ['avatar-history'],
    queryFn: () => api.getArray<{ url: string; uploaded_at: string }>('/api/users/me/avatar/history'),
    enabled: expanded,
  });

  return (
    <div>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconHistory size={14} />}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide Avatar History' : 'Avatar History'}
      </Button>
      {expanded && (
        <Group gap={8} mt={8}>
          {!history || history.length === 0 ? (
            <Text size="xs" c="dimmed">No previous avatars</Text>
          ) : (
            history.map((entry, i) => (
              <UnstyledButton
                key={i}
                onClick={() => onRevert(entry.url)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <img src={entry.url} alt="Previous avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </UnstyledButton>
            ))
          )}
        </Group>
      )}
    </div>
  );
}
