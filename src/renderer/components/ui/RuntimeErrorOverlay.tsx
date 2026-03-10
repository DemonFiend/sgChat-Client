import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Paper, Text, Group, Stack, CloseButton, Button } from '@mantine/core';
import { IconX, IconCopy, IconCheck, IconChevronRight } from '@tabler/icons-react';
import { useDevModeStore } from '../../stores/devModeStore';

interface CaughtError {
  id: number;
  message: string;
  stack: string | null;
  timestamp: number;
}

let nextId = 0;
const MAX_ERRORS = 5;

const electronAPI = (window as any).electronAPI;

export function RuntimeErrorOverlay() {
  const devMode = useDevModeStore((s) => s.enabled);
  const [errors, setErrors] = useState<CaughtError[]>([]);

  const addError = useCallback((message: string, stack: string | null) => {
    setErrors((prev) => {
      const next = [
        ...prev,
        { id: nextId++, message, stack, timestamp: Date.now() },
      ];
      if (next.length > MAX_ERRORS) return next.slice(-MAX_ERRORS);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setErrors([]);
  }, []);

  useEffect(() => {
    if (!devMode) return;

    const handleError = (event: ErrorEvent) => {
      const message = event.message || 'Unknown error';
      const stack = event.error?.stack || null;
      addError(message, stack);

      // Submit crash report
      if (electronAPI?.crashReport?.submit) {
        electronAPI.crashReport.submit({
          error_type: 'UncaughtException',
          error_message: message,
          stack_trace: stack || '(no stack)',
          metadata: { source: 'renderer' },
        }).catch(() => {});
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason) || 'Unhandled promise rejection';
      const stack = reason?.stack || null;
      addError(message, stack);

      // Submit crash report
      if (electronAPI?.crashReport?.submit) {
        electronAPI.crashReport.submit({
          error_type: 'UnhandledRejection',
          error_message: message,
          stack_trace: stack || '(no stack)',
          metadata: { source: 'renderer' },
        }).catch(() => {});
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [devMode, addError]);

  if (!devMode || errors.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 480,
        pointerEvents: 'none',
      }}
    >
      {errors.length > 1 && (
        <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="xs"
            variant="subtle"
            color="dimmed"
            onClick={dismissAll}
          >
            Dismiss all ({errors.length})
          </Button>
        </div>
      )}
      {errors.map((err) => (
        <div key={err.id} style={{ pointerEvents: 'auto' }}>
          <ErrorToast error={err} onDismiss={() => dismiss(err.id)} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

function ErrorToast({ error, onDismiss }: { error: CaughtError; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = error.stack
      ? `${error.message}\n\n${error.stack}`
      : error.message;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      window.prompt('Copy error:', text);
    });
  };

  return (
    <Paper
      shadow="lg"
      radius="md"
      p="sm"
      style={{
        background: 'var(--bg-secondary)',
        border: '2px solid var(--mantine-color-red-7)',
        animation: 'slideInRight 200ms ease-out',
      }}
    >
      <Stack gap="xs">
        {/* Header */}
        <Group gap="xs" justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs">
              <Text size="xs" fw={700} c="red" tt="uppercase">Runtime Error</Text>
              <Text size="xs" c="dimmed">
                {new Date(error.timestamp).toLocaleTimeString()}
              </Text>
            </Group>
            <Text size="sm" style={{ wordBreak: 'break-word' }}>
              {error.message}
            </Text>
          </Stack>
          <CloseButton size="sm" onClick={onDismiss} />
        </Group>

        {/* Actions */}
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color={copied ? 'green' : 'gray'}
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {error.stack && (
            <Button
              size="xs"
              variant="subtle"
              color="dimmed"
              leftSection={
                <IconChevronRight
                  size={14}
                  style={{
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 150ms',
                  }}
                />
              }
              onClick={() => setExpanded(!expanded)}
            >
              Stack
            </Button>
          )}
        </Group>

        {/* Expandable stack trace */}
        {expanded && error.stack && (
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 200,
              overflow: 'auto',
              padding: 8,
              background: 'var(--bg-tertiary)',
              borderRadius: 4,
            }}
          >
            {error.stack}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
