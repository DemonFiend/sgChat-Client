import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Center, Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <Stack align="center" gap="md" maw={400} px="md" ta="center">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700}>Something went wrong</Text>
            <Text size="sm" c="dimmed">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </Text>
            <Button
              onClick={() => window.location.reload()}
              variant="filled"
              color="brand"
            >
              Reload Page
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
