import { useState, useCallback } from 'react';
import { ActionIcon, Avatar, Badge, Collapse, Group, Indicator, Menu, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconHash, IconVolume, IconChevronDown, IconChevronRight,
  IconSpeakerphone, IconMusic, IconPlus, IconMoon, IconSettings,
  IconLink, IconBell, IconCrown, IconInfoCircle,
} from '@tabler/icons-react';
import { useChannels, type Channel, type ChannelType } from '../../hooks/useChannels';
import { useUIStore } from '../../stores/uiStore';
import { useServers } from '../../hooks/useServers';
import { useUnreadStore } from '../../stores/unreadStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { UserPanel } from './UserPanel';
import { VoiceBar } from '../voice/VoiceBar';
import { ServerSettingsModal } from '../ui/ServerSettingsModal';
import { ChannelSettingsModal } from '../ui/ChannelSettingsModal';

const CHANNEL_ICONS: Record<ChannelType, typeof IconHash> = {
  text: IconHash,
  voice: IconVolume,
  category: IconHash, // not rendered directly
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
  const { activeServerId, activeChannelId, setActiveChannel } = useUIStore();
  const { data: servers } = useServers();
  const { data: channels } = useChannels(activeServerId);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  if (!activeServerId) return null;

  // Sort all channels by position
  const sorted = [...(channels || [])].sort((a, b) => a.position - b.position);

  // Group channels by category
  const categories = sorted.filter((c) => c.type === 'category');
  const uncategorized = sorted.filter((c) => c.type !== 'category' && !c.category_id);

  const [motdVisible, setMotdVisible] = useState(true);
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
          {categories.map((category) => {
            const categoryChannels = sorted.filter(
              (c) => c.category_id === category.id && c.type !== 'category'
            );
            const isCollapsed = collapsedCategories.has(category.id);
            const categoryChannelIds = categoryChannels.map((c) => c.id);
            const categoryUnreadCount = useUnreadStore.getState().getCategoryUnreadCount(categoryChannelIds);

            return (
              <div key={category.id}>
                <UnstyledButton
                  onClick={() => toggleCategory(category.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    padding: '6px 4px',
                    width: '100%',
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

      {/* Voice bar + User panel at bottom */}
      <VoiceBar compact />
      <UserPanel />
    </div>
  );
}

function ChannelItem({ channel, active, onClick, serverId }: { channel: Channel; active: boolean; onClick: () => void; serverId: string }) {
  const Icon = getChannelIcon(channel);
  const unread = useUnreadStore((s) => s.getUnread(channel.id));
  const hasUnread = unread.count > 0;
  const isVoiceType = channel.type === 'voice' || channel.type === 'temp_voice' || channel.type === 'temp_voice_generator';
  const [hovered, setHovered] = useState(false);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);

  // For voice channels, handle click differently
  const voiceJoin = useVoiceStore((s) => s.join);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const voiceParticipants = useVoiceStore((s) => s.participants);

  const handleClick = () => {
    if (isVoiceType && channel.type !== 'temp_voice_generator') {
      // Join voice channel
      if (voiceChannelId !== channel.id) {
        voiceJoin(channel.id);
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
        {hovered && channel.type !== 'category' && (
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
        {!hovered && unread.mentions > 0 && (
          <Badge size="xs" variant="filled" color="red" circle>
            {unread.mentions}
          </Badge>
        )}
      </UnstyledButton>

      {/* Voice channel participants inline */}
      {isVoiceType && isInThisVoiceChannel && voiceParticipants.length > 0 && (
        <Stack gap={2} pl={28} py={2}>
          {voiceParticipants.map((p) => (
            <Group key={p.id} gap={6} style={{ opacity: p.isMuted ? 0.5 : 1 }}>
              <Indicator
                color={p.isSpeaking ? 'green' : 'gray'}
                size={6}
                offset={2}
                position="bottom-end"
              >
                <Avatar size={20} radius="xl" color="brand">
                  {p.username.charAt(0).toUpperCase()}
                </Avatar>
              </Indicator>
              <Text size="xs" c="dimmed" truncate>{p.username}</Text>
            </Group>
          ))}
        </Stack>
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
