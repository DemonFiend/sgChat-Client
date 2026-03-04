import { useMemo } from 'react';
import { Image, Text } from '@mantine/core';
import { isImageUrl, getImageType, extractImageUrls } from '../../lib/imageUtils';
import { parseMentions, type ParsedMention } from '../../lib/mentionUtils';
import { UserMentionBadge, ChannelMentionBadge, RoleMentionBadge, BroadcastMentionBadge } from './MentionBadges';

export interface MessageContentProps {
  content: string;
  isOwnMessage?: boolean;
  compact?: boolean;
}

interface ParsedSegment {
  type: 'text' | 'image' | 'mention';
  value: string;
  mention?: ParsedMention;
}

function parseContentSegments(content: string): ParsedSegment[] {
  if (!content) return [];

  // Full-content image URL
  if (isImageUrl(content)) {
    return [{ type: 'image', value: content }];
  }

  // Split by image URLs first
  const imageUrls = extractImageUrls(content);
  const rawSegments: { type: 'text' | 'image'; value: string }[] = [];

  if (imageUrls.length === 0) {
    rawSegments.push({ type: 'text', value: content });
  } else {
    let remaining = content;
    for (const url of imageUrls) {
      const urlIndex = remaining.indexOf(url);
      if (urlIndex > 0) {
        const textBefore = remaining.substring(0, urlIndex).trim();
        if (textBefore) rawSegments.push({ type: 'text', value: textBefore });
      }
      rawSegments.push({ type: 'image', value: url });
      remaining = remaining.substring(urlIndex + url.length);
    }
    const trimmed = remaining.trim();
    if (trimmed) rawSegments.push({ type: 'text', value: trimmed });
  }

  // Parse mentions from text segments
  const segments: ParsedSegment[] = [];
  for (const seg of rawSegments) {
    if (seg.type === 'image') {
      segments.push({ type: 'image', value: seg.value });
      continue;
    }

    const mentions = parseMentions(seg.value);
    if (mentions.length === 0) {
      segments.push({ type: 'text', value: seg.value });
      continue;
    }

    let cursor = 0;
    for (const mention of mentions) {
      if (mention.start > cursor) {
        segments.push({ type: 'text', value: seg.value.slice(cursor, mention.start) });
      }
      segments.push({ type: 'mention', value: mention.raw, mention });
      cursor = mention.end;
    }
    if (cursor < seg.value.length) {
      segments.push({ type: 'text', value: seg.value.slice(cursor) });
    }
  }

  return segments;
}

function MentionRenderer({ mention }: { mention: ParsedMention }) {
  switch (mention.type) {
    case 'user': return <UserMentionBadge mention={mention} />;
    case 'channel': return <ChannelMentionBadge mention={mention} />;
    case 'role': return <RoleMentionBadge mention={mention} />;
    case 'here':
    case 'everyone': return <BroadcastMentionBadge type={mention.type} />;
    default: return <span>{mention.raw}</span>;
  }
}

function ImageRenderer({ src, compact }: { src: string; compact?: boolean }) {
  const maxW = compact ? 200 : 400;
  const maxH = compact ? 150 : 300;

  return (
    <div style={{ margin: '4px 0', position: 'relative', display: 'inline-block' }}>
      <Image
        src={src}
        alt="Shared image"
        fit="contain"
        maw={maxW}
        mah={maxH}
        radius="md"
        style={{ background: 'var(--bg-tertiary)' }}
        fallbackSrc=""
      />
      {getImageType(src) === 'gif' && (
        <Text size="xs" fw={700} c="dimmed" style={{ position: 'absolute', bottom: 8, left: 8 }}>
          GIF
        </Text>
      )}
    </div>
  );
}

export function MessageContent({ content, isOwnMessage, compact }: MessageContentProps) {
  const segments = useMemo(() => parseContentSegments(content), [content]);

  return (
    <span>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case 'image':
            return <ImageRenderer key={i} src={segment.value} compact={compact} />;
          case 'mention':
            return <MentionRenderer key={i} mention={segment.mention!} />;
          case 'text':
          default:
            return <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{segment.value}</span>;
        }
      })}
    </span>
  );
}
