import { useEffect, useState, useCallback } from 'react';
import { Center, Paper, Stack, Title, Text, Button, ThemeIcon, Loader, TextInput, Textarea, Select, Checkbox, Alert, Divider } from '@mantine/core';
import { IconClock, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { getSocket } from '../api/socket';

interface IntakeQuestion {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  label: string;
  description?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface ApprovalStatus {
  status: 'pending' | 'submitted' | 'approved' | 'denied';
  submitted_at?: string;
  denial_reason?: string;
}

type PageState = 'loading' | 'intake_form' | 'submitted' | 'denied' | 'approved' | 'error';

interface PendingApprovalPageProps {
  onBack: () => void;
}

export function PendingApprovalPage({ onBack }: PendingApprovalPageProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setIsPendingApproval = useAuthStore((s) => s.setIsPendingApproval);

  // Fetch approval status and intake form on mount
  useEffect(() => {
    let cancelled = false;

    async function loadApprovalState() {
      try {
        // Fetch approval status
        const status = await api.get<ApprovalStatus>('/api/server/approval-status');

        if (cancelled) return;

        if (status.status === 'approved') {
          setPageState('approved');
          return;
        }

        if (status.status === 'denied') {
          setDenialReason(status.denial_reason || null);
          setPageState('denied');
          return;
        }

        if (status.status === 'submitted') {
          setPageState('submitted');
          return;
        }

        // Status is 'pending' — try to fetch intake form
        try {
          const form = await api.get<{ questions: IntakeQuestion[] }>('/api/server/intake-form');
          if (!cancelled) {
            if (form.questions && form.questions.length > 0) {
              setQuestions(form.questions);
              // Initialize responses
              const initial: Record<string, string | boolean> = {};
              for (const q of form.questions) {
                initial[q.id] = q.type === 'checkbox' ? false : '';
              }
              setResponses(initial);
              setPageState('intake_form');
            } else {
              // No questions — just show waiting state
              setPageState('submitted');
            }
          }
        } catch {
          // No intake form endpoint — show waiting state
          if (!cancelled) setPageState('submitted');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load approval status.');
          setPageState('error');
        }
      }
    }

    loadApprovalState();
    return () => { cancelled = true; };
  }, []);

  // Socket listener for approval resolution
  const handleApprovalResolved = useCallback((data: { approved: boolean; reason?: string }) => {
    if (data.approved) {
      setPageState('approved');
      setIsPendingApproval(false);
    } else {
      setDenialReason(data.reason || null);
      setPageState('denied');
    }
  }, [setIsPendingApproval]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('approval.resolved', handleApprovalResolved);
    return () => {
      socket.off('approval.resolved', handleApprovalResolved);
    };
  }, [handleApprovalResolved]);

  const handleResponseChange = (questionId: string, value: string | boolean) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    // Validate required fields
    for (const q of questions) {
      if (q.required) {
        const val = responses[q.id];
        if (val === '' || val === undefined || val === null) {
          setSubmitError(`Please complete the required field: ${q.label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await api.post('/api/server/approvals/submit', { responses });
      setPageState('submitted');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit application.');
    }
    setSubmitting(false);
  };

  // --- Loading state ---
  if (pageState === 'loading') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <DragRegion />
        <Paper w={460} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <Loader size="lg" />
            <Text c="dimmed" size="sm">Loading approval status...</Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // --- Error state ---
  if (pageState === 'error') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <DragRegion />
        <Paper w={460} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertCircle size={36} />
            </ThemeIcon>
            <Title order={2} ta="center">Something Went Wrong</Title>
            <Text c="dimmed" ta="center" size="sm">{errorMessage || 'Could not determine approval status.'}</Text>
            <Button variant="subtle" onClick={onBack} fullWidth mt="md">
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // --- Approved state ---
  if (pageState === 'approved') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <DragRegion />
        <Paper w={460} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" variant="light" color="green">
              <IconCheck size={36} />
            </ThemeIcon>
            <Title order={2} ta="center">Approved!</Title>
            <Text c="dimmed" ta="center" size="sm">
              Your account has been approved. You can now access the server.
            </Text>
            <Button onClick={() => { setIsPendingApproval(false); }} fullWidth mt="md">
              Continue
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // --- Denied state ---
  if (pageState === 'denied') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <DragRegion />
        <Paper w={460} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconX size={36} />
            </ThemeIcon>
            <Title order={2} ta="center">Application Denied</Title>
            {denialReason && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" w="100%">
                <Text size="sm" fw={500}>Reason:</Text>
                <Text size="sm">{denialReason}</Text>
              </Alert>
            )}
            <Text c="dimmed" ta="center" size="sm">
              Your application has been denied by the server administrator.
              Contact the server owner for more information.
            </Text>
            <Button variant="subtle" onClick={onBack} fullWidth mt="md">
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // --- Submitted / waiting state ---
  if (pageState === 'submitted') {
    return (
      <Center h="100vh" style={{ background: 'var(--bg-tertiary)' }}>
        <DragRegion />
        <Paper w={460} p="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" variant="light" color="yellow">
              <IconClock size={36} />
            </ThemeIcon>
            <Title order={2} ta="center">Pending Approval</Title>
            <Text c="dimmed" ta="center" size="sm" maw={360}>
              Your application has been submitted and is awaiting administrator review.
              You will be notified when a decision is made.
            </Text>
            <Text c="dimmed" ta="center" size="xs">
              This page will update automatically when your application is reviewed.
            </Text>
            <Button variant="subtle" onClick={onBack} fullWidth mt="md">
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  // --- Intake form state ---
  return (
    <Center h="100vh" style={{ background: 'var(--bg-tertiary)', overflow: 'auto' }}>
      <DragRegion />
      <Paper w={500} p="xl" radius="lg" withBorder my="xl">
        <Stack gap="lg">
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} radius="xl" variant="light" color="yellow">
              <IconClock size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Application Required</Title>
            <Text c="dimmed" ta="center" size="sm" maw={400}>
              This server requires you to complete an application form before you can join.
              Please answer the following questions.
            </Text>
          </Stack>

          <Divider />

          {submitError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {submitError}
            </Alert>
          )}

          {questions.map((question) => (
            <div key={question.id}>
              {question.type === 'text' && (
                <TextInput
                  label={question.label}
                  description={question.description}
                  required={question.required}
                  value={(responses[question.id] as string) || ''}
                  onChange={(e) => handleResponseChange(question.id, e.currentTarget.value)}
                />
              )}
              {question.type === 'textarea' && (
                <Textarea
                  label={question.label}
                  description={question.description}
                  required={question.required}
                  value={(responses[question.id] as string) || ''}
                  onChange={(e) => handleResponseChange(question.id, e.currentTarget.value)}
                  autosize
                  minRows={2}
                  maxRows={6}
                />
              )}
              {question.type === 'select' && (
                <Select
                  label={question.label}
                  description={question.description}
                  required={question.required}
                  value={(responses[question.id] as string) || null}
                  onChange={(v) => handleResponseChange(question.id, v || '')}
                  data={question.options || []}
                />
              )}
              {question.type === 'checkbox' && (
                <Checkbox
                  label={question.label}
                  description={question.description}
                  checked={!!responses[question.id]}
                  onChange={(e) => handleResponseChange(question.id, e.currentTarget.checked)}
                />
              )}
            </div>
          ))}

          <Button onClick={handleSubmit} loading={submitting} fullWidth mt="sm">
            Submit Application
          </Button>

          <Button variant="subtle" onClick={onBack} fullWidth>
            Back to Login
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}

/** Drag region for frameless window title bar. */
function DragRegion() {
  return (
    <div
      className="drag-region"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, WebkitAppRegion: 'drag' } as React.CSSProperties}
    />
  );
}
