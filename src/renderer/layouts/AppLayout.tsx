import { useEffect } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { useUIStore } from '../stores/uiStore';
import { connectSocket, disconnectSocket } from '../api/socket';
import { ServerView } from '../pages/ServerView';
import { DMView } from '../pages/DMView';
import { FriendsView } from '../pages/FriendsView';
import { SettingsView } from '../pages/SettingsView';
import { CommandPalette } from '../components/ui/CommandPalette';

export function AppLayout() {
  const view = useUIStore((s) => s.view);

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

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
