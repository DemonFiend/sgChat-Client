import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionIcon, Avatar, Badge, Group, Slider, Text, Tooltip,
} from '@mantine/core';
import {
  IconVolume, IconVolumeOff, IconMaximize, IconMinimize,
  IconPictureInPicture, IconPictureInPictureOff,
  IconChevronDown, IconDoorExit,
} from '@tabler/icons-react';
import { useStreamViewerStore, streamViewerStore } from '../../stores/streamViewer';
import { useVoiceStore } from '../../stores/voiceStore';
import {
  getLocalScreenShareVideo,
  attachScreenShareAudio, detachScreenShareAudio,
  updateScreenShareAudio, hasScreenShareAudio,
  getVideoElementForStreamer,
} from '../../lib/voiceService';

export function StreamViewer() {
  const activeStream = useStreamViewerStore((s) => s.activeStream);
  const isMinimized = useStreamViewerStore((s) => s.isMinimized);
  const storeVideoElement = useStreamViewerStore((s) => s.videoElement);
  const audioAvailableVersion = useStreamViewerStore((s) => s.audioAvailableVersion);

  const participants = useVoiceStore((s) => s.participants);
  const connected = useVoiceStore((s) => s.connected);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(true);

  const fullViewContainerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAudioRef = useRef<HTMLAudioElement | null>(null);

  // Derive values from activeStream (safe defaults when null)
  const streamerId = activeStream?.streamerId ?? '';
  const streamerName = activeStream?.streamerName ?? '';
  const streamerAvatar = activeStream?.streamerAvatar ?? null;
  const isLocalPreview = activeStream?.isLocalPreview ?? false;

  // Viewers (everyone in channel except the streamer)
  const viewers = useMemo(() => {
    if (!activeStream) return [];
    return participants.filter(p => p.id !== streamerId);
  }, [participants, streamerId, activeStream]);

  // Resolve the video element: store > local preview > remote track
  const effectiveVideoElement = useMemo(() => {
    if (!activeStream) return null;
    if (storeVideoElement) return storeVideoElement;
    if (isLocalPreview) return getLocalScreenShareVideo();
    return getVideoElementForStreamer(streamerId);
  }, [storeVideoElement, isLocalPreview, streamerId, activeStream]);

  // ── Audio handling ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeStream || isLocalPreview) return;

    const checkAndAttach = () => {
      if (hasScreenShareAudio(streamerId) && !streamAudioRef.current) {
        streamAudioRef.current = attachScreenShareAudio(streamerId, volume, isMuted);
      }
    };

    checkAndAttach();
    const poll = setInterval(checkAndAttach, 500);

    return () => {
      clearInterval(poll);
      if (streamAudioRef.current) {
        detachScreenShareAudio(streamerId);
        streamAudioRef.current = null;
      }
    };
  }, [streamerId, audioAvailableVersion, isLocalPreview, activeStream, volume, isMuted]);

  // Sync volume/mute
  useEffect(() => {
    if (activeStream && !isLocalPreview) {
      updateScreenShareAudio(streamerId, volume, isMuted);
    }
  }, [volume, isMuted, streamerId, isLocalPreview, activeStream]);

  // ── Video attachment ────────────────────────────────────────────────────

  useEffect(() => {
    const video = effectiveVideoElement;
    const container = videoContainerRef.current;

    if (video && container) {
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = isLocalPreview ? true : isMuted;
      video.volume = isLocalPreview ? 0 : volume / 100;

      if (video.parentElement !== container) {
        container.innerHTML = '';
        container.appendChild(video);
      }
    }
  }, [effectiveVideoElement, isLocalPreview, isMuted, volume]);

  // Sync video mute/volume (non-local)
  useEffect(() => {
    if (effectiveVideoElement && !isLocalPreview) {
      effectiveVideoElement.muted = isMuted;
      effectiveVideoElement.volume = volume / 100;
    }
  }, [isMuted, volume, effectiveVideoElement, isLocalPreview]);

  // ── Fullscreen ──────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(async () => {
    if (!fullViewContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await fullViewContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('[StreamViewer] Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Picture-in-Picture ──────────────────────────────────────────────────

  const togglePiP = useCallback(async () => {
    if (!effectiveVideoElement) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await effectiveVideoElement.requestPictureInPicture();
      }
    } catch (err) {
      console.error('[StreamViewer] PiP error:', err);
    }
  }, [effectiveVideoElement]);

  useEffect(() => {
    if (!effectiveVideoElement) return;
    const handleEnter = () => setIsPiP(true);
    const handleExit = () => setIsPiP(false);
    effectiveVideoElement.addEventListener('enterpictureinpicture', handleEnter);
    effectiveVideoElement.addEventListener('leavepictureinpicture', handleExit);
    return () => {
      effectiveVideoElement.removeEventListener('enterpictureinpicture', handleEnter);
      effectiveVideoElement.removeEventListener('leavepictureinpicture', handleExit);
    };
  }, [effectiveVideoElement]);

  // ── Auto-hide controls ──────────────────────────────────────────────────

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // ── Leave / Minimize ────────────────────────────────────────────────────

  const handleLeave = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch { /* ignore */ }
    }
    if (streamAudioRef.current) {
      detachScreenShareAudio(streamerId);
      streamAudioRef.current = null;
    }
    streamViewerStore.leaveStream();
  }, [streamerId]);

  const handleMinimize = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
    streamViewerStore.minimizeStream();
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (streamAudioRef.current && streamerId) {
        detachScreenShareAudio(streamerId);
        streamAudioRef.current = null;
      }
    };
  }, [streamerId]);

  // ── Early return AFTER all hooks ────────────────────────────────────────

  if (!activeStream) return null;

  // ── Render ──────────────────────────────────────────────────────────────

  return createPortal(
    <>
      {!isMinimized && (
        <div
          ref={fullViewContainerRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: isFullscreen ? 10000 : 1000,
            display: 'flex',
            flexDirection: 'column',
            background: '#000',
            overflow: 'hidden',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Video area */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.15) 0%, #000 100%)',
          }}>
            {effectiveVideoElement ? (
              <div
                ref={videoContainerRef}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Avatar size="xl" radius="xl" color="violet" src={streamerAvatar} style={{ margin: '0 auto 16px' }}>
                  {streamerName.charAt(0).toUpperCase()}
                </Avatar>
                <Text size="xl" fw={500} c="white">{streamerName}&apos;s Stream</Text>
                <Text size="sm" c="dimmed" mt={8}>
                  {!connected ? 'Join the voice channel to watch this stream' : 'Connecting to stream...'}
                </Text>
                {connected && (
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                    <div
                      style={{
                        animation: 'streamSpin 1s linear infinite',
                        width: 32,
                        height: 32,
                        border: '2px solid rgba(139, 92, 246, 0.3)',
                        borderTopColor: '#8b5cf6',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Top-left: LIVE + YOUR STREAM badges */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge
                size="lg"
                color="red"
                variant="filled"
                leftSection={
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#fff',
                    animation: 'streamPulse 1.5s ease-in-out infinite',
                  }} />
                }
              >
                LIVE
              </Badge>
              {isLocalPreview && (
                <Badge size="lg" color="violet" variant="filled">
                  YOUR STREAM
                </Badge>
              )}
            </div>

            {/* Top-right: Viewer count */}
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', marginRight: 4 }}>
                {viewers.slice(0, 5).map((v, i) => (
                  <Avatar
                    key={v.id}
                    size={28}
                    radius="xl"
                    src={v.avatarUrl}
                    color="brand"
                    style={{
                      marginLeft: i > 0 ? -8 : 0,
                      border: '2px solid #000',
                    }}
                  >
                    {v.username.charAt(0).toUpperCase()}
                  </Avatar>
                ))}
                {viewers.length > 5 && (
                  <Avatar
                    size={28}
                    radius="xl"
                    color="gray"
                    style={{ marginLeft: -8, border: '2px solid #000' }}
                  >
                    +{viewers.length - 5}
                  </Avatar>
                )}
              </div>
              <Badge size="lg" color="dark" variant="filled">
                {viewers.length} watching
              </Badge>
            </div>
          </div>

          {/* Controls bar — auto-hides */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
            padding: 16,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s',
          }}>
            {/* Streamer info */}
            <Group gap={12} mb={12}>
              <Avatar size={36} radius="xl" src={streamerAvatar} color="violet">
                {streamerName.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Text size="sm" fw={500} c="white">{streamerName}</Text>
                <Text size="xs" c="dimmed">Streaming in voice channel</Text>
              </div>
            </Group>

            {/* Control buttons */}
            <Group justify="space-between">
              {/* Left: Volume controls */}
              <Group gap={12}>
                <Tooltip label={isMuted ? 'Unmute' : 'Mute'} position="top" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={36}
                    onClick={() => setIsMuted(prev => !prev)}
                  >
                    {isMuted
                      ? <IconVolumeOff size={20} color="white" />
                      : <IconVolume size={20} color="white" />}
                  </ActionIcon>
                </Tooltip>
                <Slider
                  value={volume}
                  onChange={(val) => {
                    setVolume(val);
                    if (val === 0) setIsMuted(true);
                    else if (isMuted) setIsMuted(false);
                  }}
                  min={0}
                  max={100}
                  size="xs"
                  color="violet"
                  style={{ width: 100 }}
                />
              </Group>

              {/* Right: PiP, Fullscreen, Minimize, Leave */}
              <Group gap={8}>
                {/* PiP */}
                {effectiveVideoElement && document.pictureInPictureEnabled && (
                  <Tooltip label={isPiP ? 'Exit PiP' : 'Picture-in-Picture'} position="top" withArrow>
                    <ActionIcon variant="subtle" color="gray" size={36} onClick={togglePiP}>
                      {isPiP
                        ? <IconPictureInPictureOff size={20} color="white" />
                        : <IconPictureInPicture size={20} color="white" />}
                    </ActionIcon>
                  </Tooltip>
                )}

                {/* Fullscreen */}
                <Tooltip label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} position="top" withArrow>
                  <ActionIcon variant="subtle" color="gray" size={36} onClick={toggleFullscreen}>
                    {isFullscreen
                      ? <IconMinimize size={20} color="white" />
                      : <IconMaximize size={20} color="white" />}
                  </ActionIcon>
                </Tooltip>

                {/* Minimize (keep audio) */}
                <Tooltip label="Minimize (keep audio)" position="top" withArrow>
                  <ActionIcon variant="subtle" color="gray" size={36} onClick={handleMinimize}>
                    <IconChevronDown size={20} color="white" />
                  </ActionIcon>
                </Tooltip>

                {/* Leave */}
                <Tooltip label="Leave Stream" position="top" withArrow>
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size={36}
                    onClick={handleLeave}
                  >
                    <IconDoorExit size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes streamPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes streamSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>,
    document.body,
  );
}

export default StreamViewer;
