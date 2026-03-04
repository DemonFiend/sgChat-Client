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
  type: 'user' | 'channel' | 'role' | 'everyone' | 'here';
  id?: string;
  raw: string;
  start: number;
  end: number;
}

/**
 * Parse mention patterns from message content.
 * Formats: <@userId>, <#channelId>, <@&roleId>, @everyone, @here
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const regex = /<@(\w+)>|<#(\w+)>|<@&(\w+)>|(@everyone|@here)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      mentions.push({ type: 'user', id: match[1], raw: match[0], start: match.index, end: match.index + match[0].length });
    } else if (match[2]) {
      mentions.push({ type: 'channel', id: match[2], raw: match[0], start: match.index, end: match.index + match[0].length });
    } else if (match[3]) {
      mentions.push({ type: 'role', id: match[3], raw: match[0], start: match.index, end: match.index + match[0].length });
    } else if (match[4]) {
      const t = match[4] === '@everyone' ? 'everyone' : 'here';
      mentions.push({ type: t, raw: match[0], start: match.index, end: match.index + match[0].length });
    }
  }

  return mentions;
}
