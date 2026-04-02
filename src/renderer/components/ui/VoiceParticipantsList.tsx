import { Avatar, Badge, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { IconMicrophoneOff, IconHeadphonesOff, IconMessage, IconVolume, IconUserOff, IconArrowRight, IconMicrophone, IconHandStop, IconCheck, IconX } from '@tabler/icons-react';
import type { VoiceParticipant } from '../../lib/voiceService';
import { getVideoElementForStreamer, moveMember, serverDeafenMember } from '../../lib/voiceService';
import { streamViewerStore } from '../../stores/streamViewer';
import { useVoiceStore } from '../../stores/voiceStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useChannels } from '../../hooks/useChannels';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { getSocket } from '../../api/socket';

interface VoiceParticipantsListProps {
  participants: VoiceParticipant[];
  compact?: boolean;
}

export function VoiceParticipantsList({ participants, compact }: VoiceParticipantsListProps) {
  const channelId = useVoiceStore((s) => s.channelId);
  const channelType = useVoiceStore((s) => s.channelType);
  const permissions = useVoiceStore((s) => s.permissions);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const activeServerId = useUIStore((s) => s.activeServerId);
  const { data: channels } = useChannels(activeServerId);

  if (participants.length === 0) return null;

  const isStage = channelType === 'stage';

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

  const handleApproveSpeaker = (userId: string) => {
    if (!channelId) return;
    getSocket()?.emit('voice:approveSpeaker', { channel_id: channelId, user_id: userId });
  };

  const handleDenySpeaker = (userId: string) => {
    if (!channelId) return;
    getSocket()?.emit('voice:denySpeaker', { channel_id: channelId, user_id: userId });
  };

  const handleRemoveSpeaker = (userId: string) => {
    if (!channelId) return;
    getSocket()?.emit('voice:removeSpeaker', { channel_id: channelId, user_id: userId });
  };

  // Voice channels available for move-to (exclude current channel)
  const voiceChannels = (channels || []).filter(
    (ch) => (ch.type === 'voice' || ch.type === 'stage' || ch.type === 'temp_voice') && ch.id !== channelId,
  );

  // For stage channels, split participants into speakers and listeners
  if (isStage) {
    const speakers = participants.filter((p) => p.isStageSpeaker);
    const raisedHands = participants.filter((p) => !p.isStageSpeaker && p.isHandRaised);
    const listeners = participants.filter((p) => !p.isStageSpeaker && !p.isHandRaised);

    return (
      <Stack gap={2}>
        {/* Speakers section */}
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={compact ? 4 : 8} py={4} style={{ letterSpacing: '0.5px' }}>
          Speakers — {speakers.length}
        </Text>
        {speakers.map((p) => (
          <ParticipantItem
            key={p.id}
            p={p}
            compact={compact}
            isMe={p.id === currentUserId}
            isStage
            permissions={permissions}
            voiceChannels={voiceChannels}
            onWatchStream={handleWatchStream}
            onOpenDM={handleOpenDM}
            onServerMute={handleServerMute}
            onServerDeafen={handleServerDeafen}
            onMoveMember={handleMoveMember}
            onDisconnect={handleDisconnect}
            onRemoveSpeaker={handleRemoveSpeaker}
          />
        ))}
        {speakers.length === 0 && (
          <Text size="xs" c="dimmed" px={compact ? 4 : 8} fs="italic">No speakers</Text>
        )}

        {/* Raised hands (visible to moderators) */}
        {raisedHands.length > 0 && (
          <>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={compact ? 4 : 8} py={4} mt={8} style={{ letterSpacing: '0.5px' }}>
              Raised Hands — {raisedHands.length}
            </Text>
            {raisedHands.map((p) => (
              <ParticipantItem
                key={p.id}
                p={p}
                compact={compact}
                isMe={p.id === currentUserId}
                isStage
                permissions={permissions}
                voiceChannels={voiceChannels}
                onWatchStream={handleWatchStream}
                onOpenDM={handleOpenDM}
                onServerMute={handleServerMute}
                onServerDeafen={handleServerDeafen}
                onMoveMember={handleMoveMember}
                onDisconnect={handleDisconnect}
                onApproveSpeaker={handleApproveSpeaker}
                onDenySpeaker={handleDenySpeaker}
              />
            ))}
          </>
        )}

        {/* Listeners section */}
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" px={compact ? 4 : 8} py={4} mt={8} style={{ letterSpacing: '0.5px' }}>
          Listeners — {listeners.length}
        </Text>
        {listeners.map((p) => (
          <ParticipantItem
            key={p.id}
            p={p}
            compact={compact}
            isMe={p.id === currentUserId}
            isStage
            permissions={permissions}
            voiceChannels={voiceChannels}
            onWatchStream={handleWatchStream}
            onOpenDM={handleOpenDM}
            onServerMute={handleServerMute}
            onServerDeafen={handleServerDeafen}
            onMoveMember={handleMoveMember}
            onDisconnect={handleDisconnect}
          />
        ))}
        {listeners.length === 0 && (
          <Text size="xs" c="dimmed" px={compact ? 4 : 8} fs="italic">No listeners</Text>
        )}
      </Stack>
    );
  }

  // Non-stage: render flat list as before
  return (
    <Stack gap={2}>
      {participants.map((p) => (
        <ParticipantItem
          key={p.id}
          p={p}
          compact={compact}
          isMe={p.id === currentUserId}
          isStage={false}
          permissions={permissions}
          voiceChannels={voiceChannels}
          onWatchStream={handleWatchStream}
          onOpenDM={handleOpenDM}
          onServerMute={handleServerMute}
          onServerDeafen={handleServerDeafen}
          onMoveMember={handleMoveMember}
          onDisconnect={handleDisconnect}
        />
      ))}
    </Stack>
  );
}

interface ParticipantItemProps {
  p: VoiceParticipant;
  compact?: boolean;
  isMe: boolean;
  isStage: boolean;
  permissions: { canMuteMembers?: boolean; canMoveMembers?: boolean; canDisconnectMembers?: boolean } | null;
  voiceChannels: { id: string; name: string }[];
  onWatchStream: (p: VoiceParticipant) => void;
  onOpenDM: (userId: string) => void;
  onServerMute: (userId: string, muted: boolean) => void;
  onServerDeafen: (userId: string, deafened: boolean) => void;
  onMoveMember: (userId: string, toChannelId: string) => void;
  onDisconnect: (userId: string) => void;
  onApproveSpeaker?: (userId: string) => void;
  onDenySpeaker?: (userId: string) => void;
  onRemoveSpeaker?: (userId: string) => void;
}

function ParticipantItem({
  p, compact, isMe, isStage, permissions, voiceChannels,
  onWatchStream, onOpenDM, onServerMute, onServerDeafen, onMoveMember, onDisconnect,
  onApproveSpeaker, onDenySpeaker, onRemoveSpeaker,
}: ParticipantItemProps) {
  const muteLabel = p.isServerMuted ? 'Server Muted' : 'Muted';

  // Speaking glow for stage speakers
  const speakerGlow = isStage && p.isStageSpeaker && p.isSpeaking;

  return (
    <Menu key={p.id} position="right-start" withArrow shadow="md" trigger="contextMenu">
      <Menu.Target>
        <Group
          gap={6}
          px={compact ? 4 : 8}
          py={2}
          data-user-id={p.id}
          style={{
            borderRadius: 4,
            opacity: p.isMuted && !p.isStageSpeaker ? 0.6 : 1,
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
                : speakerGlow
                  ? '2px solid var(--accent)'
                  : p.isSpeaking
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
              boxShadow: speakerGlow ? '0 0 8px var(--accent), 0 0 16px rgba(var(--accent-rgb, 99,102,241), 0.3)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.3s',
            }}
          >
            {p.username.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group gap={4} wrap="nowrap">
              <Text size="xs" truncate>
                {p.username}
              </Text>
              {isStage && p.isStageSpeaker && (
                <Tooltip label="Speaker" position="right" withArrow>
                  <IconMicrophone size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Tooltip>
              )}
              {p.isHandRaised && (
                <Tooltip label="Hand Raised" position="right" withArrow>
                  <IconHandStop size={10} style={{ color: 'var(--mantine-color-yellow-5)', flexShrink: 0 }} />
                </Tooltip>
              )}
            </Group>
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
                onClick={(e) => { e.stopPropagation(); onWatchStream(p); }}
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
            onClick={() => onOpenDM(p.id)}
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

        {/* Stage speaker management */}
        {isStage && !isMe && onApproveSpeaker && p.isHandRaised && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconCheck size={14} />}
              color="green"
              onClick={() => onApproveSpeaker(p.id)}
            >
              Approve Speaker
            </Menu.Item>
            {onDenySpeaker && (
              <Menu.Item
                leftSection={<IconX size={14} />}
                color="red"
                onClick={() => onDenySpeaker(p.id)}
              >
                Deny Request
              </Menu.Item>
            )}
          </>
        )}
        {isStage && !isMe && onRemoveSpeaker && p.isStageSpeaker && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconMicrophoneOff size={14} />}
              color="orange"
              onClick={() => onRemoveSpeaker(p.id)}
            >
              Remove from Speakers
            </Menu.Item>
          </>
        )}

        {!isMe && permissions?.canMuteMembers && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconMicrophoneOff size={14} />}
              color={p.isServerMuted ? undefined : 'red'}
              onClick={() => onServerMute(p.id, !p.isServerMuted)}
            >
              {p.isServerMuted ? 'Unmute Member' : 'Server Mute'}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconHeadphonesOff size={14} />}
              color={p.isServerDeafened ? undefined : 'red'}
              onClick={() => onServerDeafen(p.id, !p.isServerDeafened)}
            >
              {p.isServerDeafened ? 'Undeafen Member' : 'Server Deafen'}
            </Menu.Item>
          </>
        )}
        {!isMe && permissions?.canDisconnectMembers && (
          <Menu.Item
            leftSection={<IconUserOff size={14} />}
            color="red"
            onClick={() => onDisconnect(p.id)}
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
                onClick={() => onMoveMember(p.id, ch.id)}
              >
                {ch.name}
              </Menu.Item>
            ))}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
