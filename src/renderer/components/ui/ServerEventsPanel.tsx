import { useState, useMemo, useCallback } from 'react';
import { ActionIcon, Badge, Button, Group, Modal, MultiSelect, ScrollArea, SegmentedControl, Select, Stack, Switch, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconCalendar, IconCalendarPlus, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconEdit, IconHistory, IconMapPin, IconQuestionMark, IconTrash, IconUser, IconX } from '@tabler/icons-react';
import { useServerEvents, useEventHistory, useCreateEvent, useUpdateEvent, useRsvpEvent, useCancelEvent, useDeleteEvent, type ServerEvent } from '../../hooks/useEvents';
import { canCreateEvents, canManageEvents, canEditEvent } from '../../stores/permissions';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface ServerEventsPanelProps {
  serverId: string;
  /** Available text channels for announcement selection */
  channels?: Array<{ id: string; name: string; type: string }>;
  /** Available roles for private visibility */
  roles?: Array<{ id: string; name: string; color?: string }>;
}

export function ServerEventsPanel({ serverId, channels, roles }: ServerEventsPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [showHistory, setShowHistory] = useState(false);
  const { data: events, isLoading } = useServerEvents(serverId, currentMonth);
  const { data: historyEvents, isLoading: historyLoading } = useEventHistory(showHistory ? serverId : null, currentMonth);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ServerEvent | null>(null);
  const [editEvent, setEditEvent] = useState<ServerEvent | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const canManage = canCreateEvents();

  const displayEvents = showHistory ? historyEvents : events;
  const loading = showHistory ? historyLoading : isLoading;

  const sortedEvents = useMemo(() => {
    if (!displayEvents) return [];
    const sorted = [...displayEvents].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Filter by selected day if set
    if (selectedDay !== null) {
      const [y, mo] = currentMonth.split('-').map(Number);
      return sorted.filter((e) => {
        const d = new Date(e.start_time);
        return d.getDate() === selectedDay && d.getMonth() === mo - 1 && d.getFullYear() === y;
      });
    }
    return sorted;
  }, [displayEvents, selectedDay, currentMonth]);

  const prevMonth = useCallback(() => {
    setCurrentMonth((m) => shiftMonth(m, -1));
    setSelectedDay(null);
  }, []);
  const nextMonth = useCallback(() => {
    setCurrentMonth((m) => shiftMonth(m, 1));
    setSelectedDay(null);
  }, []);

  const handleDayClick = useCallback((day: number | null) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  }, []);

  const textChannels = useMemo(() => {
    if (!channels) return [];
    return channels
      .filter((c) => c.type === 'text')
      .map((c) => ({ value: c.id, label: `#${c.name}` }));
  }, [channels]);

  const roleOptions = useMemo(() => {
    if (!roles) return [];
    return roles.map((r) => ({ value: r.id, label: r.name }));
  }, [roles]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <Group gap={8}>
          <IconCalendar size={18} style={{ color: 'var(--text-muted)' }} />
          <Text fw={600} size="sm">{showHistory ? 'Event History' : 'Server Events'}</Text>
        </Group>
        <Group gap={8}>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'list' | 'calendar')}
            data={[
              { label: 'List', value: 'list' },
              { label: 'Calendar', value: 'calendar' },
            ]}
          />
          <Tooltip label={showHistory ? 'Show Upcoming' : 'Show History'} position="bottom" withArrow>
            <ActionIcon
              aria-label={showHistory ? 'Show Upcoming' : 'Show History'}
              variant={showHistory ? 'light' : 'subtle'}
              color={showHistory ? 'brand' : 'gray'}
              size={28}
              onClick={() => setShowHistory((v) => !v)}
            >
              <IconHistory size={16} />
            </ActionIcon>
          </Tooltip>
          {canManage && (
            <Tooltip label="Create Event" position="bottom" withArrow>
              <ActionIcon aria-label="Create Event" variant="light" size={28} onClick={() => setCreateOpen(true)}>
                <IconCalendarPlus size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </div>

      {/* Month navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <ActionIcon aria-label="Previous month" variant="subtle" size={24} onClick={prevMonth}><IconChevronLeft size={14} /></ActionIcon>
        <Text size="sm" fw={600} style={{ minWidth: 140, textAlign: 'center' }}>{formatMonthLabel(currentMonth)}</Text>
        <ActionIcon aria-label="Next month" variant="subtle" size={24} onClick={nextMonth}><IconChevronRight size={14} /></ActionIcon>
      </div>

      {/* Day filter indicator */}
      {selectedDay !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '6px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <Text size="xs" c="dimmed">
            Showing events for {formatMonthLabel(currentMonth).split(' ')[0]} {selectedDay}
          </Text>
          <ActionIcon aria-label="Clear day filter" variant="subtle" size={16} onClick={() => setSelectedDay(null)}>
            <IconX size={10} />
          </ActionIcon>
        </div>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        <div style={{ flex: 1, padding: 16, minHeight: 0 }}>
          {loading && <Text size="sm" c="dimmed" ta="center" py={32}>Loading events...</Text>}
          {!loading && (displayEvents || []).length === 0 && (
            <Stack align="center" py={40} gap={8}>
              <IconCalendar size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <Text size="sm" c="dimmed">{showHistory ? 'No past events this month' : 'No upcoming events'}</Text>
              {canManage && !showHistory && (
                <Button size="xs" variant="light" leftSection={<IconCalendarPlus size={14} />} onClick={() => setCreateOpen(true)}>
                  Create Event
                </Button>
              )}
            </Stack>
          )}
          {!loading && (displayEvents || []).length > 0 && (
            <CalendarGrid
              events={displayEvents || []}
              currentMonth={currentMonth}
              onEventClick={setSelectedEvent}
              selectedDay={selectedDay}
              onDayClick={handleDayClick}
            />
          )}
        </div>
      ) : (
        <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
          <div style={{ padding: 16 }}>
            {loading && <Text size="sm" c="dimmed" ta="center" py={32}>Loading events...</Text>}
            {!loading && sortedEvents.length === 0 && (
              <Stack align="center" py={40} gap={8}>
                <IconCalendar size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <Text size="sm" c="dimmed">{showHistory ? 'No past events this month' : selectedDay !== null ? 'No events on this day' : 'No upcoming events'}</Text>
                {canManage && !showHistory && (
                  <Button size="xs" variant="light" leftSection={<IconCalendarPlus size={14} />} onClick={() => setCreateOpen(true)}>
                    Create Event
                  </Button>
                )}
              </Stack>
            )}
            <Stack gap={8}>
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} serverId={serverId} onSelect={() => setSelectedEvent(event)} />
              ))}
            </Stack>
          </div>
        </ScrollArea>
      )}

      {/* Create / Edit Event Modal */}
      <CreateEventModal
        serverId={serverId}
        opened={createOpen || !!editEvent}
        onClose={() => { setCreateOpen(false); setEditEvent(null); }}
        editEvent={editEvent}
        textChannels={textChannels}
        roleOptions={roleOptions}
      />

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          serverId={serverId}
          opened={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={(evt) => { setSelectedEvent(null); setEditEvent(evt); }}
        />
      )}
    </div>
  );
}

function EventCard({ event, serverId, onSelect }: { event: ServerEvent; serverId: string; onSelect: () => void }) {
  const rsvp = useRsvpEvent(serverId);
  const startDate = new Date(event.start_time);
  const isToday = new Date().toDateString() === startDate.toDateString();

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        borderRadius: 6,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        borderLeft: `3px solid ${event.color || 'var(--accent)'}`,
        transition: 'background 0.15s',
      }}
      className="emoji-btn"
    >
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={600}>{event.title}</Text>
        {isToday && <Badge size="xs" variant="light" color="green">Today</Badge>}
      </Group>

      <Group gap={12} mb={8}>
        <Group gap={4}>
          <IconClock size={12} style={{ color: 'var(--text-muted)' }} />
          <Text size="xs" c="dimmed">{startDate.toLocaleDateString()} {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </Group>
        {event.location && (
          <Group gap={4}>
            <IconMapPin size={12} style={{ color: 'var(--text-muted)' }} />
            <Text size="xs" c="dimmed">{event.location}</Text>
          </Group>
        )}
      </Group>

      {/* Creator display */}
      {event.creator_username && (
        <Group gap={4} mb={6}>
          <IconUser size={12} style={{ color: 'var(--text-muted)' }} />
          <Text size="xs" c="dimmed">Created by {event.creator_username}</Text>
        </Group>
      )}

      {/* RSVP buttons */}
      <Group gap={4}>
        <Button
          size="xs"
          variant={event.my_rsvp === 'interested' ? 'filled' : 'light'}
          color="green"
          leftSection={<IconCheck size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'interested' }); }}
        >
          Interested {event.rsvp_counts?.interested ? `(${event.rsvp_counts.interested})` : ''}
        </Button>
        <Button
          size="xs"
          variant={event.my_rsvp === 'tentative' ? 'filled' : 'light'}
          color="yellow"
          leftSection={<IconQuestionMark size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'tentative' }); }}
        >
          Tentative {event.rsvp_counts?.tentative ? `(${event.rsvp_counts.tentative})` : ''}
        </Button>
        <Button
          size="xs"
          variant={event.my_rsvp === 'not_interested' ? 'filled' : 'light'}
          color="red"
          leftSection={<IconX size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'not_interested' }); }}
        >
          Not Interested {event.rsvp_counts?.not_interested ? `(${event.rsvp_counts.not_interested})` : ''}
        </Button>
      </Group>
    </div>
  );
}

function CalendarGrid({ events, currentMonth, onEventClick, selectedDay, onDayClick }: {
  events: ServerEvent[];
  currentMonth: string;
  onEventClick: (e: ServerEvent) => void;
  selectedDay: number | null;
  onDayClick: (day: number | null) => void;
}) {
  const [y, mo] = currentMonth.split('-').map(Number);

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(y, mo - 1, 1).getDay();
    const totalDays = new Date(y, mo, 0).getDate();

    const days: Array<{ date: number | null; events: ServerEvent[] }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: null, events: [] });
    for (let d = 1; d <= totalDays; d++) {
      const dayEvents = events.filter((e) => {
        const eDate = new Date(e.start_time);
        return eDate.getDate() === d && eDate.getMonth() === mo - 1 && eDate.getFullYear() === y;
      });
      days.push({ date: d, events: dayEvents });
    }
    return days;
  }, [y, mo, events]);

  const today = new Date();
  const numRows = Math.ceil(daysInMonth.length / 7);

  return (
    <div style={{ height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `auto repeat(${numRows}, 1fr)`, gap: 2, height: '100%' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Text key={d} size="xs" c="dimmed" ta="center" fw={600} py={4}>{d}</Text>
        ))}
        {daysInMonth.map((day, i) => {
          const isToday = day.date === today.getDate() &&
            (mo - 1) === today.getMonth() &&
            y === today.getFullYear();
          const isSelected = day.date === selectedDay;

          return (
            <div
              key={i}
              onClick={() => day.date && onDayClick(day.date)}
              style={{
                padding: 2,
                borderRadius: 4,
                background: isSelected ? 'var(--bg-active)' : isToday ? 'var(--bg-active)' : day.date ? 'var(--bg-secondary)' : 'transparent',
                border: isSelected ? '2px solid var(--accent)' : isToday ? '1px solid var(--accent)' : '1px solid transparent',
                cursor: day.date ? 'pointer' : 'default',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {day.date && (
                <>
                  <Text size="xs" c={isToday ? 'var(--accent)' : 'dimmed'} ta="right" px={2}>
                    {day.date}
                  </Text>
                  {/* Show colored dots for events instead of full labels to save space */}
                  {day.events.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', padding: '1px 2px' }}>
                      {day.events.slice(0, 4).map((evt) => (
                        <Tooltip key={evt.id} label={evt.title} position="top" withArrow openDelay={200}>
                          <div
                            onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: evt.color || 'var(--accent)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          />
                        </Tooltip>
                      ))}
                      {day.events.length > 4 && (
                        <Text size="xs" c="dimmed" style={{ fontSize: '0.5rem', lineHeight: 1 }}>
                          +{day.events.length - 4}
                        </Text>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Convert an ISO datetime string to a local datetime-local input value. */
function toLocalDateTimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Split a datetime-local value into separate date and time parts. */
function splitDateTime(datetimeLocal: string): { date: string; time: string } {
  const [date, time] = datetimeLocal.split('T');
  return { date: date || '', time: time || '' };
}

/** Combine separate date and time strings into a datetime-local value. */
function combineDateTime(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

function CreateEventModal({ serverId, opened, onClose, editEvent, textChannels, roleOptions }: {
  serverId: string;
  opened: boolean;
  onClose: () => void;
  editEvent?: ServerEvent | null;
  textChannels: Array<{ value: string; label: string }>;
  roleOptions: Array<{ value: string; label: string }>;
}) {
  const createEvent = useCreateEvent(serverId);
  const updateEvent = useUpdateEvent(serverId);
  const isEditing = !!editEvent;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  // Announcement
  const [announceAtStart, setAnnounceAtStart] = useState(false);
  const [announceChannel, setAnnounceChannel] = useState<string | null>(null);

  // Visibility
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [visibilityRoleIds, setVisibilityRoleIds] = useState<string[]>([]);

  // Pre-fill when editing
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  if (editEvent && editEvent.id !== lastEditId) {
    setTitle(editEvent.title);
    setDescription(editEvent.description || '');
    const startParts = splitDateTime(toLocalDateTimeValue(editEvent.start_time));
    setStartDate(startParts.date);
    setStartTime(startParts.time);
    if (editEvent.end_time) {
      const endParts = splitDateTime(toLocalDateTimeValue(editEvent.end_time));
      setEndDate(endParts.date);
      setEndTime(endParts.time);
    } else {
      setEndDate('');
      setEndTime('');
    }
    setLocation(editEvent.location || '');
    setVisibility(editEvent.visibility === 'role' ? 'private' : editEvent.visibility === 'public' ? 'public' : 'public');
    setVisibilityRoleIds(editEvent.visibility_role_id ? [editEvent.visibility_role_id] : []);
    setError('');
    setLastEditId(editEvent.id);
  }

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setLocation('');
    setError('');
    setLastEditId(null);
    setAnnounceAtStart(false);
    setAnnounceChannel(null);
    setVisibility('public');
    setVisibilityRoleIds([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!startDate) { setError('Start date is required'); return; }
    setError('');

    const startTimeValue = combineDateTime(startDate, startTime);
    const endTimeValue = endDate ? combineDateTime(endDate, endTime) : undefined;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: new Date(startTimeValue).toISOString(),
      end_time: endTimeValue ? new Date(endTimeValue).toISOString() : undefined,
      location: location.trim() || undefined,
      visibility: visibility === 'private' ? 'role' : 'public',
      visibility_role_ids: visibility === 'private' ? visibilityRoleIds : undefined,
      announce_at_start: announceAtStart || undefined,
      announce_channel_id: announceAtStart && announceChannel ? announceChannel : undefined,
    };

    if (isEditing) {
      updateEvent.mutate({
        eventId: editEvent.id,
        title: payload.title as string,
        description: payload.description as string | undefined,
        start_time: payload.start_time as string,
        end_time: payload.end_time as string | undefined,
        location: payload.location as string | undefined,
      }, {
        onSuccess: () => handleClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update event'),
      });
    } else {
      createEvent.mutate(payload as Parameters<typeof createEvent.mutate>[0], {
        onSuccess: () => handleClose(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create event'),
      });
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={isEditing ? 'Edit Event' : 'Create Event'} centered size="md">
      <Stack gap={12}>
        {error && <Text size="sm" c="red">{error}</Text>}
        <TextInput label="Title" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} maxLength={100} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={2} maxRows={4} />

        {/* Date / Time pickers — separate inputs for better UX */}
        <Group grow>
          <TextInput
            label="Start Date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.currentTarget.value)}
          />
          <TextInput
            label="Start Time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.currentTarget.value)}
          />
        </Group>
        <Group grow>
          <TextInput
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
          />
          <TextInput
            label="End Time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.currentTarget.value)}
          />
        </Group>

        <TextInput label="Location" placeholder="Optional" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />

        {/* Visibility */}
        <div>
          <Text size="sm" fw={500} mb={4}>Visibility</Text>
          <SegmentedControl
            size="xs"
            value={visibility}
            onChange={(v) => setVisibility(v as 'public' | 'private')}
            data={[
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' },
            ]}
            fullWidth
          />
        </div>

        {visibility === 'private' && roleOptions.length > 0 && (
          <MultiSelect
            label="Visible to Roles"
            placeholder="Select roles..."
            data={roleOptions}
            value={visibilityRoleIds}
            onChange={setVisibilityRoleIds}
            size="sm"
            searchable
          />
        )}

        {/* Announcement */}
        {!isEditing && (
          <>
            <Switch
              label="Announce at start"
              checked={announceAtStart}
              onChange={(e) => setAnnounceAtStart(e.currentTarget.checked)}
              size="sm"
            />
            {announceAtStart && textChannels.length > 0 && (
              <Select
                label="Announcement Channel"
                placeholder="Select a text channel..."
                data={textChannels}
                value={announceChannel}
                onChange={setAnnounceChannel}
                size="sm"
                searchable
              />
            )}
          </>
        )}

        <Group justify="flex-end" mt={8}>
          <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isEditing ? updateEvent.isPending : createEvent.isPending}>
            {isEditing ? 'Save Changes' : 'Create Event'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EventDetailsModal({ event, serverId, opened, onClose, onEdit }: {
  event: ServerEvent;
  serverId: string;
  opened: boolean;
  onClose: () => void;
  onEdit: (event: ServerEvent) => void;
}) {
  const rsvp = useRsvpEvent(serverId);
  const cancel = useCancelEvent(serverId);
  const deleteEvent = useDeleteEvent(serverId);
  const userCanManage = canManageEvents();
  const userCanEdit = canEditEvent(event.created_by);
  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Event',
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete &quot;{event.title}&quot;? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        deleteEvent.mutate(event.id);
        onClose();
      },
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={event.title} centered size="md">
      <Stack gap={12}>
        {event.status === 'cancelled' && (
          <Badge color="red" variant="light" size="lg">Cancelled</Badge>
        )}

        <Group gap={8}>
          <IconClock size={16} style={{ color: 'var(--text-muted)' }} />
          <div>
            <Text size="sm">{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            {endDate && <Text size="xs" c="dimmed">Until {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
          </div>
        </Group>

        {event.location && (
          <Group gap={8}>
            <IconMapPin size={16} style={{ color: 'var(--text-muted)' }} />
            <Text size="sm">{event.location}</Text>
          </Group>
        )}

        {/* Creator display (2f) */}
        {event.creator_username && (
          <Group gap={8}>
            <IconUser size={16} style={{ color: 'var(--text-muted)' }} />
            <Text size="sm" c="dimmed">Created by {event.creator_username}</Text>
          </Group>
        )}

        {event.description && (
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{event.description}</Text>
          </div>
        )}

        {/* RSVP */}
        {event.status !== 'cancelled' && (
          <>
            <Text size="sm" fw={600}>RSVP</Text>
            <Group gap={8}>
              <Button
                variant={event.my_rsvp === 'interested' ? 'filled' : 'light'}
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'interested' })}
              >
                Interested ({event.rsvp_counts?.interested || 0})
              </Button>
              <Button
                variant={event.my_rsvp === 'tentative' ? 'filled' : 'light'}
                color="yellow"
                leftSection={<IconQuestionMark size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'tentative' })}
              >
                Tentative ({event.rsvp_counts?.tentative || 0})
              </Button>
              <Button
                variant={event.my_rsvp === 'not_interested' ? 'filled' : 'light'}
                color="red"
                leftSection={<IconX size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'not_interested' })}
              >
                Not Interested ({event.rsvp_counts?.not_interested || 0})
              </Button>
            </Group>
          </>
        )}

        {/* Event actions (edit / cancel / delete) */}
        {event.status !== 'cancelled' && (userCanEdit || userCanManage) && (
          <Group justify="flex-end" mt={8} gap={8}>
            {userCanEdit && (
              <Button
                variant="light"
                size="xs"
                leftSection={<IconEdit size={14} />}
                onClick={() => onEdit(event)}
              >
                Edit Event
              </Button>
            )}
            {userCanManage && (
              <Button
                variant="light"
                color="yellow"
                size="xs"
                onClick={() => {
                  cancel.mutate(event.id);
                  onClose();
                }}
              >
                Cancel Event
              </Button>
            )}
            {userCanManage && (
              <Button
                variant="light"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
