import { useEffect } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceConnectedBar } from '../ui/VoiceConnectedBar';

interface VoiceBarProps {
  compact?: boolean;
}

export function VoiceBar({ compact }: VoiceBarProps) {
  const connected = useVoiceStore((s) => s.connected);
  const connectionState = useVoiceStore((s) => s.connectionState);
  const initListeners = useVoiceStore((s) => s.initListeners);

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  if (!connected && connectionState !== 'connecting' && connectionState !== 'reconnecting') {
    return null;
  }

  return <VoiceConnectedBar compact={compact} />;
}
