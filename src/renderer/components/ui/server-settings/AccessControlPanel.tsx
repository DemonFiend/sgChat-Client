import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ActionIcon, Alert, Avatar, Badge, Button, Group, Modal,
  NumberInput, Paper, ScrollArea, SegmentedControl, Select,
  Skeleton, Stack, Switch, Table, Tabs, Text, Textarea, TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle, IconCheck, IconPlus, IconShieldLock,
  IconTrash, IconUserCheck, IconUserX, IconBan,
} from '@tabler/icons-react';
import { api } from '../../../lib/api';
import { toastStore } from '../../../stores/toastNotifications';
import { getSocket } from '../../../api/socket';
import type {
  AccessControlSettings, IntakeQuestion, IntakeFormConfig,
  Approval, BlacklistEntry,
} from './types';

// ── Settings Section ────────────────────────────────────────────────

function SettingsSection({ serverId }: { serverId: string }) {
  const [settings, setSettings] = useState<AccessControlSettings>({
    signups_disabled: false,
    member_approvals_enabled: false,
    approvals_skip_for_invited: false,
    denial_cooldown_hours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<AccessControlSettings>('/api/server/settings/access-control');
        setSettings(data);
      } catch {
        // defaults are fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/server/settings/access-control', settings);
      toastStore.addToast({
        type: 'system',
        title: 'Access Control',
        message: 'Settings saved successfully.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Access Control',
        message: 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack gap={12}>
        <Skeleton height={60} radius="md" />
        <Skeleton height={60} radius="md" />
        <Skeleton height={60} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        Control who can register and join your server.
      </Text>

      {/* Disable Public Registration */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size="sm" fw={600}>Disable Public Registration</Text>
            <Text size="xs" c="dimmed">
              When enabled, only users with a bypass invite can register.
            </Text>
          </div>
          <Switch
            checked={settings.signups_disabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, signups_disabled: e.currentTarget.checked }))
            }
          />
        </Group>
      </Paper>

      {settings.signups_disabled && (
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={16} />} ml="md">
          Users with the <strong>Bypass Signup Restriction</strong> permission can create invite
          links that allow registration even when signups are closed.
        </Alert>
      )}

      {/* Require Member Approval */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size="sm" fw={600}>Require Member Approval</Text>
            <Text size="xs" c="dimmed">
              New registrants must be approved by an administrator before accessing the server.
            </Text>
          </div>
          <Switch
            checked={settings.member_approvals_enabled}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                member_approvals_enabled: e.currentTarget.checked,
              }))
            }
          />
        </Group>
      </Paper>

      {/* Skip Approval for Invited */}
      {settings.member_approvals_enabled && (
        <Paper p="md" radius="md" withBorder ml="md">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="sm" fw={600}>Skip Approval for Invited Users</Text>
              <Text size="xs" c="dimmed">
                Users who register with an invite code bypass the approval queue.
              </Text>
            </div>
            <Switch
              checked={settings.approvals_skip_for_invited}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  approvals_skip_for_invited: e.currentTarget.checked,
                }))
              }
            />
          </Group>
        </Paper>
      )}

      {/* Denial Re-apply Cooldown */}
      {settings.member_approvals_enabled && (
        <Paper p="md" radius="md" withBorder ml="md">
          <Text size="sm" fw={600} mb={4}>Denial Re-apply Cooldown</Text>
          <Text size="xs" c="dimmed" mb={8}>
            How long denied users must wait before they can re-apply.
          </Text>
          <Select
            value={String(settings.denial_cooldown_hours)}
            onChange={(val) =>
              setSettings((prev) => ({
                ...prev,
                denial_cooldown_hours: parseInt(val || '24'),
              }))
            }
            data={[
              { value: '0', label: 'Never (permanent denial)' },
              { value: '1', label: '1 hour' },
              { value: '6', label: '6 hours' },
              { value: '12', label: '12 hours' },
              { value: '24', label: '24 hours' },
              { value: '48', label: '48 hours' },
              { value: '168', label: '7 days' },
            ]}
            style={{ maxWidth: 250 }}
          />
        </Paper>
      )}

      <Group mt="xs">
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </Group>
    </Stack>
  );
}

// ── Intake Form Builder ─────────────────────────────────────────────

function IntakeFormBuilder({ serverId }: { serverId: string }) {
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<IntakeFormConfig>('/api/server/intake-form');
        setQuestions(data.questions || []);
      } catch {
        // defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<IntakeQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/server/intake-form', { questions });
      toastStore.addToast({
        type: 'system',
        title: 'Intake Form',
        message: 'Form saved successfully.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Intake Form',
        message: 'Failed to save intake form.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack gap={12}>
        <Skeleton height={120} radius="md" />
        <Skeleton height={120} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        Configure questions shown to new applicants. Max 10 questions.
      </Text>

      {questions.map((q, index) => (
        <Paper key={q.id} p="md" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              Question {index + 1}
            </Text>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => removeQuestion(q.id)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>

          <TextInput
            placeholder="Question label"
            value={q.label}
            onChange={(e) => updateQuestion(q.id, { label: e.currentTarget.value })}
            mb="xs"
          />

          <Group gap="sm" mb="xs">
            <Select
              value={q.type}
              onChange={(val) =>
                updateQuestion(q.id, { type: (val || 'text') as IntakeQuestion['type'] })
              }
              data={[
                { value: 'text', label: 'Short Text' },
                { value: 'textarea', label: 'Long Text' },
                { value: 'select', label: 'Dropdown' },
                { value: 'checkbox', label: 'Checkbox' },
              ]}
              style={{ maxWidth: 160 }}
            />
            <Switch
              label="Required"
              checked={q.required}
              onChange={(e) => updateQuestion(q.id, { required: e.currentTarget.checked })}
            />
            {(q.type === 'text' || q.type === 'textarea') && (
              <NumberInput
                placeholder="Max chars"
                value={q.max_length ?? ''}
                onChange={(val) =>
                  updateQuestion(q.id, { max_length: val ? Number(val) : undefined })
                }
                min={1}
                max={2000}
                style={{ maxWidth: 110 }}
              />
            )}
          </Group>

          <TextInput
            placeholder="Placeholder text (optional)"
            value={q.placeholder || ''}
            onChange={(e) => updateQuestion(q.id, { placeholder: e.currentTarget.value })}
            mb={q.type === 'select' ? 'xs' : 0}
          />

          {q.type === 'select' && (
            <>
              <Text size="xs" c="dimmed" mb={4}>Options (one per line)</Text>
              <Textarea
                value={(q.options || []).join('\n')}
                onChange={(e) =>
                  updateQuestion(q.id, {
                    options: e.currentTarget.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={'Option 1\nOption 2\nOption 3'}
                minRows={3}
                autosize
              />
            </>
          )}
        </Paper>
      ))}

      {questions.length < 10 && (
        <Button
          variant="default"
          leftSection={<IconPlus size={16} />}
          onClick={addQuestion}
          style={{
            border: '2px dashed var(--mantine-color-default-border)',
            background: 'transparent',
          }}
          fullWidth
        >
          Add Question
        </Button>
      )}

      <Group mt="xs">
        <Button onClick={handleSave} loading={saving}>
          Save Intake Form
        </Button>
      </Group>
    </Stack>
  );
}

// ── Approvals Queue ─────────────────────────────────────────────────

function ApprovalsQueue({ serverId }: { serverId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [intakeQuestions, setIntakeQuestions] = useState<Record<string, string>>({});

  // Fetch intake form config for question label mapping
  useEffect(() => {
    api
      .get<{ questions: { id: string; label: string }[] }>('/api/server/intake-form')
      .then((form) => {
        const map: Record<string, string> = {};
        for (const q of form.questions) map[q.id] = q.label;
        setIntakeQuestions(map);
      })
      .catch(() => {});
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      const data = await api.get<{ approvals: any[]; total_pending: number }>(
        `/api/server/approvals?status=${filter}`,
      );
      const raw = Array.isArray(data) ? data : data.approvals ?? [];
      // Flatten nested user object from API response
      const flattened = raw.map((a: any) => ({
        ...a,
        username: a.user?.username ?? a.username,
        avatar_url: a.user?.avatar_url ?? a.avatar_url,
        user_id: a.user?.id ?? a.user_id,
        email: a.user?.email ?? a.email,
        user_created_at: a.user?.created_at ?? a.user_created_at,
      }));
      setApprovals(flattened);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchApprovals();
  }, [fetchApprovals]);

  // Listen for new approvals via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewApproval = () => {
      if (filter === 'pending') fetchApprovals();
    };
    socket.on('approval.new', handleNewApproval);
    return () => {
      socket.off('approval.new', handleNewApproval);
    };
  }, [filter, fetchApprovals]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/api/server/approvals/${id}/approve`);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setSelectedApproval(null);
      toastStore.addToast({
        type: 'system',
        title: 'Approvals',
        message: 'Application approved.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Approvals',
        message: 'Failed to approve application.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/api/server/approvals/${id}/deny`, {
        reason: denyReason.trim() || undefined,
      });
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setDenyReason('');
      setShowDenyInput(false);
      setSelectedApproval(null);
      toastStore.addToast({
        type: 'system',
        title: 'Approvals',
        message: 'Application denied.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Approvals',
        message: 'Failed to deny application.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await api.delete(`/api/server/approvals/${id}`);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setSelectedApproval(null);
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Approvals',
        message: 'Failed to delete application.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlacklist = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/api/server/approvals/${id}/blacklist`, {
        reason: denyReason.trim() || undefined,
      });
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setDenyReason('');
      setShowDenyInput(false);
      setShowBlacklistConfirm(false);
      setSelectedApproval(null);
      toastStore.addToast({
        type: 'system',
        title: 'Approvals',
        message: 'User blacklisted.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Approvals',
        message: 'Failed to blacklist user.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const closeModal = () => {
    setSelectedApproval(null);
    setDenyReason('');
    setShowDenyInput(false);
    setShowBlacklistConfirm(false);
  };

  return (
    <Stack gap={16}>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        data={[
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'denied', label: 'Denied' },
        ]}
      />

      {loading ? (
        <Stack gap={8}>
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </Stack>
      ) : approvals.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl" fs="italic">
          No {filter} applications.
        </Text>
      ) : (
        <Stack gap={8}>
          {approvals.map((approval) => (
            <Paper
              key={approval.id}
              p="sm"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedApproval(approval);
                setShowDenyInput(false);
                setShowBlacklistConfirm(false);
                setDenyReason('');
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar
                  src={approval.avatar_url}
                  radius="xl"
                  size="md"
                >
                  {approval.username?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate="end">
                    {approval.username || 'Unknown User'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {approval.submitted_at
                      ? `Submitted ${new Date(approval.submitted_at).toLocaleDateString()}`
                      : `Registered ${new Date(approval.created_at).toLocaleDateString()}`}
                    {approval.invite_code && (
                      <Text component="span" c="blue" ml={6}>
                        invite: {approval.invite_code}
                      </Text>
                    )}
                  </Text>
                </div>
                {approval.status === 'denied' && (
                  <Badge color="red" size="sm" variant="light">Denied</Badge>
                )}
                {approval.status === 'approved' && (
                  <Badge color="green" size="sm" variant="light">Approved</Badge>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Approval Detail Modal */}
      <Modal
        opened={!!selectedApproval}
        onClose={closeModal}
        title={`Application — ${selectedApproval?.username || 'Unknown User'}`}
        size="md"
      >
        {selectedApproval && (
          <Stack gap="md">
            {/* User Info */}
            <Group gap="sm" wrap="nowrap">
              <Avatar
                src={selectedApproval.avatar_url}
                radius="xl"
                size="lg"
              >
                {selectedApproval.username?.charAt(0)?.toUpperCase() || '?'}
              </Avatar>
              <div>
                <Text size="sm" fw={600}>
                  {selectedApproval.username || 'Unknown User'}
                </Text>
                {selectedApproval.email && (
                  <Text size="xs" c="dimmed">{selectedApproval.email}</Text>
                )}
                <Text size="xs" c="dimmed">
                  Registered{' '}
                  {new Date(
                    selectedApproval.user_created_at || selectedApproval.created_at,
                  ).toLocaleDateString()}
                </Text>
                {selectedApproval.invite_code && (
                  <Text size="xs" c="blue" mt={2}>
                    Invite: {selectedApproval.invite_code}
                  </Text>
                )}
              </div>
            </Group>

            {/* Responses */}
            {selectedApproval.responses &&
              Object.keys(selectedApproval.responses).length > 0 && (
                <div>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs">
                    Application Responses
                  </Text>
                  <Paper p="sm" radius="md" withBorder>
                    <Stack gap="xs">
                      {Object.entries(selectedApproval.responses).map(([key, value]) => (
                        <div key={key}>
                          <Text size="xs" fw={600} c="dimmed">
                            {intakeQuestions[key] || key}
                          </Text>
                          <Text size="sm">{String(value)}</Text>
                        </div>
                      ))}
                    </Stack>
                  </Paper>
                </div>
              )}

            {/* No responses */}
            {(!selectedApproval.responses ||
              Object.keys(selectedApproval.responses).length === 0) && (
              <Text size="sm" c="dimmed" fs="italic">
                No application responses submitted.
              </Text>
            )}

            {/* Denial reason for already-denied items */}
            {selectedApproval.status === 'denied' && selectedApproval.denial_reason && (
              <Alert variant="light" color="red" icon={<IconUserX size={16} />}>
                <Text size="xs" fw={700} tt="uppercase" mb={2}>Denial Reason</Text>
                <Text size="sm">{selectedApproval.denial_reason}</Text>
              </Alert>
            )}

            {/* Deny reason input */}
            {showDenyInput && (
              <TextInput
                placeholder="Denial reason (optional)"
                value={denyReason}
                onChange={(e) => setDenyReason(e.currentTarget.value)}
                maxLength={500}
                autoFocus
              />
            )}

            {/* Blacklist confirmation */}
            {showBlacklistConfirm && (
              <Alert variant="light" color="red" icon={<IconBan size={16} />}>
                <Text size="sm" fw={600} mb={4}>Blacklist this user?</Text>
                <Text size="xs" c="dimmed" mb="xs">
                  This will deny their application and prevent their email from registering again.
                </Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => setShowBlacklistConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => handleBlacklist(selectedApproval.id)}
                    loading={actionLoading === selectedApproval.id}
                  >
                    Confirm Blacklist
                  </Button>
                </Group>
              </Alert>
            )}

            {/* Action Buttons */}
            <Group justify="flex-end" gap="xs" mt="xs">
              {filter === 'pending' && !showDenyInput && !showBlacklistConfirm && (
                <>
                  <Button
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => setShowBlacklistConfirm(true)}
                    disabled={actionLoading === selectedApproval.id}
                    style={{ marginRight: 'auto' }}
                    title="Deny and prevent this email from registering again"
                  >
                    Blacklist
                  </Button>
                  <Button
                    color="green"
                    size="sm"
                    leftSection={<IconUserCheck size={16} />}
                    onClick={() => handleApprove(selectedApproval.id)}
                    loading={actionLoading === selectedApproval.id}
                  >
                    Approve
                  </Button>
                  <Button
                    color="red"
                    size="sm"
                    leftSection={<IconUserX size={16} />}
                    onClick={() => setShowDenyInput(true)}
                    disabled={actionLoading === selectedApproval.id}
                  >
                    Deny
                  </Button>
                </>
              )}
              {filter === 'pending' && showDenyInput && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowDenyInput(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    size="sm"
                    onClick={() => handleDeny(selectedApproval.id)}
                    loading={actionLoading === selectedApproval.id}
                  >
                    Confirm Deny
                  </Button>
                </>
              )}
              {filter === 'denied' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDelete(selectedApproval.id)}
                  loading={actionLoading === selectedApproval.id}
                >
                  Delete
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

// ── Blacklist Panel ─────────────────────────────────────────────────

function BlacklistPanel({ serverId }: { serverId: string }) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState<string>('email');
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      const data = await api.get<{ entries: BlacklistEntry[] }>('/api/server/blacklist');
      setEntries(data.entries ?? []);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api.post('/api/server/blacklist', {
        type: newType,
        value: newValue.trim(),
        reason: newReason.trim() || undefined,
      });
      setNewValue('');
      setNewReason('');
      fetchEntries();
      toastStore.addToast({
        type: 'system',
        title: 'Blacklist',
        message: 'Entry added to blacklist.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add entry';
      setError(msg);
      toastStore.addToast({
        type: 'warning',
        title: 'Blacklist',
        message: msg,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/api/server/blacklist/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toastStore.addToast({
        type: 'system',
        title: 'Blacklist',
        message: 'Entry removed from blacklist.',
      });
    } catch {
      toastStore.addToast({
        type: 'warning',
        title: 'Blacklist',
        message: 'Failed to remove entry.',
      });
    }
  };

  if (loading) {
    return (
      <Stack gap={12}>
        <Skeleton height={140} radius="md" />
        <Skeleton height={50} radius="md" />
        <Skeleton height={50} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Text size="sm" c="dimmed">
        Blacklisted emails and IPs are blocked from registering new accounts.
      </Text>

      {/* Add Form */}
      <Paper p="md" radius="md" withBorder>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">
          Add to Blacklist
        </Text>
        <Group gap="xs" mb="xs">
          <Select
            value={newType}
            onChange={(val) => setNewType(val || 'email')}
            data={[
              { value: 'email', label: 'Email' },
              { value: 'ip', label: 'IP Address' },
            ]}
            style={{ maxWidth: 140 }}
          />
          <TextInput
            placeholder={newType === 'email' ? 'user@example.com' : '192.168.1.1'}
            value={newValue}
            onChange={(e) => setNewValue(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
        </Group>
        <TextInput
          placeholder="Reason (optional)"
          value={newReason}
          onChange={(e) => setNewReason(e.currentTarget.value)}
          maxLength={500}
          mb="xs"
        />
        {error && (
          <Text size="xs" c="red" mb="xs">{error}</Text>
        )}
        <Button
          color="red"
          size="sm"
          onClick={handleAdd}
          loading={adding}
          disabled={!newValue.trim()}
        >
          Add to Blacklist
        </Button>
      </Paper>

      {/* Entries List */}
      {entries.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl" fs="italic">
          No blacklisted entries.
        </Text>
      ) : (
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Paper p="sm" radius="md" withBorder mb={8}>
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Group gap="xs" mb={2}>
                      <Badge size="xs" variant="light">
                        {entry.type.toUpperCase()}
                      </Badge>
                      <Text size="sm" fw={600} truncate="end">
                        {entry.value}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {entry.reason && <>{entry.reason} &middot; </>}
                      Added {new Date(entry.created_at).toLocaleDateString()}
                      {entry.created_by_username && (
                        <> by {entry.created_by_username}</>
                      )}
                    </Text>
                  </div>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => handleRemove(entry.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </Stack>
  );
}

// ── Main AccessControlPanel ─────────────────────────────────────────

export function AccessControlPanel({ serverId }: { serverId: string }) {
  return (
    <Stack gap={16}>
      <Text size="lg" fw={700}>Access Control</Text>

      <Tabs defaultValue="settings">
        <Tabs.List>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
          <Tabs.Tab value="intake-form">Intake Form</Tabs.Tab>
          <Tabs.Tab value="approvals">Approvals</Tabs.Tab>
          <Tabs.Tab value="blacklist">Blacklist</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="settings" pt="md">
          <SettingsSection serverId={serverId} />
        </Tabs.Panel>

        <Tabs.Panel value="intake-form" pt="md">
          <IntakeFormBuilder serverId={serverId} />
        </Tabs.Panel>

        <Tabs.Panel value="approvals" pt="md">
          <ApprovalsQueue serverId={serverId} />
        </Tabs.Panel>

        <Tabs.Panel value="blacklist" pt="md">
          <BlacklistPanel serverId={serverId} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
