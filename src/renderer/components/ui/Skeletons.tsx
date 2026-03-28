import { Skeleton, Group, Stack } from '@mantine/core';

/** Single-line text skeleton with configurable width. */
export function SkeletonText({ width = '60%', height = 14 }: { width?: string | number; height?: number }) {
  return <Skeleton height={height} width={width} radius="sm" />;
}

/** Circular avatar skeleton. */
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton height={size} width={size} circle />;
}

/** Full message row skeleton (avatar + two text lines), matching MessageItem layout. */
export function SkeletonMessage({ compact = false }: { compact?: boolean }) {
  const avatarSize = compact ? 24 : 40;

  return (
    <Group gap="sm" wrap="nowrap" align="flex-start" p="xs">
      <SkeletonAvatar size={avatarSize} />
      <Stack gap={6} style={{ flex: 1 }}>
        <Group gap="xs">
          <Skeleton height={14} width={100} radius="sm" />
          <Skeleton height={10} width={50} radius="sm" />
        </Group>
        <Skeleton height={12} width="80%" radius="sm" />
        {!compact && <Skeleton height={12} width="55%" radius="sm" />}
      </Stack>
    </Group>
  );
}

/** Multiple message skeletons for loading states. */
export function SkeletonMessageList({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <Stack gap={4}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonMessage key={i} compact={compact} />
      ))}
    </Stack>
  );
}
