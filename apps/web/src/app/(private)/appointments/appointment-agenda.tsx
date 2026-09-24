import type { AppointmentListItem } from '../../../lib/api/appointment-list';
import { updateAppointmentStatusAction } from './actions';

interface AppointmentSummaryProps {
  appointments: AppointmentListItem[];
}

interface AppointmentAgendaProps {
  appointments: AppointmentListItem[];
  timezone: string;
}

function contactName(contact: AppointmentListItem['contact']): string {
  return contact.name ?? contact.phone ?? contact.email ?? 'Unnamed contact';
}

function contactIdentity(contact: AppointmentListItem['contact']): string {
  return contact.phone ?? contact.email ?? 'No contact detail';
}

function statusLabel(status: AppointmentListItem['status']): string {
  switch (status) {
    case 'SCHEDULED':
      return 'Scheduled';
    case 'CANCELLED':
      return 'Cancelled';
    case 'COMPLETED':
      return 'Completed';
    case 'NO_SHOW':
      return 'No show';
  }
}

function formatTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDay(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(value));
}

function localDateKey(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

function groupAppointmentsByDay(
  appointments: AppointmentListItem[],
  timezone: string,
): Array<{
  key: string;
  appointments: AppointmentListItem[];
}> {
  const groups = new Map<string, AppointmentListItem[]>();

  for (const appointment of appointments) {
    const key = localDateKey(appointment.startsAt, timezone);
    const existing = groups.get(key) ?? [];

    existing.push(appointment);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, items]) => ({
      key,
      appointments: items,
    }));
}

function AppointmentLifecycleControls({
  appointment,
}: {
  appointment: AppointmentListItem;
}) {
  return (
    <div className="appointment-row__lifecycle">
      <span
        className={`appointment-status appointment-status--${appointment.status.toLowerCase()}`}
      >
        {statusLabel(appointment.status)}
      </span>

      {appointment.status === 'SCHEDULED' ? (
        <div
          className="appointment-row__actions"
          aria-label="Appointment actions"
        >
          <form action={updateAppointmentStatusAction}>
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <input type="hidden" name="status" value="COMPLETED" />
            <button type="submit">Complete</button>
          </form>

          <form action={updateAppointmentStatusAction}>
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <input type="hidden" name="status" value="NO_SHOW" />
            <button type="submit">No show</button>
          </form>

          <form action={updateAppointmentStatusAction}>
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <button className="appointment-action--cancel" type="submit">
              Cancel
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function AppointmentSummary({ appointments }: AppointmentSummaryProps) {
  const scheduled = appointments.filter(
    (appointment) => appointment.status === 'SCHEDULED',
  ).length;

  const completed = appointments.filter(
    (appointment) => appointment.status === 'COMPLETED',
  ).length;

  const cancelled = appointments.filter(
    (appointment) => appointment.status === 'CANCELLED',
  ).length;

  const noShow = appointments.filter(
    (appointment) => appointment.status === 'NO_SHOW',
  ).length;

  const items = [
    {
      label: 'Scheduled',
      value: scheduled,
    },
    {
      label: 'Completed',
      value: completed,
    },
    {
      label: 'Cancelled',
      value: cancelled,
    },
    {
      label: 'No show',
      value: noShow,
    },
  ];

  return (
    <section className="appointment-summary" aria-label="Appointment summary">
      {items.map((item) => (
        <article className="appointment-summary__card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}

export function AppointmentAgenda({
  appointments,
  timezone,
}: AppointmentAgendaProps) {
  if (appointments.length === 0) {
    return (
      <section className="empty-state">
        <div className="empty-state__mark" aria-hidden="true">
          A
        </div>

        <div>
          <h2>No appointments yet</h2>
          <p>
            Scheduled customer appointments will appear here when bookings are
            created.
          </p>
        </div>
      </section>
    );
  }

  const groups = groupAppointmentsByDay(appointments, timezone);

  return (
    <section
      className="appointment-agenda"
      aria-labelledby="appointment-list-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Scheduled activity</p>
          <h2 id="appointment-list-heading">Appointment agenda</h2>
        </div>

        <p>Times are shown in {timezone}.</p>
      </div>

      <div className="appointment-agenda__days">
        {groups.map((group) => {
          const firstAppointment = group.appointments[0];

          if (!firstAppointment) {
            return null;
          }

          return (
            <section className="appointment-day" key={group.key}>
              <header className="appointment-day__header">
                <h3>{formatDay(firstAppointment.startsAt, timezone)}</h3>

                <span>
                  {group.appointments.length}{' '}
                  {group.appointments.length === 1
                    ? 'appointment'
                    : 'appointments'}
                </span>
              </header>

              <div className="appointment-list">
                {group.appointments.map((appointment) => (
                  <article className="appointment-row" key={appointment.id}>
                    <div className="appointment-row__time">
                      <strong>
                        {formatTime(appointment.startsAt, timezone)}
                        {'–'}
                        {formatTime(appointment.endsAt, timezone)}
                      </strong>

                      <span>{appointment.service.durationMinutes} min</span>
                    </div>

                    <div className="appointment-row__contact">
                      <strong>{contactName(appointment.contact)}</strong>
                      <span>{contactIdentity(appointment.contact)}</span>
                    </div>

                    <div className="appointment-row__service">
                      <strong>{appointment.service.name}</strong>
                      <span>{appointment.staffMember.name}</span>
                    </div>

                    <AppointmentLifecycleControls appointment={appointment} />
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
