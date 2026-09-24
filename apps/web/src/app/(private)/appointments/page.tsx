import { redirect } from 'next/navigation';

import { getAppointmentList } from '../../../lib/api/appointment-list';
import { getAppointmentSchedulingOptions } from '../../../lib/api/appointment-scheduling-options';
import { getContactList } from '../../../lib/api/contact-list';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';
import { AppointmentAgenda, AppointmentSummary } from './appointment-agenda';
import { AppointmentCreateForm } from './appointment-create-form';

interface AppointmentsPageProps {
  searchParams: Promise<{
    create?: string | string[];
    reason?: string | string[];
    update?: string | string[];
    appointmentStatus?: string | string[];
    currentStatus?: string | string[];
  }>;
}

function creationNotice(
  status: string | null,
  reason: string | null,
): string | null {
  if (status === 'success') {
    return 'Appointment scheduled successfully.';
  }

  if (status === 'unavailable') {
    return 'The selected customer, service or staff configuration is no longer available.';
  }

  if (status === 'invalid') {
    return 'Check the appointment details and enter a valid date and time.';
  }

  if (status !== 'conflict') {
    return null;
  }

  switch (reason) {
    case 'past':
      return 'The appointment cannot be scheduled in the past.';
    case 'unavailable_day':
      return 'The selected staff member is not available on that day.';
    case 'outside_hours':
      return 'The appointment falls outside the selected staff member’s working hours.';
    case 'overlap':
      return 'The selected staff member already has another appointment during that time.';
    case 'configuration':
      return 'The selected staff member is not currently configured for that service.';
    default:
      return 'The appointment cannot be scheduled at the requested time.';
  }
}

function lifecycleStatusLabel(status: string | null): string {
  switch (status) {
    case 'CANCELLED':
      return 'cancelled';
    case 'COMPLETED':
      return 'completed';
    case 'NO_SHOW':
      return 'marked as no-show';
    case 'SCHEDULED':
      return 'scheduled';
    default:
      return 'updated';
  }
}

function lifecycleNotice(
  update: string | null,
  appointmentStatus: string | null,
  currentStatus: string | null,
): string | null {
  if (update === 'success') {
    return `Appointment ${lifecycleStatusLabel(appointmentStatus)} successfully.`;
  }

  if (update === 'invalid') {
    return 'The requested appointment status change is invalid.';
  }

  if (update === 'not_found') {
    return 'The appointment could not be found.';
  }

  if (update === 'conflict') {
    return `This appointment is already ${lifecycleStatusLabel(
      currentStatus,
    )} and cannot change lifecycle status again.`;
  }

  return null;
}

function currentDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Could not determine the current business date.');
  }

  return `${year}-${month}-${day}`;
}

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let appointments;
  let contacts;
  let schedulingOptions;

  try {
    const [appointmentResponse, contactResponse, optionsResponse] =
      await Promise.all([
        getAppointmentList(accessToken),
        getContactList(accessToken),
        getAppointmentSchedulingOptions(accessToken),
      ]);

    appointments = appointmentResponse.items;
    contacts = contactResponse.items;
    schedulingOptions = optionsResponse;
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const params = await searchParams;

  const createStatus = typeof params.create === 'string' ? params.create : null;

  const createReason = typeof params.reason === 'string' ? params.reason : null;

  const notice = creationNotice(createStatus, createReason);

  const updateStatus = typeof params.update === 'string' ? params.update : null;

  const appointmentStatus =
    typeof params.appointmentStatus === 'string'
      ? params.appointmentStatus
      : null;

  const currentStatus =
    typeof params.currentStatus === 'string' ? params.currentStatus : null;

  const updateNotice = lifecycleNotice(
    updateStatus,
    appointmentStatus,
    currentStatus,
  );

  const minimumDate = currentDateInTimezone(schedulingOptions.timezone);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scheduling</p>
          <h1>Appointments</h1>
          <p className="page-header__description">
            Schedule customer activity and review assigned staff and appointment
            status.
          </p>
        </div>

        <span className="count-pill">
          {appointments.length}{' '}
          {appointments.length === 1 ? 'appointment' : 'appointments'}
        </span>
      </header>

      <AppointmentSummary appointments={appointments} />

      {updateNotice ? (
        <p
          className={`appointment-lifecycle-notice appointment-lifecycle-notice--${updateStatus}`}
          role="status"
        >
          {updateNotice}
        </p>
      ) : null}

      <section
        className="appointment-create-panel"
        aria-labelledby="appointment-create-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Manual booking</p>
            <h2 id="appointment-create-heading">Schedule appointment</h2>
          </div>

          <p>Business timezone: {schedulingOptions.timezone}</p>
        </div>

        {notice ? (
          <p
            className={`appointment-create-notice appointment-create-notice--${createStatus}`}
          >
            {notice}
          </p>
        ) : null}

        <AppointmentCreateForm
          contacts={contacts}
          services={schedulingOptions.services}
          timezone={schedulingOptions.timezone}
          minimumDate={minimumDate}
        />
      </section>

      <AppointmentAgenda
        appointments={appointments}
        timezone={schedulingOptions.timezone}
      />
    </div>
  );
}
