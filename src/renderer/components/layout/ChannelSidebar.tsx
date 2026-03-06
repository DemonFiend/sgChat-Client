import { useState, useCallback, useEffect } from 'react';
import { ActionIcon, Avatar, Badge, Collapse, Group, Indicator, Menu, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconHash, IconVolume, IconChevronDown, IconChevronRight,
  IconSpeakerphone, IconMusic, IconPlus, IconMoon, IconSettings,
  IconLink, IconBell, IconCrown, IconInfoCircle,
} from '@tabler/icons-react';
import { useChannels, type Channel, type ChannelType } from '../../hooks/useChannels';
import { useCategories } from '../../hooks/useCategories';
import { useChannelReadState } from '../../hooks/useServerInfo';
import { useUIStore } from '../../stores/uiStore';
import { useServers } from '../../hooks/useServers';
import { useUnreadStore } from '../../stores/unreadStore';
import { useVoiceStore } from '../../stores/voiceStore';
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

          {/* Categorized channels */}
          {sortedCategories.map((category) => {
            const categoryChannels = sorted.filter(
              (c) => c.category_id === category.id
            );
            const isCollapsed = collapsedCategories.has(category.id);
            const categoryChannelIds = categoryChannels.map((c) => c.id);
            const categoryUnreadCount = categoryChannelIds.reduce((sum, id) => sum + (unreads[id]?.count || 0), 0);

            return (
              <div key={category.id}>
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
              </div>
            );
          })}
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

function ChannelItem({ channel, active, onClick, serverId }: { channel: Channel; active: boolean; onClick: () => void; serverId: string }) {
  const Icon = getChannelIcon(channel);
  const unreadEntry = useUnreadStore((s) => s.unreads[channel.id]);
  const hasUnread = (unreadEntry?.count ?? 0) > 0;
  const isVoiceType = channel.type === 'voice' || channel.type === 'temp_voice' || channel.type === 'temp_voice_generator' || channel.type === 'music';
  const [hovered, setHovered] = useState(false);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);

  // Seed unread count from server read state on mount
  const { data: readState } = useChannelReadState(channel.type === 'text' || channel.type === 'announcement' ? channel.id : null);
  useEffect(() => {
    if (readState?.unread_count && readState.unread_count > 0 && !unreadEntry) {
      useUnreadStore.getState().increment(channel.id);
      // Set the correct count by replacing via direct state update
      useUnreadStore.setState((s) => ({
        unreads: { ...s.unreads, [channel.id]: { count: readState.unread_count!, mentions: 0 } },
      }));
    }
  }, [readState?.unread_count, channel.id, unreadEntry]);

  // For voice channels, handle click differently
  const voiceJoin = useVoiceStore((s) => s.join);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const voiceParticipants = useVoiceStore((s) => s.participants);

  const handleClick = () => {
    if (isVoiceType) {
      // Join voice channel (server handles temp_voice_generator automatically)
      if (voiceChannelId !== channel.id) {
        voiceJoin(channel.id, channel.name);
      }
    } else {
      onClick();
    }
  };

  const isInThisVoiceChannel = voiceChannelId === channel.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <UnstyledButton
        onClick={handleClick}
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
        }}
      >
        {/* Unread pill indicator */}
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
        {!hovered && (unreadEntry?.mentions ?? 0) > 0 && (
          <Badge size="xs" variant="filled" color="red" circle>
            {unreadEntry!.mentions}
          </Badge>
        )}
        {!hovered && !active && hasUnread && (unreadEntry?.mentions ?? 0) === 0 && (
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

      {/* Voice channel participants inline */}
      {isVoiceType && isInThisVoiceChannel && voiceParticipants.length > 0 && (
        <div style={{ paddingLeft: 28, paddingTop: 2, paddingBottom: 2 }}>
          <VoiceParticipantsList participants={voiceParticipants} compact />
        </div>
      )}

      {/* Channel settings modal */}
      <ChannelSettingsModal
        opened={channelSettingsOpen}
        onClose={() => setChannelSettingsOpen(false)}
        channelId={channel.id}
        serverId={serverId}
      />
    </div>
  );
}
