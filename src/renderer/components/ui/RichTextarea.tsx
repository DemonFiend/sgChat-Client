import { useState } from 'react';
import { ActionIcon, Group, Textarea, Text } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
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
