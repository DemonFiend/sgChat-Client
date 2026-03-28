import { NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import {
  IconShield, IconUsers, IconDatabase, IconHistory,
  IconMoodSmile, IconHeartHandshake, IconArrowLeft, IconServer2,
  IconZzz, IconBug, IconEye,
} from '@tabler/icons-react';
import { useUIStore } from '../stores/uiStore';
import { RolesPanel } from '../components/ui/server-settings/RolesPanel';
import { MembersPanel } from '../components/ui/server-settings/MembersPanel';
import { StorageDashboardPanel } from '../components/ui/server-settings/StorageDashboardPanel';
import { AuditLogPanel } from '../components/ui/server-settings/AuditLogPanel';
import { EmojiPacksPanel } from '../components/ui/server-settings/EmojiPacksPanel';
import { RoleReactionsPanel } from '../components/ui/server-settings/RoleReactionsPanel';
import { RelayServersPanel } from '../components/ui/server-settings/RelayServersPanel';
import { AFKSettingsPanel } from '../components/ui/server-settings/AFKSettingsPanel';
import { CrashReportsPanel } from '../components/ui/server-settings/CrashReportsPanel';
import { ImpersonationControlPanel } from '../components/ui/ImpersonationControlPanel';

const ADMIN_SECTIONS = [
  { id: 'roles' as const, label: 'Roles & Permissions', icon: IconShield },
  { id: 'members' as const, label: 'Members', icon: IconUsers },
  { id: 'storage' as const, label: 'Storage Dashboard', icon: IconDatabase },
  { id: 'audit' as const, label: 'Audit Log', icon: IconHistory },
  { id: 'emojis' as const, label: 'Emoji Packs', icon: IconMoodSmile },
  { id: 'role-reactions' as const, label: 'Role Reactions', icon: IconHeartHandshake },
  { id: 'relay-servers' as const, label: 'Relay Servers', icon: IconServer2 },
  { id: 'afk-settings' as const, label: 'AFK Settings', icon: IconZzz },
  { id: 'crash-reports' as const, label: 'Crash Reports', icon: IconBug },
  { id: 'impersonation' as const, label: 'Impersonate User', icon: IconEye },
] as const;

export type AdminSection = typeof ADMIN_SECTIONS[number]['id'];

export function ServerAdminView() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  const adminSection = useUIStore((s) => s.adminSection);
  const setAdminSection = useUIStore((s) => s.setAdminSection);
  const setView = useUIStore((s) => s.setView);

  if (!activeServerId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed">No server selected</Text>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Stack
        gap={2}
        style={{
          width: 200,
          flexShrink: 0,
          padding: 8,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <NavLink
          label="Back to Server"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => setView('servers')}
          variant="subtle"
          style={{ marginBottom: 8 }}
        />

        <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={12} py={4}>
          Server Administration
        </Text>

        {ADMIN_SECTIONS.map((section) => (
          <NavLink
            key={section.id}
            label={section.label}
            leftSection={<section.icon size={16} />}
            active={adminSection === section.id}
            onClick={() => setAdminSection(section.id)}
            variant="subtle"
          />
        ))}
      </Stack>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }}>
        <div style={{ padding: 24, maxWidth: 900 }}>
          {adminSection === 'roles' && <RolesPanel serverId={activeServerId} />}
          {adminSection === 'members' && <MembersPanel serverId={activeServerId} />}
          {adminSection === 'storage' && <StorageDashboardPanel serverId={activeServerId} />}
          {adminSection === 'audit' && <AuditLogPanel serverId={activeServerId} />}
          {adminSection === 'emojis' && <EmojiPacksPanel serverId={activeServerId} />}
          {adminSection === 'role-reactions' && <RoleReactionsPanel serverId={activeServerId} />}
          {adminSection === 'relay-servers' && <RelayServersPanel serverId={activeServerId} />}
          {adminSection === 'afk-settings' && <AFKSettingsPanel serverId={activeServerId} />}
          {adminSection === 'crash-reports' && <CrashReportsPanel serverId={activeServerId} />}
          {adminSection === 'impersonation' && <ImpersonationControlPanel serverId={activeServerId} />}
        </div>
      </ScrollArea>
    </div>
  );
}
