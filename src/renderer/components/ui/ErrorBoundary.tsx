import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Center, Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
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
  }

  private copyErrorDetails = () => {
    const { error, componentStack } = this.state;
    const details = [
      `Error: ${error?.message || 'Unknown'}`,
      `\nComponent Stack:${componentStack || ' (unavailable)'}`,
      `\nStack Trace:\n${error?.stack || '(unavailable)'}`,
    ].join('\n');
    navigator.clipboard.writeText(details).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <Stack align="center" gap="md" maw={500} px="md" ta="center">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700}>Something went wrong</Text>
            <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>
            {this.state.componentStack && (
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
                }}
              >
                {this.state.componentStack.trim()}
              </Text>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => window.location.reload()} variant="filled" color="brand">
                Reload Page
              </Button>
              <Button onClick={this.copyErrorDetails} variant="light" color="gray">
                Copy Error Details
              </Button>
            </div>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
