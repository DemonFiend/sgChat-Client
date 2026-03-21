import { Component, useEffect, useState, type CSSProperties, type ReactNode, type ErrorInfo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Loader, Center, Text, Stack } from '@mantine/core';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { ChatPanel } from '../components/layout/ChatPanel';
import { MemberList } from '../components/layout/MemberList';
import { UnclaimedServerBanner } from '../components/ui/UnclaimedServerBanner';
import { ClaimAdminModal } from '../components/ui/ClaimAdminModal';
import { ServerWelcomePopup } from '../components/ui/ServerWelcomePopup';
import { StreamViewer } from '../components/ui/StreamViewer';
import { useUIStore } from '../stores/uiStore';
import { useServers } from '../hooks/useServers';
import { useAuthStore } from '../stores/authStore';
import { useServerPopupStore } from '../stores/serverPopup';
import { useEmojiManifest } from '../hooks/useEmojis';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

/** Lightweight error boundary that isolates panel crashes from the rest of the layout */
class PanelErrorBoundary extends Component<
  { children: ReactNode; label?: string; width?: number },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; label?: string; width?: number }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[PanelErrorBoundary:${this.props.label || 'panel'}]`, error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const style: CSSProperties = {
        background: 'var(--bg-primary)',
        ...(this.props.width ? { width: this.props.width, flexShrink: 0 } : { flex: 1 }),
      };
      return (
        <Center style={style} h="100%">
          <Stack align="center" gap="sm">
            <Text c="dimmed">Something went wrong.</Text>
            <Button size="xs" variant="light" onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </Button>
          </Stack>
        </Center>
      );
    }
    return this.props.children;
  }
}

export function ServerView() {
  const activeServerId = useUIStore((s) => s.activeServerId);
  const setActiveServer = useUIStore((s) => s.setActiveServer);
  const { data: servers, isLoading } = useServers();
  const user = useAuthStore((s) => s.user);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const showPopup = useServerPopupStore((s) => s.show);

  // Fetch emoji manifest for the active server
  useEmojiManifest(activeServerId);

  // Fetch active server details
  const { data: serverData } = useQuery({
    queryKey: ['server', activeServerId],
    queryFn: () => api.get<any>(`/api/servers/${activeServerId}`),
    enabled: !!activeServerId,
  });

  const isUnclaimed = serverData && !serverData.claimed && !serverData.owner_id;

  // Auto-select the first server when loaded and none is active
  useEffect(() => {
    if (!activeServerId && servers && servers.length > 0) {
      setActiveServer(servers[0].id);
    }
  }, [activeServerId, servers, setActiveServer]);

  // Show welcome popup when server data loads
  useEffect(() => {
    if (activeServerId && serverData?.popup_config?.enabled) {
      showPopup(activeServerId);
    }
  }, [activeServerId, serverData, showPopup]);

  if (isLoading) {
    return (
      <Center style={{ flex: 1, background: 'var(--bg-primary)' }}>
        <Stack align="center" gap="md">
          <Loader color="brand" size="md" />
          <Text c="dimmed" size="sm">Loading server...</Text>
        </Stack>
      </Center>
    );
  }

  if (!activeServerId) {
    return (
      <Center style={{ flex: 1, background: 'var(--bg-primary)' }}>
        <Text c="dimmed" size="lg">No servers found. Join or create a server to get started.</Text>
      </Center>
    );
  }

  return (
    <>
      <PanelErrorBoundary label="sidebar" width={240}>
        <ChannelSidebar />
      </PanelErrorBoundary>
      <PanelErrorBoundary label="chat">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {isUnclaimed && (
            <UnclaimedServerBanner onClaim={() => setClaimModalOpen(true)} />
          )}
          <ChatPanel />
        </div>
      </PanelErrorBoundary>
      <PanelErrorBoundary label="members" width={240}>
        <MemberList />
      </PanelErrorBoundary>

      {/* Claim admin modal */}
      <ClaimAdminModal
        opened={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onSuccess={() => {
          setClaimModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['server', activeServerId] });
          queryClient.invalidateQueries({ queryKey: ['servers'] });
        }}
      />

      {/* Welcome popup */}
      {activeServerId && serverData && (
        <ServerWelcomePopup
          serverId={activeServerId}
          serverName={serverData.name}
          popupConfig={serverData.popup_config}
          username={user?.username}
        />
      )}

      {/* Stream viewer overlay */}
      <StreamViewer />
    </>
  );
}
