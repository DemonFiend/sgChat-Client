import { createPortal } from 'react-dom';
import { Paper, Group, Stack, Text, Avatar, CloseButton } from '@mantine/core';
import { IconMessage, IconAt, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastNotification } from '../../stores/toastNotifications';

const TOAST_ICONS = {
  dm: IconMessage,
  mention: IconAt,
  system: IconInfoCircle,
  warning: IconAlertTriangle,
} as const;

function ToastItem({ toast }: { toast: ToastNotification }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = TOAST_ICONS[toast.type];

  const handleClick = () => {
    toast.onClick?.();
    removeToast(toast.id);
  };

  return (
    <Paper
      shadow="lg"
      radius="md"
      p="sm"
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        background: 'var(--bg-secondary)',
        border: toast.type === 'warning'
          ? '2px solid var(--mantine-color-yellow-5)'
          : '1px solid var(--bg-tertiary)',
        transition: 'background 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {toast.avatarUrl ? (
          <Avatar src={toast.avatarUrl} alt={toast.title} size="md" radius="xl" />
        ) : (
          <Avatar size="md" radius="xl" color={toast.type === 'warning' ? 'yellow' : 'brand'}>
            <Icon size={20} />
          </Avatar>
        )}

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Text size="sm" fw={600} truncate>{toast.title}</Text>
            {toast.type === 'dm' && (
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>DM</Text>
            )}
            {toast.type === 'warning' && (
              <Text size="xs" c="yellow" fw={600} style={{ flexShrink: 0 }}>WARNING</Text>
            )}
          </Group>
          <Text size="sm" c="dimmed" truncate>{toast.message}</Text>
        </Stack>

        <CloseButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            removeToast(toast.id);
          }}
        />
      </Group>
    </Paper>
  );
}

const toastVariants = {
  initial: { opacity: 0, x: 80, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit: { opacity: 0, x: 80, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

export function NotificationToast() {
  const toasts = useToastStore((s) => s.toasts);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ pointerEvents: 'auto' }}
          >
            <ToastItem toast={toast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
