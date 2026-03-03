import { Text } from '@mantine/core';
import { useTypingStore } from '../../stores/typingStore';

interface TypingIndicatorProps {
  channelId: string;
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typing = useTypingStore((s) => s.getTyping(channelId));

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
