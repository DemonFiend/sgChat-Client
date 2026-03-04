import { useEffect, useRef } from 'react';
import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useStreamViewerStore } from '../../stores/streamViewer';
import { getRoom } from '../../lib/voiceService';
import { Track } from 'livekit-client';

export function StreamViewer() {
  const { isViewing, streamerName, streamerId, close } = useStreamViewerStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isViewing || !videoRef.current) return;

    const room = getRoom();
    if (!room) return;

    // Find the screen share track
    let screenTrack: any = null;

    if (streamerId === 'local' || !streamerId) {
      // Local preview
      const localPubs = Array.from(room.localParticipant.trackPublications.values());
      const screenPub = localPubs.find((p) => p.source === Track.Source.ScreenShare);
      screenTrack = screenPub?.track;
    } else {
      const participant = room.remoteParticipants.get(streamerId);
      if (participant) {
        const pubs = Array.from(participant.trackPublications.values());
        const screenPub = pubs.find((p) => p.source === Track.Source.ScreenShare);
        screenTrack = screenPub?.track;
      }
    }

    if (screenTrack && videoRef.current) {
      screenTrack.attach(videoRef.current);
    }

    return () => {
      if (screenTrack && videoRef.current) {
        screenTrack.detach(videoRef.current);
      }
    };
  }, [isViewing, streamerId]);

  if (!isViewing) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <Group
        gap={8}
        px={16}
        py={8}
        style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}
      >
        <Text size="sm" fw={600} style={{ flex: 1, color: '#fff' }}>
          {streamerName}'s Screen
        </Text>
        <ActionIcon variant="subtle" color="gray" size={28} onClick={close}>
          <IconX size={16} />
        </ActionIcon>
      </Group>

      {/* Video */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: 8,
            background: '#000',
          }}
        />
      </div>
    </div>
  );
}
