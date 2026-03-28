import { Skeleton, Stack, Group } from '@mantine/core';

/**
 * Full-page layout skeleton that mimics AppLayout structure:
 * - 32px titlebar
 * - 72px server sidebar (circular skeletons)
 * - 240px channel sidebar (text skeletons)
 * - Main content area (message skeletons)
 *
 * Uses Mantine Skeleton's default pulse animation.
 */
export function LayoutSkeleton() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #1e1f22)' }}>
      {/* Titlebar skeleton */}
      <div className="drag-region" style={{
        height: 32,
        background: 'var(--bg-tertiary, #111214)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
      }}>
        <Skeleton height={12} width={100} radius="sm" />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Server sidebar (72px) */}
        <div style={{
          width: 72,
          background: 'var(--bg-tertiary, #111214)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          gap: 8,
          flexShrink: 0,
        }}>
          {/* Home icon */}
          <Skeleton height={48} width={48} circle />
          <div style={{ width: 32, height: 1, background: 'var(--border, #2b2d31)', margin: '4px 0' }} />
          {/* Server icons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={48} width={48} circle />
          ))}
        </div>

        {/* Channel sidebar (240px) */}
        <div style={{
          width: 240,
          background: 'var(--bg-secondary, #2b2d31)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid var(--border, #1e1f22)',
        }}>
          {/* Server header */}
          <div style={{ height: 48, padding: '12px 16px', borderBottom: '1px solid var(--border, #1e1f22)' }}>
            <Skeleton height={16} width={140} radius="sm" />
          </div>

          {/* Channel list */}
          <div style={{ flex: 1, padding: '12px 8px' }}>
            <Stack gap={6}>
              {/* Category header */}
              <Skeleton height={10} width={80} radius="sm" mt={8} ml={8} />
              {/* Channel entries */}
              {Array.from({ length: 4 }).map((_, i) => (
                <Group key={`c1-${i}`} gap={8} px={8} py={4}>
                  <Skeleton height={8} width={8} circle />
                  <Skeleton height={12} width={90 + Math.random() * 40} radius="sm" />
                </Group>
              ))}
              {/* Second category */}
              <Skeleton height={10} width={60} radius="sm" mt={12} ml={8} />
              {Array.from({ length: 3 }).map((_, i) => (
                <Group key={`c2-${i}`} gap={8} px={8} py={4}>
                  <Skeleton height={8} width={8} circle />
                  <Skeleton height={12} width={70 + Math.random() * 50} radius="sm" />
                </Group>
              ))}
            </Stack>
          </div>

          {/* User area at bottom */}
          <div style={{ height: 52, padding: '8px 12px', borderTop: '1px solid var(--border, #1e1f22)' }}>
            <Group gap={8}>
              <Skeleton height={32} width={32} circle />
              <Stack gap={4} style={{ flex: 1 }}>
                <Skeleton height={10} width={80} radius="sm" />
                <Skeleton height={8} width={50} radius="sm" />
              </Stack>
            </Group>
          </div>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #313338)' }}>
          {/* Channel header */}
          <div style={{ height: 48, padding: '12px 16px', borderBottom: '1px solid var(--border, #1e1f22)' }}>
            <Group gap={8}>
              <Skeleton height={8} width={8} circle />
              <Skeleton height={14} width={120} radius="sm" />
            </Group>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px 16px' }}>
            <Stack gap={16}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Group key={i} gap={12} align="flex-start">
                  <Skeleton height={36} width={36} circle mt={2} />
                  <Stack gap={6} style={{ flex: 1 }}>
                    <Group gap={8}>
                      <Skeleton height={12} width={80 + (i % 3) * 20} radius="sm" />
                      <Skeleton height={8} width={50} radius="sm" />
                    </Group>
                    <Skeleton height={10} width={`${40 + (i % 4) * 15}%`} radius="sm" />
                    {i % 3 === 0 && (
                      <Skeleton height={10} width={`${30 + (i % 5) * 10}%`} radius="sm" />
                    )}
                  </Stack>
                </Group>
              ))}
            </Stack>
          </div>

          {/* Message input area */}
          <div style={{ padding: '0 16px 16px' }}>
            <Skeleton height={44} radius="md" />
          </div>
        </div>
      </div>
    </div>
  );
}
