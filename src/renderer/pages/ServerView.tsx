import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { ChatPanel } from '../components/layout/ChatPanel';
import { MemberList } from '../components/layout/MemberList';
import { useUIStore } from '../stores/uiStore';

export function ServerView() {
  const activeServerId = useUIStore((s) => s.activeServerId);

  if (!activeServerId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Select a server from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChannelSidebar />
      <ChatPanel />
      <MemberList />
    </>
  );
}
