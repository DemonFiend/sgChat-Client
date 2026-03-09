import { useState, useCallback, useEffect, useRef } from 'react';
import { ActionIcon, Avatar, Badge, Collapse, Group, Indicator, Menu, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { Reorder } from 'framer-motion';
import {
  IconHash, IconVolume, IconChevronDown, IconChevronRight,
  IconSpeakerphone, IconMusic, IconPlus, IconMoon, IconSettings,
  IconLink, IconBell, IconBellOff, IconBellRinging, IconCrown, IconInfoCircle,
  IconCheck, IconCalendar,
} from '@tabler/icons-react';
import { useChannelNotificationStore, type NotificationLevel } from '../../stores/channelNotificationStore';
import { useChannels, type Channel, type ChannelType } from '../../hooks/useChannels';
import { useCategories } from '../../hooks/useCategories';
import { useChannelReadState } from '../../hooks/useServerInfo';
import { useUIStore } from '../../stores/uiStore';
import { useServers } from '../../hooks/useServers';
import { useUnreadStore } from '../../stores/unreadStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { hasPermission } from '../../stores/permissions';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { toastStore } from '../../stores/toastNotifications';
import { UserInfoPanel } from './UserInfoPanel';
import { VoicePanel } from '../voice/VoicePanel';
import { VoiceParticipantsList } from '../ui/VoiceParticipantsList';
import { ServerSettingsModal } from '../ui/ServerSettingsModal';
import { ChannelSettingsModal } from '../ui/ChannelSettingsModal';
import { CategorySettingsModal } from '../ui/CategorySettingsModal';

const CHANNEL_ICONS: Record<ChannelType, typeof IconHash> = {
  text: IconHash,
  voice: IconVolume,
  announcement: IconSpeakerphone,
  music: IconMusic,
  temp_voice_generator: IconPlus,
  temp_voice: IconVolume,
  stage: IconSpeakerphone,
};

function getChannelIcon(channel: Channel) {
  if (channel.is_afk_channel) return IconMoon;
  return CHANNEL_ICONS[channel.type] || IconHash;
}

export function ChannelSidebar() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  const activeChannelId = useUIStore((s) => s.activeChannelId);
  const setActiveChannel = useUIStore((s) => s.setActiveChannel);
  const { data: servers } = useServers();
  const { data: channels } = useChannels(activeServerId);
  const { data: fetchedCategories } = useCategories(activeServerId);
  const unreads = useUnreadStore((s) => s.unreads);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [motdVisible, setMotdVisible] = useState(true);
  const [categorySettingsId, setCategorySettingsId] = useState<string | null>(null);

  const activeServer = servers?.find((s) => s.id === activeServerId);
  const channelNotifLoaded = useChannelNotificationStore((s) => s.loaded);
  const fetchChannelNotifSettings = useChannelNotificationStore((s) => s.fetchAll);

  // Fetch channel notification settings on mount
  useEffect(() => {
    if (!channelNotifLoaded) fetchChannelNotifSettings();
  }, [channelNotifLoaded, fetchChannelNotifSettings]);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Auto-select the first text channel when channels load and none is active
  useEffect(() => {
    if (!activeChannelId && channels && channels.length > 0) {
      const firstText = [...channels]
        .sort((a, b) => a.position - b.position)
        .find((c) => c.type === 'text' || c.type === 'announcement');
      if (firstText) {
        setActiveChannel(firstText.id);
      }
    }
  }, [activeChannelId, channels, setActiveChannel]);

  if (!activeServerId) return null;

  // Sort all channels by position
  const sorted = [...(channels || [])].sort((a, b) => a.position - b.position);

  // Categories come from a separate API — group channels by category_id
  const sortedCategories = [...(fetchedCategories || [])].sort((a, b) => a.position - b.position);
  const uncategorized = sorted.filter((c) => !c.category_id);

  // Local category order for drag-and-drop reorder
  const [localCategories, setLocalCategories] = useState(sortedCategories);
  const prevCategoriesRef = useRef(sortedCategories);
  useEffect(() => {
    // Sync local state when fetched data changes (but not during drag)
    if (JSON.stringify(prevCategoriesRef.current.map(c => c.id)) !== JSON.stringify(sortedCategories.map(c => c.id))) {
      setLocalCategories(sortedCategories);
    }
    prevCategoriesRef.current = sortedCategories;
  }, [sortedCategories]);

  const canReorder = hasPermission('manage_channels');

  const handleCategoryReorder = useCallback((newOrder: typeof localCategories) => {
    if (!canReorder || !activeServerId) return;
    const prevOrder = localCategories;
    setLocalCategories(newOrder);
    api.post(`/api/servers/${activeServerId}/categories/reorder`, {
      categories: newOrder.map((c, i) => ({ id: c.id, position: i })),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['categories', activeServerId] });
    }).catch(() => {
      setLocalCategories(prevOrder);
      toastStore.addToast({ type: 'warning', title: 'Reorder Failed', message: 'Could not save category order.' });
    });
  }, [canReorder, activeServerId, localCategories]);

  const serverMotd = activeServer?.motd;

  return (
    <div style={{
      width: 240,
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Server header with dropdown menu */}
      <Menu shadow="md" width={200} position="bottom-start">
        <Menu.Target>
          <UnstyledButton
            style={{
              height: 48,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <Text fw={600} size="sm" truncate>
              {activeServer?.name || 'Server'}
            </Text>
            <IconChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => setSettingsOpen(true)}>
            Server Settings
          </Menu.Item>
          <Menu.Item leftSection={<IconHash size={14} />} onClick={() => setSettingsOpen(true)}>
            Create Channel
          </Menu.Item>
          <Menu.Item leftSection={<IconLink size={14} />} onClick={() => setSettingsOpen(true)}>
            Invite People
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconBell size={14} />}>
            Notification Settings
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {activeServerId && (
        <ServerSettingsModal
          opened={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          serverId={activeServerId}
        />
      )}

      {/* MOTD banner */}
      {serverMotd && (
        <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <UnstyledButton
            onClick={() => setMotdVisible(!motdVisible)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
            }}
          >
            <IconInfoCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <Text size="xs" fw={600} style={{ color: 'var(--accent)', flex: 1 }}>Server Message</Text>
            {motdVisible ? (
              <IconChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <IconChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
            )}
          </UnstyledButton>
          <Collapse in={motdVisible}>
            <Text size="xs" c="dimmed" px={12} pb={8} style={{ lineHeight: 1.4 }}>
              {serverMotd}
            </Text>
          </Collapse>
        </div>
      )}

      {/* Channel list */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
        <Stack gap={2} p={8}>
          {/* Uncategorized channels */}
          {uncategorized.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              active={activeChannelId === channel.id}
              serverId={activeServerId}
              onClick={() => {
                setActiveChannel(channel.id);
                useUnreadStore.getState().markRead(channel.id);
              }}
            />
          ))}

          {/* Categorized channels (drag-to-reorder when permitted) */}
          <Reorder.Group
            axis="y"
            values={localCategories}
            onReorder={handleCategoryReorder}
            as="div"
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {localCategories.map((category) => {
              const categoryChannels = sorted.filter(
                (c) => c.category_id === category.id
              );
              const isCollapsed = collapsedCategories.has(category.id);
              const categoryChannelIds = categoryChannels.map((c) => c.id);
              const categoryUnreadCount = categoryChannelIds.reduce((sum, id) => sum + (unreads[id]?.count || 0), 0);

              return (
                <Reorder.Item
                  key={category.id}
                  value={category}
                  as="div"
                  dragListener={canReorder}
                  style={{ cursor: canReorder ? 'grab' : 'default' }}
                >
                  <Group gap={0} style={{ width: '100%' }} wrap="nowrap">
                    <UnstyledButton
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '6px 4px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {isCollapsed ? (
                        <IconChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      ) : (
                        <IconChevronDown size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <Text
                        size="xs"
                        fw={700}
                        tt="uppercase"
                        c="dimmed"
                        style={{ letterSpacing: '0.5px', flex: 1 }}
                        truncate
                      >
                        {category.name}
                      </Text>
                      {isCollapsed && categoryUnreadCount > 0 && (
                        <Badge size="xs" variant="filled" color="brand" circle>
                          {categoryUnreadCount}
                        </Badge>
                      )}
                    </UnstyledButton>
                    <Tooltip label="Category Settings" withArrow position="right">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size={18}
                        onClick={(e) => { e.stopPropagation(); setCategorySettingsId(category.id); }}
                        style={{ opacity: 0.5, flexShrink: 0 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                      >
                        <IconSettings size={12} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  {!isCollapsed && categoryChannels.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      active={activeChannelId === channel.id}
                      serverId={activeServerId}
                      onClick={() => {
                        setActiveChannel(channel.id);
                        useUnreadStore.getState().markRead(channel.id);
                      }}
                    />
                  ))}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </Stack>
      </ScrollArea>

      {/* Voice panel + User info at bottom */}
      <VoicePanel />
      <UserInfoPanel />

      {/* Category settings modal */}
      {categorySettingsId && (
        <CategorySettingsModal
          opened={!!categorySettingsId}
          onClose={() => setCategorySettingsId(null)}
          categoryId={categorySettingsId}
          serverId={activeServerId}
        />
      )}
    </div>
  );
}

const NOTIF_LEVEL_OPTIONS: { value: NotificationLevel; label: string; icon: typeof IconBell }[] = [
  { value: 'default', label: 'Default', icon: IconBell },
  { value: 'all', label: 'All Messages', icon: IconBellRinging },
  { value: 'mentions', label: 'Mentions Only', icon: IconBell },
  { value: 'none', label: 'Nothing', icon: IconBellOff },
];

function ChannelItem({ channel, active, onClick, serverId }: { channel: Channel; active: boolean; onClick: () => void; serverId: string }) {
  const Icon = getChannelIcon(channel);
  const unreadEntry = useUnreadStore((s) => s.unreads[channel.id]);
  const hasUnread = (unreadEntry?.count ?? 0) > 0;
  const isVoiceType = channel.type === 'voice' || channel.type === 'temp_voice' || channel.type === 'temp_voice_generator' || channel.type === 'music' || channel.type === 'stage';
  const [hovered, setHovered] = useState(false);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  const notifLevel = useChannelNotificationStore((s) => s.settings[channel.id]?.level || 'default');
  const notifSetting = useChannelNotificationStore((s) => s.settings[channel.id]);
  const updateNotifSetting = useChannelNotificationStore((s) => s.updateSetting);
  const removeNotifSetting = useChannelNotificationStore((s) => s.removeSetting);

  // Seed unread count from server read state on mount (once per channel)
  const { data: readState } = useChannelReadState(channel.type === 'text' || channel.type === 'announcement' ? channel.id : null);
  const seededRef = useRef(false);
  useEffect(() => {
    // Reset seed flag when channel changes
    seededRef.current = false;
  }, [channel.id]);
  useEffect(() => {
    if (readState?.unread_count && readState.unread_count > 0 && !seededRef.current) {
      seededRef.current = true;
      useUnreadStore.setState((s) => ({
        unreads: { ...s.unreads, [channel.id]: { count: readState.unread_count!, mentions: 0 } },
      }));
    }
  }, [readState?.unread_count, channel.id]);

  const voiceJoin = useVoiceStore((s) => s.join);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const voiceParticipants = useVoiceStore((s) => s.participants);

  const handleClick = () => {
    if (isVoiceType) {
      if (voiceChannelId !== channel.id) {
        voiceJoin(channel.id, channel.name, channel.type);
      }
    } else {
      onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setNotifMenuOpen(true);
  };

  const isInThisVoiceChannel = voiceChannelId === channel.id;
  const isMuted = notifLevel === 'none';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Menu opened={notifMenuOpen} onChange={setNotifMenuOpen} position="right-start" withArrow>
        <Menu.Target>
          <UnstyledButton
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 4,
              background: active ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
              color: active || hasUnread ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: hasUnread ? 600 : 400,
              transition: 'background 0.1s',
              position: 'relative',
              width: '100%',
              opacity: isMuted ? 0.5 : 1,
            }}
          >
            {hasUnread && !active && (
              <div style={{
                position: 'absolute',
                left: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 4,
                height: 8,
                borderRadius: '0 4px 4px 0',
                background: 'var(--text-primary)',
              }} />
            )}
            <Icon size={18} style={{ flexShrink: 0, opacity: 0.7 }} />
            <Text size="sm" truncate style={{ flex: 1 }}>
              {channel.name}
            </Text>
            {isMuted && !hovered && (
              <IconBellOff size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
            {hovered && (
              <Tooltip label="Edit Channel" withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={20}
                  onClick={(e) => { e.stopPropagation(); setChannelSettingsOpen(true); }}
                >
                  <IconSettings size={12} />
                </ActionIcon>
              </Tooltip>
            )}
            {!hovered && !isMuted && (unreadEntry?.mentions ?? 0) > 0 && (
              <Badge size="xs" variant="filled" color="red" circle>
                {unreadEntry!.mentions}
              </Badge>
            )}
            {!hovered && !isMuted && !active && hasUnread && (unreadEntry?.mentions ?? 0) === 0 && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--text-primary)',
                flexShrink: 0,
                opacity: 0.6,
              }} />
            )}
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <Menu.Label>Notification Settings</Menu.Label>
          {NOTIF_LEVEL_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt.value}
              leftSection={<opt.icon size={14} />}
              rightSection={notifLevel === opt.value ? <IconCheck size={14} style={{ color: 'var(--accent)' }} /> : null}
              onClick={() => {
                if (opt.value === 'default') {
                  removeNotifSetting(channel.id);
                } else {
                  updateNotifSetting(channel.id, { level: opt.value });
                }
              }}
            >
              {opt.label}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item
            leftSection={notifSetting?.suppress_everyone ? <IconCheck size={14} /> : <div style={{ width: 14 }} />}
            onClick={() => updateNotifSetting(channel.id, { suppress_everyone: !notifSetting?.suppress_everyone })}
          >
            Suppress @everyone
          </Menu.Item>
          <Menu.Item
            leftSection={notifSetting?.suppress_roles ? <IconCheck size={14} /> : <div style={{ width: 14 }} />}
            onClick={() => updateNotifSetting(channel.id, { suppress_roles: !notifSetting?.suppress_roles })}
          >
            Suppress @role
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => setChannelSettingsOpen(true)}>
            Channel Settings
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {isVoiceType && isInThisVoiceChannel && voiceParticipants.length > 0 && (
        <div style={{ paddingLeft: 28, paddingTop: 2, paddingBottom: 2 }}>
          <VoiceParticipantsList participants={voiceParticipants} compact />
        </div>
      )}

      <ChannelSettingsModal
        opened={channelSettingsOpen}
        onClose={() => setChannelSettingsOpen(false)}
        channelId={channel.id}
        serverId={serverId}
      />
    </div>
  );
}
