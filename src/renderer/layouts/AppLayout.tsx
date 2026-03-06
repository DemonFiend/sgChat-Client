import { useEffect } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';
import { connectSocket, disconnectSocket } from '../api/socket';
import { soundService } from '../lib/soundService';
import { ServerView } from '../pages/ServerView';
import { DMView } from '../pages/DMView';
import { FriendsView } from '../pages/FriendsView';
import { SettingsView } from '../pages/SettingsView';
import { CommandPalette } from '../components/ui/CommandPalette';

export function AppLayout() {
  const view = useUIStore((s) => s.view);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    connectSocket();
    soundService.preload();
    return () => disconnectSocket();
  }, []);

  // Seed presenceStore with the current user's own status from authStore
  useEffect(() => {
    if (user) {
      usePresenceStore.getState().updatePresence(user.id, user.status || 'online');
      if (user.custom_status) {
        usePresenceStore.getState().updateStatusComment(user.id, user.custom_status);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.status, user?.custom_status]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'servers' && <ServerView />}
        {view === 'dms' && <DMView />}
        {view === 'friends' && <FriendsView />}
        {view === 'settings' && <SettingsView />}
      </div>
      <CommandPalette />
    </div>
  );
}
