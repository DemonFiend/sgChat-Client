import { Modal, Button, Stack, Text, List, Group, ThemeIcon } from '@mantine/core';
import { IconRocket, IconCheck } from '@tabler/icons-react';

export interface UpgradeModalProps {
  opened: boolean;
  onClose: () => void;
  serverName?: string;
  features?: string[];
}

const DEFAULT_FEATURES = [
  'Increased file storage (up to 50 GB)',
  'Higher upload size limits',
  'Custom emoji packs',
  'Priority support',
  'Extended message history',
  'More concurrent voice participants',
];

export function UpgradeModal({ opened, onClose, serverName, features }: UpgradeModalProps) {
  const featureList = features && features.length > 0 ? features : DEFAULT_FEATURES;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconRocket size={20} />
          <Text fw={600}>Upgrade{serverName ? ` ${serverName}` : ''}</Text>
        </Group>
      }
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Unlock premium features for your server and community.
        </Text>

        <List
          spacing="xs"
          size="sm"
          icon={
            <ThemeIcon color="teal" size={20} radius="xl">
              <IconCheck size={12} />
            </ThemeIcon>
          }
        >
          {featureList.map((feature, i) => (
            <List.Item key={i}>{feature}</List.Item>
          ))}
        </List>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Maybe later
          </Button>
          <Button
            variant="gradient"
            gradient={{ from: 'indigo', to: 'cyan' }}
            onClick={() => {
              // Placeholder: actual upgrade flow depends on server implementation
              onClose();
            }}
          >
            Upgrade
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
