import { ActionIcon, Group, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconHash, IconVolume, IconChevronDown, IconPlus, IconSettings } from '@tabler/icons-react';
import { useChannels, type Channel } from '../../hooks/useChannels';
import { useUIStore } from '../../stores/uiStore';
import { useServers } from '../../hooks/useServers';
import { UserPanel } from './UserPanel';

export function ChannelSidebar() {
  const { activeServerId, activeChannelId, setActiveChannel } = useUIStore();
  const { data: servers } = useServers();
  const { data: channels } = useChannels(activeServerId);

  const activeServer = servers?.find((s) => s.id === activeServerId);

  if (!activeServerId) return null;

  // Group channels by category
  const categories = channels?.filter((c) => c.type === 'category') || [];
  const uncategorized = channels?.filter((c) => c.type !== 'category' && !c.category_id) || [];

  return (
    <div style={{
      width: 240,
      background: '#2b2d31',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Server header */}
      <UnstyledButton
        style={{
          height: 48,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1a1b1e',
          flexShrink: 0,
        }}
      >
        <Text fw={600} size="sm" truncate>
          {activeServer?.name || 'Server'}
        </Text>
        <IconChevronDown size={16} style={{ color: '#8e8e93' }} />
      </UnstyledButton>

      {/* Channel list */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4} type="hover">
        <Stack gap={2} p={8}>
          {/* Uncategorized channels */}
          {uncategorized.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              active={activeChannelId === channel.id}
              onClick={() => setActiveChannel(channel.id)}
            />
          ))}

          {/* Categorized channels */}
          {categories.map((category) => {
            const categoryChannels = channels?.filter(
              (c) => c.category_id === category.id && c.type !== 'category'
            ) || [];

            return (
              <div key={category.id}>
                <Group gap={4} px={4} py={8}>
                  <IconChevronDown size={10} style={{ color: '#8e8e93' }} />
                  <Text
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    c="dimmed"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {category.name}
                  </Text>
                </Group>
                {categoryChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    active={activeChannelId === channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                  />
                ))}
              </div>
            );
          })}
        </Stack>
      </ScrollArea>

      {/* User panel at bottom */}
      <UserPanel />
    </div>
  );
}

function ChannelItem({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  const Icon = channel.type === 'voice' ? IconVolume : IconHash;

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        background: active ? '#35373c' : 'transparent',
        color: active ? '#e1e1e6' : '#8e8e93',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#2e3035';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={18} style={{ flexShrink: 0, opacity: 0.7 }} />
      <Text size="sm" truncate style={{ flex: 1 }}>
        {channel.name}
      </Text>
    </UnstyledButton>
  );
}
