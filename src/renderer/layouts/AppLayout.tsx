import { useEffect } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { ChatPanel } from '../components/layout/ChatPanel';
import { MemberList } from '../components/layout/MemberList';
import { useUIStore } from '../stores/uiStore';
import { connectSocket, disconnectSocket } from '../api/socket';
import { ServerView } from '../pages/ServerView';
import { DMView } from '../pages/DMView';
import { FriendsView } from '../pages/FriendsView';
import { SettingsView } from '../pages/SettingsView';
import { VoiceBar } from '../components/voice/VoiceBar';

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
        <ServerSidebar />
        {view === 'servers' && <ServerView />}
        {view === 'dms' && <DMView />}
        {view === 'friends' && <FriendsView />}
        {view === 'settings' && <SettingsView />}
      </div>
      <VoiceBar />
    </div>
  );
}
