import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge, Image, Paper, Skeleton, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { IconMusic, IconVideo, IconFileZip, IconCode, IconFileText, IconDownload, IconPlayerPlay, IconPhoto } from '@tabler/icons-react';
import { isImageUrl, getImageType, extractImageUrls } from '../../lib/imageUtils';
import { parseMentions, type ParsedMention } from '../../lib/mentionUtils';
import { renderMarkdown } from '../../lib/markdownParser';
import { useEmojiStore } from '../../stores/emojiStore';
import { api, resolveAssetUrl } from '../../lib/api';
import { UserMentionBadge, ChannelMentionBadge, RoleMentionBadge, BroadcastMentionBadge, TimeMentionBadge } from './MentionBadges';
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
  type: 'text' | 'image' | 'spoilerImage' | 'mention' | 'file' | 'messageLink';
  value: string;
  mention?: ParsedMention;
  /** For messageLink segments: the extracted channel & message IDs */
  messageLinkData?: { channelId: string; messageId: string };
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

  // Parse mentions and message links from text segments
  const segments: ParsedSegment[] = [];
  const messageLinkRegex = /sgchat:\/\/message\/([\w-]+)\/([\w-]+)/g;

  for (const seg of rawSegments) {
    if (seg.type === 'image') {
      segments.push({ type: 'image', value: seg.value });
      continue;
    }
    if (seg.type === 'file') {
      segments.push({ type: 'file', value: seg.value });
      continue;
    }

    // First extract message links
    const textWithLinks: { type: 'text' | 'messageLink'; value: string; data?: { channelId: string; messageId: string } }[] = [];
    let linkCursor = 0;
    let linkMatch;
    messageLinkRegex.lastIndex = 0;
    while ((linkMatch = messageLinkRegex.exec(seg.value)) !== null) {
      if (linkMatch.index > linkCursor) {
        textWithLinks.push({ type: 'text', value: seg.value.slice(linkCursor, linkMatch.index) });
      }
      textWithLinks.push({
        type: 'messageLink',
        value: linkMatch[0],
        data: { channelId: linkMatch[1], messageId: linkMatch[2] },
      });
      linkCursor = linkMatch.index + linkMatch[0].length;
    }
    if (linkCursor < seg.value.length) {
      textWithLinks.push({ type: 'text', value: seg.value.slice(linkCursor) });
    }
    if (textWithLinks.length === 0) {
      textWithLinks.push({ type: 'text', value: seg.value });
    }

    // Then parse mentions from the text parts
    for (const part of textWithLinks) {
      if (part.type === 'messageLink') {
        segments.push({ type: 'messageLink', value: part.value, messageLinkData: part.data });
        continue;
      }

      const mentions = parseMentions(part.value);
      if (mentions.length === 0) {
        segments.push({ type: 'text', value: part.value });
        continue;
      }

      let cursor = 0;
      for (const mention of mentions) {
        if (mention.start > cursor) {
          segments.push({ type: 'text', value: part.value.slice(cursor, mention.start) });
        }
        segments.push({ type: 'mention', value: mention.raw, mention });
        cursor = mention.end;
      }
      if (cursor < part.value.length) {
        segments.push({ type: 'text', value: part.value.slice(cursor) });
      }
    }
  }

  return segments;
}

function MentionRenderer({ mention }: { mention: ParsedMention }) {
  switch (mention.type) {
    case 'user': return <UserMentionBadge mention={mention} />;
    case 'channel': return <ChannelMentionBadge mention={mention} />;
    case 'role': return <RoleMentionBadge mention={mention} />;
    case 'time': return <TimeMentionBadge mention={mention} />;
    case 'here':
    case 'everyone': return <BroadcastMentionBadge type={mention.type} />;
    default: return <span>{mention.raw}</span>;
  }
}

function ImageRenderer({ src, compact }: { src: string; compact?: boolean }) {
  const isGif = getImageType(src) === 'gif';
  const maxW = compact ? 200 : 400;
  const maxH = compact ? 150 : 300;
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Use GifRenderer for GIF images
  if (isGif) {
    return <GifRenderer src={src} compact={compact} />;
  }

  if (errored) {
    return (
      <div style={{ margin: '4px 0', maxWidth: maxW }}>
        <Paper
          component="a"
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          p="sm"
          radius="md"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <IconPhoto size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
            Failed to load image
          </Text>
        </Paper>
      </div>
    );
  }

  return (
    <div style={{ margin: '4px 0', position: 'relative', display: 'inline-block' }}>
      {!loaded && (
        <Skeleton
          width={compact ? 200 : 300}
          height={compact ? 150 : 200}
          radius="md"
        />
      )}
      <Image
        src={src}
        alt="Shared image"
        fit="contain"
        maw={maxW}
        mah={maxH}
        radius="md"
        style={{
          background: 'var(--bg-tertiary)',
          display: loaded ? 'block' : 'none',
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        fallbackSrc=""
      />
    </div>
  );
}

/**
 * GIF renderer with 6-second autoplay, canvas frame capture for static preview,
 * and click-to-replay functionality.
 */
function GifRenderer({ src, compact }: { src: string; compact?: boolean }) {
  const maxW = compact ? 200 : 400;
  const maxH = compact ? 150 : 300;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const captureFrame = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.naturalWidth) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    // Start the 6-second autoplay timer
    timerRef.current = setTimeout(() => {
      captureFrame();
      setPlaying(false);
    }, 6000);
  }, [captureFrame]);

  const handleClick = useCallback(() => {
    if (playing) return;
    // Restart playback by toggling the src to force GIF restart
    setPlaying(true);
    const img = imgRef.current;
    if (img) {
      const currentSrc = img.src;
      img.src = '';
      img.src = currentSrc;
    }
    // Set another 6s timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      captureFrame();
      setPlaying(false);
    }, 6000);
  }, [playing, captureFrame]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (errored) {
    return (
      <div style={{ margin: '4px 0', maxWidth: maxW }}>
        <Paper
          component="a"
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          p="sm"
          radius="md"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <IconPhoto size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
            Failed to load GIF
          </Text>
        </Paper>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '4px 0',
        position: 'relative',
        display: 'inline-block',
        cursor: playing ? 'default' : 'pointer',
      }}
      onClick={handleClick}
    >
      {!loaded && (
        <Skeleton width={compact ? 200 : 300} height={compact ? 150 : 200} radius="md" />
      )}
      {/* Hidden canvas for static frame capture */}
      <canvas
        ref={canvasRef}
        style={{
          display: !playing && loaded ? 'block' : 'none',
          maxWidth: maxW,
          maxHeight: maxH,
          borderRadius: 'var(--mantine-radius-md)',
          background: 'var(--bg-tertiary)',
          width: '100%',
          height: 'auto',
        }}
      />
      {/* The actual GIF image */}
      <img
        ref={imgRef}
        src={src}
        alt="Shared GIF"
        onLoad={handleLoad}
        onError={() => setErrored(true)}
        style={{
          display: playing && loaded ? 'block' : 'none',
          maxWidth: maxW,
          maxHeight: maxH,
          borderRadius: 'var(--mantine-radius-md)',
          background: 'var(--bg-tertiary)',
          objectFit: 'contain',
        }}
      />
      {/* GIF label */}
      {loaded && (
        <Text
          size="xs"
          fw={700}
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            color: '#fff',
            background: 'rgba(0,0,0,0.6)',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          GIF
        </Text>
      )}
      {/* Play button overlay when paused */}
      {!playing && loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPlayerPlay size={24} style={{ color: '#fff', marginLeft: 2 }} />
          </div>
        </div>
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
    <div style={{ margin: '4px 0', position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={(e) => {
      if (!revealed) {
        // First click: reveal the spoiler image, block any link navigation
        e.preventDefault();
        e.stopPropagation();
      }
      setRevealed((r) => !r);
    }}>
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

/** Embed for sgchat://message/ links — fetches the referenced message and shows it in a card. */
function MessageLinkEmbed({ channelId, messageId }: { channelId: string; messageId: string }) {
  const [msg, setMsg] = useState<{ content: string; author: { username: string }; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    api.get<{ content: string; author: { username: string }; created_at: string }>(
      `/api/channels/${channelId}/messages/${messageId}`
    ).then((data) => {
      setMsg(data);
      setLoading(false);
    }).catch(() => {
      setErrored(true);
      setLoading(false);
    });
  }, [channelId, messageId]);

  if (errored) return null;

  if (loading) {
    return (
      <Paper
        radius="md"
        p="sm"
        style={{
          marginTop: 4,
          maxWidth: 400,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <Skeleton height={10} width="60%" radius="xs" mb={6} />
        <Skeleton height={12} width="90%" radius="xs" />
      </Paper>
    );
  }

  if (!msg) return null;

  return (
    <Paper
      radius="md"
      p="sm"
      style={{
        marginTop: 4,
        maxWidth: 400,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <Text size="xs" fw={600} mb={2}>{msg.author.username}</Text>
      <Text size="sm" lineClamp={3} style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
        {msg.content}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        {new Date(msg.created_at).toLocaleString()}
      </Text>
    </Paper>
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

/**
 * Render text that may contain `<motd>...</motd>` inline tags as Mantine Badges.
 * Falls through to renderMarkdown for non-MOTD text segments.
 */
function renderMotdBadges(text: string, hasEmojis: boolean): React.ReactNode {
  const motdRegex = /<motd>([\s\S]*?)<\/motd>/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = motdRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`motd-t-${keyIdx++}`}>{renderMarkdown(text.slice(lastIndex, match.index), hasEmojis)}</span>,
      );
    }
    parts.push(
      <Badge
        key={`motd-b-${keyIdx++}`}
        variant="light"
        color="yellow"
        size="sm"
        radius="sm"
        style={{ verticalAlign: 'middle', margin: '0 2px' }}
      >
        {match[1]}
      </Badge>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) {
    return renderMarkdown(text, hasEmojis);
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`motd-t-${keyIdx}`}>{renderMarkdown(text.slice(lastIndex), hasEmojis)}</span>,
    );
  }

  return <>{parts}</>;
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
          case 'messageLink':
            return segment.messageLinkData ? (
              <MessageLinkEmbed
                key={i}
                channelId={segment.messageLinkData.channelId}
                messageId={segment.messageLinkData.messageId}
              />
            ) : null;
          case 'text':
          default:
            return <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderMotdBadges(segment.value, hasEmojis)}</span>;
        }
      })}
      {embedUrls.map((url) => (
        <UrlEmbed key={url} url={url} />
      ))}
    </span>
  );
}
