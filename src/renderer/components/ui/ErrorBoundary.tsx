import { Component, type ReactNode, type ErrorInfo, useState } from 'react';
import { Center, Stack, Text, Button, ThemeIcon, Group } from '@mantine/core';
import { IconAlertTriangle, IconChevronRight, IconCopy, IconCheck } from '@tabler/icons-react';
import { useDevModeStore } from '../../stores/devModeStore';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const electronAPI = (window as any).electronAPI;
    const doCopy = electronAPI?.clipboard?.writeText
      ? electronAPI.clipboard.writeText(text)
      : navigator.clipboard.writeText(text);

    doCopy.then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      window.prompt('Copy error details:', text);
    });
  };

  return (
    <Button
      onClick={handleCopy}
      variant="light"
      color={copied ? 'green' : 'gray'}
      leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
    >
      {copied ? 'Copied!' : 'Copy Error Details'}
    </Button>
  );
}

function DevModeDetails({ error, componentStack }: { error: Error; componentStack: string | null }) {
  const devMode = useDevModeStore((s) => s.enabled);
  const [expanded, setExpanded] = useState(false);

  if (!devMode) return null;

  const details = [
    `Error: ${error.message || 'Unknown'}`,
    `\nComponent Stack:${componentStack || ' (unavailable)'}`,
    `\nStack Trace:\n${error.stack || '(unavailable)'}`,
  ].join('\n');

  return (
    <>
      <Button
        variant="subtle"
        color="dimmed"
        size="xs"
        onClick={() => setExpanded(!expanded)}
        leftSection={
          <IconChevronRight
            size={14}
            style={{
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        }
      >
        Stack Trace
      </Button>

      {expanded && (
        <Text
          size="xs"
          c="dimmed"
          style={{
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
            maxHeight: 200,
            overflow: 'auto',
            padding: 8,
            background: 'var(--bg-tertiary)',
            borderRadius: 4,
            width: '100%',
            wordBreak: 'break-word',
          }}
        >
          {error.stack || error.message}
          {componentStack && `\n\nComponent Stack:${componentStack}`}
        </Text>
      )}

      <CopyButton text={details} />
    </>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info.componentStack || '';
    this.setState({ componentStack: stack });
    console.error(
      '[ErrorBoundary] Caught error:', error.message,
      '\n\nComponent Stack:', stack,
      '\n\nFull Error:', error,
    );

    // Submit crash report to server
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.crashReport?.submit) {
      electronAPI.crashReport.submit({
        error_type: 'ReactErrorBoundary',
        error_message: error.message || 'Unknown React error',
        stack_trace: `${error.stack || ''}\n\nComponent Stack:${stack}`,
        metadata: { source: 'renderer' },
      }).catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, componentStack } = this.state;
      return (
        <Center h="100vh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <Stack align="center" gap="md" maw={500} px="md" ta="center">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700}>Something went wrong</Text>
            <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
              {error?.message || 'An unexpected error occurred.'}
            </Text>
            <Group gap="sm">
              <Button onClick={() => window.location.reload()} variant="filled" color="brand">
                Reload Page
              </Button>
            </Group>
            {error && <DevModeDetails error={error} componentStack={componentStack} />}
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
