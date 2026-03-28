export interface MentionMapping {
  displayText: string;
  wireFormat: string;
  startIndex: number;
}

export function convertMentionsToWireFormat(
  text: string,
  mappings: MentionMapping[],
): string {
  const sorted = [...mappings].sort((a, b) => b.startIndex - a.startIndex);
  let result = text;
  for (const mapping of sorted) {
    const end = mapping.startIndex + mapping.displayText.length;
    if (result.slice(mapping.startIndex, end) === mapping.displayText) {
      result = result.slice(0, mapping.startIndex) + mapping.wireFormat + result.slice(end);
    }
  }
  return result;
}

export function shiftMappings(
  mappings: MentionMapping[],
  afterIndex: number,
  delta: number,
): MentionMapping[] {
  return mappings.map((m) =>
    m.startIndex >= afterIndex ? { ...m, startIndex: m.startIndex + delta } : m,
  );
}

export function pruneMappings(
  mappings: MentionMapping[],
  deleteStart: number,
  deleteEnd: number,
): MentionMapping[] {
  return mappings.filter((m) => {
    const mEnd = m.startIndex + m.displayText.length;
    return mEnd <= deleteStart || m.startIndex >= deleteEnd;
  });
}

export interface ParsedMention {
  type: 'user' | 'channel' | 'role' | 'everyone' | 'here' | 'time';
  id?: string;
  raw: string;
  start: number;
  end: number;
  /** For time mentions: the unix timestamp (seconds). */
  timestamp?: number;
  /** For time mentions: the format flag (t, T, d, D, f, F, R). */
  timeFormat?: string;
}

/**
 * Parse mention patterns from message content.
 * Formats:
 *   <@userId>   — user mention
 *   <@!userId>  — nickname mention (treated as user)
 *   <#channelId> — channel mention
 *   <@&roleId>  — role mention
 *   @everyone   — broadcast everyone
 *   @here       — broadcast here
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const regex = /<@!?([\w-]+)>|<#([\w-]+)>|<@&([\w-]+)>|(@everyone|@here)|<t:(\d+)(?::([tTdDfFR]))?\>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (match[5]) {
      // Time mention: <t:timestamp:format> or <t:timestamp>
      mentions.push({
        type: 'time',
        raw: match[0],
        start,
        end,
        timestamp: parseInt(match[5], 10),
        timeFormat: match[6] || 'f',
      });
    } else if (match[1] && !match[0].startsWith('<@&')) {
      // User mention: <@id> or <@!id>
      mentions.push({ type: 'user', id: match[1], raw: match[0], start, end });
    } else if (match[2]) {
      mentions.push({ type: 'channel', id: match[2], raw: match[0], start, end });
    } else if (match[3]) {
      mentions.push({ type: 'role', id: match[3], raw: match[0], start, end });
    } else if (match[4]) {
      const t = match[4] === '@everyone' ? 'everyone' : 'here';
      mentions.push({ type: t, raw: match[0], start, end });
    }
  }

  return mentions;
}
