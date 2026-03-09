import { useMemo } from 'react';
import { Image, Text, Tooltip } from '@mantine/core';
import { isImageUrl, getImageType, extractImageUrls } from '../../lib/imageUtils';
import { parseMentions, type ParsedMention } from '../../lib/mentionUtils';
import { renderMarkdown } from '../../lib/markdownParser';
import { useEmojiStore } from '../../stores/emojiStore';
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

/** Render text with :shortcode: replaced by inline emoji images */
function TextWithEmojis({ text }: { text: string }) {
  const findByShortcode = useEmojiStore((s) => s.findByShortcode);

  const parts = useMemo(() => {
    const result: Array<{ type: 'text' | 'emoji'; value: string; url?: string; shortcode?: string }> = [];
    const regex = /:([a-zA-Z0-9_]+):/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const emoji = findByShortcode(match[1]);
      if (emoji) {
        if (match.index > lastIndex) {
          result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        result.push({ type: 'emoji', value: match[0], url: emoji.image_url, shortcode: emoji.shortcode });
        lastIndex = match.index + match[0].length;
      }
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return result;
  }, [text, findByShortcode]);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'emoji') {
          return (
            <Tooltip key={i} label={`:${part.shortcode}:`} position="top" withArrow openDelay={300}>
              <img
                src={part.url}
                alt={`:${part.shortcode}:`}
                width={20}
                height={20}
                style={{ objectFit: 'contain', verticalAlign: 'text-bottom', display: 'inline', margin: '0 1px' }}
              />
            </Tooltip>
          );
        }
        return <span key={i}>{renderMarkdown(part.value)}</span>;
      })}
    </>
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
            return <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><TextWithEmojis text={segment.value} /></span>;
        }
      })}
    </span>
  );
}
