import React from 'react';

/**
 * Discord-style markdown parser.
 * Supports: code blocks, inline code, bold, italic, bold-italic,
 * underline, strikethrough, spoilers, blockquotes.
 *
 * Does NOT parse inside code blocks/inline code.
 */

interface MarkdownNode {
  type: 'text' | 'bold' | 'italic' | 'boldItalic' | 'underline' | 'strikethrough' | 'spoiler' | 'inlineCode' | 'codeBlock' | 'blockquote';
  content: string;
  children?: MarkdownNode[];
  language?: string;
}

// Parse code blocks first (``` ... ```)
function extractCodeBlocks(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...parseBlockquotes(text.slice(lastIndex, match.index)));
    }
    nodes.push({
      type: 'codeBlock',
      content: match[2],
      language: match[1] || undefined,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...parseBlockquotes(text.slice(lastIndex)));
  }

  return nodes;
}

// Parse blockquotes (> at start of line)
function parseBlockquotes(text: string): MarkdownNode[] {
  const lines = text.split('\n');
  const nodes: MarkdownNode[] = [];
  let quoteLines: string[] = [];

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      const quoteText = quoteLines.join('\n');
      nodes.push({
        type: 'blockquote',
        content: quoteText,
        children: parseInlineMarkdown(quoteText),
      });
      quoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('> ')) {
      quoteLines.push(line.slice(2));
    } else if (line === '>') {
      quoteLines.push('');
    } else {
      flushQuote();
      // Re-join consecutive non-quote lines
      const textLine = i < lines.length - 1 ? line + '\n' : line;
      const existing = nodes[nodes.length - 1];
      if (existing?.type === 'text') {
        existing.content += textLine;
        existing.children = parseInlineMarkdown(existing.content);
      } else {
        nodes.push({
          type: 'text',
          content: textLine,
          children: parseInlineMarkdown(textLine),
        });
      }
    }
  }
  flushQuote();
  return nodes;
}

// Inline markdown patterns (order matters — longest/most specific first)
const INLINE_PATTERNS: { pattern: RegExp; type: MarkdownNode['type'] }[] = [
  { pattern: /\*\*\*(.+?)\*\*\*/gs, type: 'boldItalic' },
  { pattern: /\*\*(.+?)\*\*/gs, type: 'bold' },
  { pattern: /\*(.+?)\*/gs, type: 'italic' },
  { pattern: /__(.+?)__/gs, type: 'underline' },
  { pattern: /~~(.+?)~~/gs, type: 'strikethrough' },
  { pattern: /\|\|(.+?)\|\|/gs, type: 'spoiler' },
  { pattern: /`([^`]+)`/g, type: 'inlineCode' },
];

function parseInlineMarkdown(text: string): MarkdownNode[] {
  if (!text) return [];

  // Find the earliest match across all patterns
  let earliestMatch: { index: number; length: number; captured: string; type: MarkdownNode['type'] } | null = null;

  for (const { pattern, type } of INLINE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const match = regex.exec(text);
    if (match && (!earliestMatch || match.index < earliestMatch.index)) {
      earliestMatch = {
        index: match.index,
        length: match[0].length,
        captured: match[1],
        type,
      };
    }
  }

  if (!earliestMatch) {
    return [{ type: 'text', content: text }];
  }

  const nodes: MarkdownNode[] = [];

  // Text before match
  if (earliestMatch.index > 0) {
    nodes.push({ type: 'text', content: text.slice(0, earliestMatch.index) });
  }

  // The matched node — inline code doesn't recurse
  if (earliestMatch.type === 'inlineCode') {
    nodes.push({ type: 'inlineCode', content: earliestMatch.captured });
  } else {
    nodes.push({
      type: earliestMatch.type,
      content: earliestMatch.captured,
      children: parseInlineMarkdown(earliestMatch.captured),
    });
  }

  // Text after match
  const afterIndex = earliestMatch.index + earliestMatch.length;
  if (afterIndex < text.length) {
    nodes.push(...parseInlineMarkdown(text.slice(afterIndex)));
  }

  return nodes;
}

// --- React rendering ---

function RenderNode({ node }: { node: MarkdownNode }) {
  switch (node.type) {
    case 'text':
      if (node.children && node.children.length > 0 && !(node.children.length === 1 && node.children[0].type === 'text')) {
        return <>{node.children.map((child, i) => <RenderNode key={i} node={child} />)}</>;
      }
      return <>{node.content}</>;

    case 'bold':
      return <strong>{node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}</strong>;

    case 'italic':
      return <em>{node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}</em>;

    case 'boldItalic':
      return <strong><em>{node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}</em></strong>;

    case 'underline':
      return <u>{node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}</u>;

    case 'strikethrough':
      return <s>{node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}</s>;

    case 'spoiler':
      return (
        <span
          className="md-spoiler"
          onClick={(e) => (e.currentTarget.classList.toggle('md-spoiler--revealed'))}
        >
          {node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}
        </span>
      );

    case 'inlineCode':
      return <code className="md-inline-code">{node.content}</code>;

    case 'codeBlock':
      return (
        <pre className="md-code-block">
          <code>{node.content}</code>
        </pre>
      );

    case 'blockquote':
      return (
        <blockquote className="md-blockquote">
          {node.children?.map((child, i) => <RenderNode key={i} node={child} />) ?? node.content}
        </blockquote>
      );

    default:
      return <>{node.content}</>;
  }
}

/**
 * Parse Discord-style markdown text and return React elements.
 * Call this on text segments only (not on mentions or images).
 */
export function renderMarkdown(text: string): React.ReactNode {
  const nodes = extractCodeBlocks(text);
  return (
    <>
      {nodes.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </>
  );
}
