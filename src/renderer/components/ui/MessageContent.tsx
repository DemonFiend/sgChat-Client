import { useState, useMemo } from 'react';
import { Image, Paper, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconMusic, IconVideo, IconFileZip, IconCode, IconFileText, IconDownload } from '@tabler/icons-react';
import { isImageUrl, getImageType, extractImageUrls } from '../../lib/imageUtils';
import { parseMentions, type ParsedMention } from '../../lib/mentionUtils';
import { renderMarkdown } from '../../lib/markdownParser';
import { useEmojiStore } from '../../stores/emojiStore';
import { resolveAssetUrl } from '../../lib/api';
import { UserMentionBadge, ChannelMentionBadge, RoleMentionBadge, BroadcastMentionBadge } from './MentionBadges';
import { UrlEmbed } from './UrlEmbed';

export interface MessageContentProps {
  content: string;
  isOwnMessage?: boolean;
  compact?: boolean;
}

// Non-image file extensions that should render as file cards
const FILE_EXTENSIONS = ['pdf', 'txt', 'zip', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'json', 'md', 'rar', '7z', 'tar', 'gz', 'flac', 'aac', 'avi', 'mkv', 'mov', 'js', 'ts', 'py', 'html', 'css'];

/** Check if a URL points to a non-image uploaded file (e.g. MinIO /uploads/ path). */
function isFileUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes('\n') || trimmed.includes(' ')) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (!url.pathname.includes('/uploads/')) return false;
    if (isImageUrl(trimmed)) return false;
    const extMatch = url.pathname.match(/\.([a-z0-9]+)$/i);
    if (extMatch && FILE_EXTENSIONS.includes(extMatch[1].toLowerCase())) return true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse filename from a MinIO upload URL.
 * URL format: .../uploads/{userId}/{nanoid}-{filename}
 */
function parseFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const dashIndex = lastPart.indexOf('-');
    if (dashIndex > 0 && dashIndex <= 20) {
      return decodeURIComponent(lastPart.substring(dashIndex + 1));
    }
    return decodeURIComponent(lastPart);
  } catch {
    return 'Unknown file';
  }
}

/** Get a file type icon category from extension. */
function getFileIconType(filename: string): 'audio' | 'video' | 'document' | 'archive' | 'code' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext || '')) return 'audio';
  if (['mp4', 'webm', 'avi', 'mkv', 'mov'].includes(ext || '')) return 'video';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return 'archive';
  if (['json', 'md', 'js', 'ts', 'py', 'html', 'css'].includes(ext || '')) return 'code';
  return 'document';
}

/** Format file size for display. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ParsedSegment {
  type: 'text' | 'image' | 'spoilerImage' | 'mention' | 'file';
  value: string;
  mention?: ParsedMention;
}

function parseContentSegments(content: string): ParsedSegment[] {
  if (!content) return [];

  // Spoiler-wrapped image URL: ||url||
  const spoilerMatch = content.trim().match(/^\|\|(.+?)\|\|$/s);
  if (spoilerMatch && isImageUrl(spoilerMatch[1].trim())) {
    return [{ type: 'spoilerImage', value: spoilerMatch[1].trim() }];
  }

  // Full-content image URL
  if (isImageUrl(content)) {
    return [{ type: 'image', value: content }];
  }

  // Full-content file URL
  if (isFileUrl(content)) {
    return [{ type: 'file', value: content }];
  }

  // Split by image URLs and file URLs
  const imageUrls = extractImageUrls(content);

  // Also extract file URLs
  const fileUrlRegex = /https?:\/\/[^\s]+/g;
  const allFileUrls: string[] = [];
  let fileMatch;
  while ((fileMatch = fileUrlRegex.exec(content)) !== null) {
    if (isFileUrl(fileMatch[0])) {
      allFileUrls.push(fileMatch[0]);
    }
  }

  // Combine image and file URLs, sorted by position
  const allMediaUrls: { url: string; type: 'image' | 'file' }[] = [
    ...imageUrls.map((url) => ({ url, type: 'image' as const })),
    ...allFileUrls.map((url) => ({ url, type: 'file' as const })),
  ].sort((a, b) => content.indexOf(a.url) - content.indexOf(b.url));

  const rawSegments: { type: 'text' | 'image' | 'file'; value: string }[] = [];

  if (allMediaUrls.length === 0) {
    rawSegments.push({ type: 'text', value: content });
  } else {
    let remaining = content;
    for (const media of allMediaUrls) {
      const urlIndex = remaining.indexOf(media.url);
      if (urlIndex > 0) {
        const textBefore = remaining.substring(0, urlIndex).trim();
        if (textBefore) rawSegments.push({ type: 'text', value: textBefore });
      }
      rawSegments.push({ type: media.type, value: media.url });
      remaining = remaining.substring(urlIndex + media.url.length);
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
    if (seg.type === 'file') {
      segments.push({ type: 'file', value: seg.value });
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

/** Spoiler image: blurred until clicked to reveal. */
function SpoilerImageRenderer({ src, compact }: { src: string; compact?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const maxW = compact ? 200 : 400;
  const maxH = compact ? 150 : 300;

  return (
    <div style={{ margin: '4px 0', position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={() => setRevealed((r) => !r)}>
      {!loaded && (
        <div style={{ width: compact ? 200 : 300, height: compact ? 150 : 200, background: 'var(--bg-tertiary)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      )}
      <Image
        src={src}
        alt="Spoiler image"
        fit="contain"
        maw={maxW}
        mah={maxH}
        radius="md"
        style={{
          background: 'var(--bg-tertiary)',
          filter: !revealed ? 'blur(40px) brightness(0.5)' : 'none',
          transition: 'filter 300ms ease',
          display: loaded ? 'block' : 'none',
        }}
        onLoad={() => setLoaded(true)}
        fallbackSrc=""
      />
      {!revealed && loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.7)', color: 'white', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SPOILER
          </div>
        </div>
      )}
    </div>
  );
}

/** File attachment card with icon, filename, and download link. */
function FileCard({ url }: { url: string }) {
  const filename = parseFilenameFromUrl(url);
  const iconType = getFileIconType(filename);

  const iconMap = {
    audio: IconMusic,
    video: IconVideo,
    archive: IconFileZip,
    code: IconCode,
    document: IconFileText,
  };
  const IconComponent = iconMap[iconType];

  return (
    <div style={{ margin: '4px 0', maxWidth: 400 }}>
      <Paper
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        p="sm"
        radius="md"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          textDecoration: 'none',
          transition: 'border-color 0.15s',
          cursor: 'pointer',
        }}
        className="file-card-hover"
      >
        <ThemeIcon size={40} radius="md" variant="light" color="brand">
          <IconComponent size={20} />
        </ThemeIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} c="brand" truncate>
            {filename}
          </Text>
          <Text size="xs" c="dimmed">
            Click to download
          </Text>
        </div>
        <IconDownload size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </Paper>
    </div>
  );
}

/**
 * Render an attachment from the message's attachments array.
 * Exported for use in MessageItem.
 */
export function AttachmentCard({ attachment }: { attachment: { url: string; filename: string; size: number; mime_type: string } }) {
  const filename = attachment.filename || parseFilenameFromUrl(attachment.url);
  const iconType = getFileIconType(filename);

  const iconMap = {
    audio: IconMusic,
    video: IconVideo,
    archive: IconFileZip,
    code: IconCode,
    document: IconFileText,
  };
  const IconComponent = iconMap[iconType];

  return (
    <div style={{ margin: '4px 0', maxWidth: 400 }}>
      <Paper
        component="a"
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        p="sm"
        radius="md"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          textDecoration: 'none',
          transition: 'border-color 0.15s',
          cursor: 'pointer',
        }}
        className="file-card-hover"
      >
        <ThemeIcon size={40} radius="md" variant="light" color="brand">
          <IconComponent size={20} />
        </ThemeIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} c="brand" truncate>
            {filename}
          </Text>
          <Text size="xs" c="dimmed">
            {attachment.size ? formatFileSize(attachment.size) : 'Click to download'}
          </Text>
        </div>
        <IconDownload size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </Paper>
    </div>
  );
}

/** Extract non-image URLs from content for embed previews */
function extractEmbedUrls(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s<]+[^\s<.,;:!?)}\]]/g;
  const matches = content.match(urlRegex);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of matches) {
    if (!seen.has(url) && !isImageUrl(url) && !isFileUrl(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}

export function MessageContent({ content, isOwnMessage, compact }: MessageContentProps) {
  const segments = useMemo(() => parseContentSegments(content), [content]);
  const embedUrls = useMemo(() => extractEmbedUrls(content), [content]);
  // Subscribe to emoji manifest so we re-render when it loads
  const hasEmojis = useEmojiStore((s) => !!s.manifest?.master_enabled);

  return (
    <span>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case 'spoilerImage':
            return <SpoilerImageRenderer key={i} src={segment.value} compact={compact} />;
          case 'image':
            return <ImageRenderer key={i} src={segment.value} compact={compact} />;
          case 'file':
            return <FileCard key={i} url={segment.value} />;
          case 'mention':
            return <MentionRenderer key={i} mention={segment.mention!} />;
          case 'text':
          default:
            return <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderMarkdown(segment.value, hasEmojis)}</span>;
        }
      })}
      {embedUrls.map((url) => (
        <UrlEmbed key={url} url={url} />
      ))}
    </span>
  );
}
