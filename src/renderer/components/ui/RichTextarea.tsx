import { useState, useRef, useCallback } from 'react';
import { ActionIcon, Group, Textarea, Text, Tooltip } from '@mantine/core';
import { IconBold, IconItalic, IconStrikethrough, IconCode, IconEye, IconEyeOff, IconEyeClosed } from '@tabler/icons-react';
import { renderMarkdown } from '../../lib/markdownParser';

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
}

interface FormatAction {
  label: string;
  icon: React.ReactNode;
  prefix: string;
  suffix: string;
}

const FORMAT_ACTIONS: FormatAction[] = [
  { label: 'Bold', icon: <IconBold size={14} />, prefix: '**', suffix: '**' },
  { label: 'Italic', icon: <IconItalic size={14} />, prefix: '*', suffix: '*' },
  { label: 'Strikethrough', icon: <IconStrikethrough size={14} />, prefix: '~~', suffix: '~~' },
  { label: 'Code', icon: <IconCode size={14} />, prefix: '`', suffix: '`' },
  { label: 'Spoiler', icon: <IconEyeClosed size={14} />, prefix: '||', suffix: '||' },
];

export function RichTextarea({
  value,
  onChange,
  label,
  placeholder,
  minRows = 3,
  maxRows = 10,
  maxLength,
}: RichTextareaProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);

    const newValue =
      value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);
    onChange(newValue);

    // Restore cursor position after the wrapped selection
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newStart = start + prefix.length;
        const newEnd = end + prefix.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newStart, newEnd);
      }
    });
  }, [value, onChange]);

  return (
    <div>
      {label && (
        <Group justify="space-between" mb={4}>
          <Text size="sm" fw={500} c="var(--text-primary)">
            {label}
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setPreview((p) => !p)}
            title={preview ? 'Edit' : 'Preview'}
          >
            {preview ? <IconEyeOff size={14} /> : <IconEye size={14} />}
          </ActionIcon>
        </Group>
      )}

      {/* Formatting toolbar */}
      {!preview && (
        <Group gap={2} mb={4}>
          {FORMAT_ACTIONS.map((action) => (
            <Tooltip key={action.label} label={action.label} position="top" withArrow openDelay={300}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={() => wrapSelection(action.prefix, action.suffix)}
              >
                {action.icon}
              </ActionIcon>
            </Tooltip>
          ))}
        </Group>
      )}

      {preview ? (
        <div
          style={{
            padding: '8px 12px',
            minHeight: minRows * 24,
            maxHeight: maxRows * 24,
            overflow: 'auto',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 4,
            border: '1px solid var(--border)',
            fontSize: 14,
            color: 'var(--text-primary)',
          }}
        >
          {renderMarkdown(value)}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          autosize
          minRows={minRows}
          maxRows={maxRows}
          maxLength={maxLength}
          styles={{
            input: {
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            },
          }}
        />
      )}

      {maxLength && (
        <Text size="xs" c="var(--text-muted)" ta="right" mt={2}>
          {value.length}/{maxLength}
        </Text>
      )}
    </div>
  );
}
