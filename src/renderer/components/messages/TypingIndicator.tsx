import { Text } from '@mantine/core';
import { useTypingStore } from '../../stores/typingStore';

const TYPING_TIMEOUT = 8000;

interface TypingIndicatorProps {
  channelId: string;
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  // Select the raw array from state — stable reference (same object until that channel's typing changes).
  // Do NOT call s.getTyping() here: .filter() creates a new array every call,
  // which breaks useSyncExternalStore's Object.is check → infinite re-render loop (React error #185).
  const typingEntries = useTypingStore((s) => s.typing[channelId]);
  const typing = typingEntries
    ? typingEntries.filter((t) => Date.now() - t.timestamp < TYPING_TIMEOUT)
    : [];

  if (typing.length === 0) return <div style={{ height: 20, flexShrink: 0 }} />;

  let text: string;
  if (typing.length === 1) {
    text = `${typing[0].username} is typing...`;
  } else if (typing.length === 2) {
    text = `${typing[0].username} and ${typing[1].username} are typing...`;
  } else {
    text = 'Several people are typing...';
  }

  return (
    <div style={{ height: 20, padding: '0 16px', flexShrink: 0 }}>
      <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
        {text}
      </Text>
    </div>
  );
}
