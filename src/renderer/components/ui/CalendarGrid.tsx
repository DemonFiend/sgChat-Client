import { useState, useMemo } from 'react';
import { ActionIcon, Group, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface CalendarGridProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  highlightedDates?: Date[];
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarGrid({ value, onChange, minDate, maxDate, highlightedDates }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(() => value || new Date());
  const today = useMemo(() => new Date(), []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return cells;
  }, [year, month]);

  const highlightSet = useMemo(() => {
    if (!highlightedDates) return new Set<string>();
    return new Set(highlightedDates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
  }, [highlightedDates]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const cellSize = 32;

  return (
    <div style={{ width: cellSize * 7 + 16, padding: 8 }}>
      {/* Month/Year Header */}
      <Group justify="space-between" mb={8}>
        <ActionIcon variant="subtle" size="sm" onClick={prevMonth}>
          <IconChevronLeft size={14} />
        </ActionIcon>
        <Text size="sm" fw={600} c="var(--text-primary)">
          {MONTH_NAMES[month]} {year}
        </Text>
        <ActionIcon variant="subtle" size="sm" onClick={nextMonth}>
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>

      {/* Day Names */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSize}px)` }}>
        {DAY_NAMES.map((d) => (
          <Text key={d} size="xs" c="var(--text-muted)" ta="center" fw={600} style={{ height: cellSize, lineHeight: `${cellSize}px` }}>
            {d}
          </Text>
        ))}
      </div>

      {/* Day Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cellSize}px)` }}>
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const selected = value && isSameDay(date, value);
          const isToday = isSameDay(date, today);
          const highlighted = highlightSet.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
          const disabled = isDisabled(date);

          return (
            <div
              key={date.getDate()}
              onClick={() => !disabled && onChange?.(date)}
              style={{
                width: cellSize,
                height: cellSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 13,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.3 : 1,
                backgroundColor: selected ? 'var(--accent)' : highlighted ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'transparent',
                color: selected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isToday || selected ? 700 : 400,
                border: isToday && !selected ? '1px solid var(--accent)' : 'none',
              }}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
