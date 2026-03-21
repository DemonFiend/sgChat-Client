import { Image, Paper, Skeleton, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface UnfurlData {
  url: string;
  site_name?: string;
  title?: string;
  description?: string;
  image?: string;
}

interface UrlEmbedProps {
  url: string;
}

export function UrlEmbed({ url }: UrlEmbedProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['url-unfurl', url],
    queryFn: () => api.get<UnfurlData>(`/api/unfurl?url=${encodeURIComponent(url)}`),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  if (isError) return null;

  if (isLoading) {
    return (
      <Paper
        radius="md"
        style={{
          marginTop: 6,
          maxWidth: 420,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          borderLeft: '3px solid var(--accent)',
          padding: '10px 12px',
          overflow: 'hidden',
        }}
      >
        <Stack gap={6}>
          <Skeleton height={10} width="40%" radius="xs" />
          <Skeleton height={14} width="80%" radius="xs" />
          <Skeleton height={10} width="60%" radius="xs" />
        </Stack>
      </Paper>
    );
  }

  if (!data || (!data.title && !data.description)) return null;

  return (
    <Paper
      radius="md"
      style={{
        marginTop: 6,
        maxWidth: 420,
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        borderLeft: '3px solid var(--accent)',
        overflow: 'hidden',
      }}
    >
      {data.image && (
        <Image
          src={data.image}
          alt=""
          mah={180}
          fit="cover"
          style={{ borderBottom: '1px solid var(--border)' }}
          fallbackSrc=""
        />
      )}
      <div style={{ padding: '10px 12px' }}>
        {data.site_name && (
          <Text size="xs" c="dimmed" mb={2} tt="uppercase" fw={600} style={{ letterSpacing: '0.3px' }}>
            {data.site_name}
          </Text>
        )}
        {data.title && (
          <Text
            size="sm"
            fw={600}
            lineClamp={2}
            component="a"
            href={data.url || url}
            target="_blank"
            rel="noopener"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'block',
              marginBottom: 4,
            }}
          >
            {data.title}
            <IconExternalLink size={12} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle', opacity: 0.6 }} />
          </Text>
        )}
        {data.description && (
          <Text size="xs" c="dimmed" lineClamp={3} style={{ lineHeight: 1.4 }}>
            {data.description}
          </Text>
        )}
      </div>
    </Paper>
  );
}
