import { Avatar, Badge, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { IconMicrophoneOff, IconHeadphonesOff, IconMessage, IconVolume, IconUserOff, IconArrowRight } from '@tabler/icons-react';
import type { VoiceParticipant } from '../../lib/voiceService';
import { getVideoElementForStreamer, moveMember, serverDeafenMember } from '../../lib/voiceService';
import { streamViewerStore } from '../../stores/streamViewer';
import { useVoiceStore } from '../../stores/voiceStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChannels } from '../../hooks/useChannels';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

interface VoiceParticipantsListProps {
  participants: VoiceParticipant[];
  compact?: boolean;
}

export function VoiceParticipantsList({ participants, compact }: VoiceParticipantsListProps) {
  const channelId = useVoiceStore((s) => s.channelId);
  const permissions = useVoiceStore((s) => s.permissions);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const { data: channels } = useChannels(activeServerId);

  if (participants.length === 0) return null;

  const handleWatchStream = (p: VoiceParticipant) => {
    if (!channelId) return;
    streamViewerStore.watchStream({
      streamerId: p.id,
      streamerName: p.username,
      streamerAvatar: p.avatarUrl || null,
      channelId,
      isLocalPreview: false,
    });
    const video = getVideoElementForStreamer(p.id);
    if (video) {
      streamViewerStore.setVideoElement(video);
    }
  };

  const handleOpenDM = async (userId: string) => {
    try {
      const result = await api.post<{ id: string }>('/api/dms', { user_id: userId });
      await queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      useUIStore.getState().setView('dms');
      useUIStore.getState().setActiveDM(result.id);
    } catch {
      // Ignore
    }
  };

  const handleServerMute = async (userId: string, muted: boolean) => {
    if (!channelId) return;
    try {
      await api.post('/api/voice/server-mute', { user_id: userId, channel_id: channelId, muted });
    } catch {
      // Ignore
    }
  };

  const handleServerDeafen = async (userId: string, deafened: boolean) => {
    if (!channelId) return;
    try {
      await serverDeafenMember(userId, channelId, deafened);
    } catch {
      // Ignore
    }
  };

  const handleMoveMember = async (userId: string, toChannelId: string) => {
    if (!channelId) return;
    try {
      await moveMember(userId, channelId, toChannelId);
    } catch {
      // Ignore
    }
  };

  const handleDisconnect = async (userId: string) => {
    if (!channelId) return;
    try {
      await api.post('/api/voice/disconnect-member', { user_id: userId, channel_id: channelId });
    } catch {
      // Ignore
    }
  };

  // Voice channels available for move-to (exclude current channel)
  const voiceChannels = (channels || []).filter(
    (ch) => (ch.type === 'voice' || ch.type === 'stage' || ch.type === 'temp_voice') && ch.id !== channelId,
  );

  return (
    <Stack gap={2}>
      {participants.map((p) => {
        const isMe = p.id === currentUserId;
        const muteLabel = p.isServerMuted ? 'Server Muted' : 'Muted';

        return (
          <Menu key={p.id} position="right-start" withArrow shadow="md" trigger="contextMenu">
            <Menu.Target>
              <Group
                gap={6}
                px={compact ? 4 : 8}
                py={2}
                style={{
                  borderRadius: 4,
                  opacity: p.isMuted ? 0.6 : 1,
                  cursor: 'pointer',
                }}
                wrap="nowrap"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar
                  size={compact ? 20 : 24}
                  radius="xl"
                  color={p.isStreaming ? 'violet' : p.isSpeaking ? 'green' : 'brand'}
                  src={p.avatarUrl}
                  style={{
                    border: p.isStreaming
                      ? '2px solid var(--mantine-color-violet-5)'
                      : p.isSpeaking
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {p.username.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" truncate>
                    {p.username}
                  </Text>
                  {p.voiceStatus && (
                    <Text size="xs" c="dimmed" truncate style={{ fontSize: '0.6rem', lineHeight: 1.2 }}>
                      {p.voiceStatus}
                    </Text>
                  )}
                </div>
                {p.isMuted && (
                  <Tooltip label={muteLabel} position="right" withArrow>
                    <IconMicrophoneOff
                      size={12}
                      style={{
                        color: p.isServerMuted ? 'var(--mantine-color-red-5)' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    />
                  </Tooltip>
                )}
                {p.isDeafened && (
                  <Tooltip label={p.isServerDeafened ? 'Server Deafened' : 'Deafened'} position="right" withArrow>
                    <IconHeadphonesOff size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Tooltip>
                )}
                {p.isStreaming && (
                  <Tooltip label="Watch Stream" position="right" withArrow>
                    <Badge
                      size="xs"
                      variant="filled"
                      color="red"
                      style={{ fontSize: '0.55rem', cursor: 'pointer', flexShrink: 0 }}
                      onClick={(e) => { e.stopPropagation(); handleWatchStream(p); }}
                    >
                      LIVE
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            </Menu.Target>
            <Menu.Dropdown style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
              <Menu.Label>{p.username}</Menu.Label>
              {!isMe && (
                <Menu.Item
                  leftSection={<IconMessage size={14} />}
                  onClick={() => handleOpenDM(p.id)}
                >
                  Message
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconVolume size={14} />}
                disabled
              >
                Adjust Volume
              </Menu.Item>
              {!isMe && permissions?.canMuteMembers && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconMicrophoneOff size={14} />}
                    color={p.isServerMuted ? undefined : 'red'}
                    onClick={() => handleServerMute(p.id, !p.isServerMuted)}
                  >
                    {p.isServerMuted ? 'Unmute Member' : 'Server Mute'}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconHeadphonesOff size={14} />}
                    color={p.isServerDeafened ? undefined : 'red'}
                    onClick={() => handleServerDeafen(p.id, !p.isServerDeafened)}
                  >
                    {p.isServerDeafened ? 'Undeafen Member' : 'Server Deafen'}
                  </Menu.Item>
                </>
              )}
              {!isMe && permissions?.canDisconnectMembers && (
                <Menu.Item
                  leftSection={<IconUserOff size={14} />}
                  color="red"
                  onClick={() => handleDisconnect(p.id)}
                >
                  Disconnect
                </Menu.Item>
              )}
              {!isMe && permissions?.canMoveMembers && voiceChannels.length > 0 && (
                <>
                  <Menu.Divider />
                  <Menu.Label>Move to Channel</Menu.Label>
                  {voiceChannels.map((ch) => (
                    <Menu.Item
                      key={ch.id}
                      leftSection={<IconArrowRight size={14} />}
                      onClick={() => handleMoveMember(p.id, ch.id)}
                    >
                      {ch.name}
                    </Menu.Item>
                  ))}
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        );
      })}
    </Stack>
  );
}
