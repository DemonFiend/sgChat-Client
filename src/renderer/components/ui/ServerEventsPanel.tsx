import { useState, useMemo } from 'react';
import { ActionIcon, Badge, Button, Group, Modal, ScrollArea, SegmentedControl, Stack, Text, Textarea, TextInput, Tooltip } from '@mantine/core';
import { IconCalendar, IconCalendarPlus, IconCheck, IconClock, IconMapPin, IconQuestionMark, IconX } from '@tabler/icons-react';
import { useServerEvents, useCreateEvent, useRsvpEvent, useCancelEvent, type ServerEvent } from '../../hooks/useEvents';
import { hasPermission } from '../../stores/permissions';

interface ServerEventsPanelProps {
  serverId: string;
}

export function ServerEventsPanel({ serverId }: ServerEventsPanelProps) {
  const { data: events, isLoading } = useServerEvents(serverId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ServerEvent | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const canManage = hasPermission('manage_server');

  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => e.status === 'scheduled' || e.status === 'active')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events]);

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
          <Text fw={600} size="sm">Server Events</Text>
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
          {canManage && (
            <Tooltip label="Create Event" position="bottom" withArrow>
              <ActionIcon variant="light" size={28} onClick={() => setCreateOpen(true)}>
                <IconCalendarPlus size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </div>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={6} type="hover">
        <div style={{ padding: 16 }}>
          {isLoading && <Text size="sm" c="dimmed" ta="center" py={32}>Loading events...</Text>}

          {!isLoading && upcomingEvents.length === 0 && (
            <Stack align="center" py={40} gap={8}>
              <IconCalendar size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <Text size="sm" c="dimmed">No upcoming events</Text>
              {canManage && (
                <Button size="xs" variant="light" leftSection={<IconCalendarPlus size={14} />} onClick={() => setCreateOpen(true)}>
                  Create Event
                </Button>
              )}
            </Stack>
          )}

          {viewMode === 'list' && (
            <Stack gap={8}>
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} serverId={serverId} onSelect={() => setSelectedEvent(event)} />
              ))}
            </Stack>
          )}

          {viewMode === 'calendar' && (
            <CalendarGrid events={upcomingEvents} onEventClick={setSelectedEvent} />
          )}
        </div>
      </ScrollArea>

      {/* Create Event Modal */}
      <CreateEventModal serverId={serverId} opened={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          serverId={serverId}
          opened={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
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

      {/* RSVP buttons */}
      <Group gap={4}>
        <Button
          size="xs"
          variant={event.my_rsvp === 'going' ? 'filled' : 'light'}
          color="green"
          leftSection={<IconCheck size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'going' }); }}
        >
          Going {event.rsvp_count?.going ? `(${event.rsvp_count.going})` : ''}
        </Button>
        <Button
          size="xs"
          variant={event.my_rsvp === 'maybe' ? 'filled' : 'light'}
          color="yellow"
          leftSection={<IconQuestionMark size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'maybe' }); }}
        >
          Maybe {event.rsvp_count?.maybe ? `(${event.rsvp_count.maybe})` : ''}
        </Button>
        <Button
          size="xs"
          variant={event.my_rsvp === 'declined' ? 'filled' : 'light'}
          color="red"
          leftSection={<IconX size={12} />}
          onClick={(e) => { e.stopPropagation(); rsvp.mutate({ eventId: event.id, status: 'declined' }); }}
        >
          Decline {event.rsvp_count?.declined ? `(${event.rsvp_count.declined})` : ''}
        </Button>
      </Group>
    </div>
  );
}

function CalendarGrid({ events, onEventClick }: { events: ServerEvent[]; onEventClick: (e: ServerEvent) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: number | null; events: ServerEvent[] }> = [];
    // Pad start
    for (let i = 0; i < firstDay; i++) days.push({ date: null, events: [] });
    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      const dayEvents = events.filter((e) => {
        const eDate = new Date(e.start_time);
        return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
      });
      days.push({ date: d, events: dayEvents });
    }
    return days;
  }, [currentMonth, events]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  return (
    <div>
      <Group justify="space-between" mb={12}>
        <Button size="xs" variant="subtle" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}>
          &lt;
        </Button>
        <Text size="sm" fw={600}>{monthLabel}</Text>
        <Button size="xs" variant="subtle" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}>
          &gt;
        </Button>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Text key={d} size="xs" c="dimmed" ta="center" fw={600} py={4}>{d}</Text>
        ))}
        {daysInMonth.map((day, i) => {
          const isToday = day.date === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();

          return (
            <div
              key={i}
              style={{
                minHeight: 48,
                padding: 2,
                borderRadius: 4,
                background: isToday ? 'var(--bg-active)' : day.date ? 'var(--bg-secondary)' : 'transparent',
                border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              {day.date && (
                <>
                  <Text size="xs" c={isToday ? 'var(--accent)' : 'dimmed'} ta="right" px={2}>
                    {day.date}
                  </Text>
                  {day.events.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => onEventClick(evt)}
                      style={{
                        fontSize: '0.6rem',
                        padding: '1px 3px',
                        borderRadius: 2,
                        background: evt.color || 'var(--accent)',
                        color: '#fff',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}
                    >
                      {evt.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateEventModal({ serverId, opened, onClose }: { serverId: string; opened: boolean; onClose: () => void }) {
  const createEvent = useCreateEvent(serverId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!startTime) { setError('Start time is required'); return; }
    setError('');
    createEvent.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : undefined,
      location: location.trim() || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setTitle('');
        setDescription('');
        setStartTime('');
        setEndTime('');
        setLocation('');
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create event'),
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Event" centered>
      <Stack gap={12}>
        {error && <Text size="sm" c="red">{error}</Text>}
        <TextInput label="Title" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} maxLength={100} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} autosize minRows={2} maxRows={4} />
        <TextInput label="Start Time" type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />
        <TextInput label="End Time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.currentTarget.value)} />
        <TextInput label="Location" placeholder="Optional" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
        <Group justify="flex-end" mt={8}>
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} loading={createEvent.isPending}>Create Event</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EventDetailsModal({ event, serverId, opened, onClose }: { event: ServerEvent; serverId: string; opened: boolean; onClose: () => void }) {
  const rsvp = useRsvpEvent(serverId);
  const cancel = useCancelEvent(serverId);
  const canManage = hasPermission('manage_server');
  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

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
                variant={event.my_rsvp === 'going' ? 'filled' : 'light'}
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'going' })}
              >
                Going ({event.rsvp_count?.going || 0})
              </Button>
              <Button
                variant={event.my_rsvp === 'maybe' ? 'filled' : 'light'}
                color="yellow"
                leftSection={<IconQuestionMark size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'maybe' })}
              >
                Maybe ({event.rsvp_count?.maybe || 0})
              </Button>
              <Button
                variant={event.my_rsvp === 'declined' ? 'filled' : 'light'}
                color="red"
                leftSection={<IconX size={14} />}
                onClick={() => rsvp.mutate({ eventId: event.id, status: 'declined' })}
              >
                Decline ({event.rsvp_count?.declined || 0})
              </Button>
            </Group>
          </>
        )}

        {/* Admin actions */}
        {canManage && event.status !== 'cancelled' && (
          <Group justify="flex-end" mt={8}>
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={() => {
                cancel.mutate(event.id);
                onClose();
              }}
            >
              Cancel Event
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
