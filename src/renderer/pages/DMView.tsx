import { useState } from 'react';
import { Text } from '@mantine/core';
import { useUIStore } from '../stores/uiStore';
import { DMSidebar } from '../components/layout/DMSidebar';
import { DMChatPanel } from '../components/layout/DMChatPanel';
import { DMModal } from '../components/ui/DMModal';

export function DMView() {
  const activeDMId = useUIStore((s) => s.activeDMId);
  const [dmModalOpen, setDmModalOpen] = useState(false);

  return (
    <>
      <DMSidebar onCreateDM={() => setDmModalOpen(true)} />

      {activeDMId ? (
        <DMChatPanel conversationId={activeDMId} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}>
          <Text c="dimmed">Select a conversation to start chatting</Text>
        </div>
      )}

      <DMModal opened={dmModalOpen} onClose={() => setDmModalOpen(false)} />
    </>
  );
}
