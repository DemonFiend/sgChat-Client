import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';

const electronAPI = (window as any).electronAPI;

export function TitleBar() {
  return (
    <div
      className="drag-region"
      style={{
        height: 32,
        background: '#111214',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 0,
        flexShrink: 0,
      }}
    >
      <Text size="xs" fw={600} c="dimmed" className="drag-region">
        sgChat
      </Text>
      <Group gap={0} className="no-drag">
        <Tooltip label="Minimize" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={32}
            radius={0}
            onClick={() => electronAPI.minimize()}
            style={{ borderRadius: 0 }}
          >
            <IconMinus size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Maximize" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={32}
            radius={0}
            onClick={() => electronAPI.maximize()}
            style={{ borderRadius: 0 }}
          >
            <IconSquare size={12} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Close" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="red"
            size={32}
            radius={0}
            onClick={() => electronAPI.close()}
            style={{ borderRadius: 0 }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </div>
  );
}
