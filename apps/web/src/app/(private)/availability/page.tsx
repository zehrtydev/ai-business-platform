import { redirect } from 'next/navigation';

import {
  getAvailabilityRuleList,
  type AvailabilityRuleItem,
} from '../../../lib/api/availability-rule-management';
import {
  getStaffList,
  type StaffMemberItem,
} from '../../../lib/api/staff-management';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';
import {
  createAvailabilityRuleAction,
  setAvailabilityRuleActiveAction,
  updateAvailabilityRuleAction,
} from './actions';

interface AvailabilityPageProps {
  searchParams: Promise<{
    create?: string | string[];
    update?: string | string[];
    status?: string | string[];
    active?: string | string[];
  }>;
}

const DAYS = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 7, label: 'Sunday', shortLabel: 'Sun' },
] as const;

function dayLabel(dayOfWeek: number): string {
  return DAYS.find((day) => day.value === dayOfWeek)?.label ?? 'Unknown day';
}

function timeInputValue(value: string): string {
  return value.slice(0, 5);
}

function timeLabel(value: string): string {
  const [hoursValue = '0', minutes = '00'] = value.split(':');
  const hours = Number(hoursValue);

  if (!Number.isInteger(hours)) {
    return value;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
}

function mutationNotice(
  createStatus: string | null,
  updateStatus: string | null,
  availabilityStatus: string | null,
  active: string | null,
): {
  tone: 'success' | 'error';
  message: string;
} | null {
  if (createStatus === 'success') {
    return {
      tone: 'success',
      message: 'Availability block created successfully.',
    };
  }

  if (createStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the availability details before creating the block.',
    };
  }

  if (createStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The selected staff member could not be found.',
    };
  }

  if (updateStatus === 'success') {
    return {
      tone: 'success',
      message: 'Availability block updated successfully.',
    };
  }

  if (updateStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'Check the availability details before saving changes.',
    };
  }

  if (updateStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The availability block or staff member could not be found.',
    };
  }

  if (availabilityStatus === 'success') {
    return {
      tone: 'success',
      message:
        active === 'true'
          ? 'Availability block activated successfully.'
          : 'Availability block deactivated successfully.',
    };
  }

  if (availabilityStatus === 'invalid') {
    return {
      tone: 'error',
      message: 'The requested availability status is invalid.',
    };
  }

  if (availabilityStatus === 'not_found') {
    return {
      tone: 'error',
      message: 'The availability block could not be found.',
    };
  }

  return null;
}

function StaffOptions({ staffMembers }: { staffMembers: StaffMemberItem[] }) {
  return staffMembers.map((staffMember) => (
    <option
      key={staffMember.id}
      value={staffMember.id}
      disabled={!staffMember.isActive}
    >
      {staffMember.name}
      {!staffMember.isActive ? ' — inactive' : ''}
    </option>
  ));
}

function AvailabilityRuleEditor({
  availabilityRule,
  staffMembers,
}: {
  availabilityRule: AvailabilityRuleItem;
  staffMembers: StaffMemberItem[];
}) {
  return (
    <details className="service-editor">
      <summary>Edit block</summary>

      <form action={updateAvailabilityRuleAction} className="service-form">
        <input
          type="hidden"
          name="availabilityRuleId"
          value={availabilityRule.id}
        />

        <div className="availability-form-grid">
          <label className="availability-field">
            <span>Staff member</span>
            <select
              name="staffMemberId"
              defaultValue={availabilityRule.staffMemberId}
              required
            >
              <StaffOptions staffMembers={staffMembers} />
            </select>
          </label>

          <label className="availability-field">
            <span>Day</span>
            <select
              name="dayOfWeek"
              defaultValue={availabilityRule.dayOfWeek}
              required
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="availability-field">
            <span>Start</span>
            <input
              type="time"
              name="startTime"
              defaultValue={timeInputValue(availabilityRule.startTime)}
              required
            />
          </label>

          <label className="availability-field">
            <span>End</span>
            <input
              type="time"
              name="endTime"
              defaultValue={timeInputValue(availabilityRule.endTime)}
              required
            />
          </label>
        </div>

        <div className="service-form__footer">
          <p>
            Multiple blocks can exist on the same day. Overlapping active blocks
            are combined by the scheduling engine.
          </p>

          <button type="submit">Save changes</button>
        </div>
      </form>
    </details>
  );
}

export default async function AvailabilityPage({
  searchParams,
}: AvailabilityPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let availabilityRules: AvailabilityRuleItem[];
  let staffMembers: StaffMemberItem[];

  try {
    const [availabilityResponse, staffResponse] = await Promise.all([
      getAvailabilityRuleList(accessToken),
      getStaffList(accessToken),
    ]);

    availabilityRules = availabilityResponse.items;
    staffMembers = staffResponse.items;
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const params = await searchParams;

  const createStatus = typeof params.create === 'string' ? params.create : null;
  const updateStatus = typeof params.update === 'string' ? params.update : null;
  const availabilityStatus =
    typeof params.status === 'string' ? params.status : null;
  const active = typeof params.active === 'string' ? params.active : null;

  const notice = mutationNotice(
    createStatus,
    updateStatus,
    availabilityStatus,
    active,
  );

  const activeRules = availabilityRules.filter(
    (availabilityRule) => availabilityRule.isActive,
  ).length;

  const staffWithRules = new Set(
    availabilityRules.map((availabilityRule) => availabilityRule.staffMemberId),
  ).size;

  const configuredDays = new Set(
    availabilityRules
      .filter((availabilityRule) => availabilityRule.isActive)
      .map(
        (availabilityRule) =>
          `${availabilityRule.staffMemberId}:${availabilityRule.dayOfWeek}`,
      ),
  ).size;

  const activeStaffMembers = staffMembers.filter(
    (staffMember) => staffMember.isActive,
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Business configuration</p>
          <h1>Availability</h1>
          <p className="page-header__description">
            Configure the recurring working hours the scheduling engine uses to
            generate appointment slots for each staff member.
          </p>
        </div>

        <span className="count-pill">
          {availabilityRules.length}{' '}
          {availabilityRules.length === 1 ? 'block' : 'blocks'}
        </span>
      </header>

      <section className="service-summary" aria-label="Availability summary">
        <article className="service-summary__card">
          <span>Total blocks</span>
          <strong>{availabilityRules.length}</strong>
        </article>

        <article className="service-summary__card">
          <span>Active blocks</span>
          <strong>{activeRules}</strong>
        </article>

        <article className="service-summary__card">
          <span>Staff configured</span>
          <strong>{staffWithRules}</strong>
        </article>

        <article className="service-summary__card">
          <span>Working days</span>
          <strong>{configuredDays}</strong>
        </article>
      </section>

      {notice ? (
        <p
          className={`service-notice service-notice--${notice.tone}`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      <section
        className="service-management-panel"
        aria-labelledby="availability-create-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Working hours</p>
            <h2 id="availability-create-heading">Add availability block</h2>
          </div>

          <p>
            Add separate blocks when a working day has a break, for example
            08:00–12:00 and 14:00–18:00.
          </p>
        </div>

        {activeStaffMembers.length === 0 ? (
          <div className="availability-empty-inline">
            <strong>No active staff available</strong>
            <p>Create or activate a staff member before adding availability.</p>
          </div>
        ) : (
          <form action={createAvailabilityRuleAction} className="service-form">
            <div className="availability-form-grid">
              <label className="availability-field">
                <span>Staff member</span>
                <select name="staffMemberId" required defaultValue="">
                  <option value="" disabled>
                    Select staff
                  </option>

                  <StaffOptions staffMembers={activeStaffMembers} />
                </select>
              </label>

              <label className="availability-field">
                <span>Day</span>
                <select name="dayOfWeek" defaultValue={1} required>
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="availability-field">
                <span>Start</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue="08:00"
                  required
                />
              </label>

              <label className="availability-field">
                <span>End</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue="17:00"
                  required
                />
              </label>
            </div>

            <div className="service-form__footer">
              <p>
                Times are interpreted in the business timezone when slots are
                generated.
              </p>

              <button type="submit">Add availability</button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="availability-list-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Configured schedules</p>
            <h2 id="availability-list-heading">Weekly availability</h2>
          </div>

          <p>
            Inactive blocks remain stored but are ignored by the scheduling
            engine.
          </p>
        </div>

        {staffMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__mark" aria-hidden="true">
              A
            </div>

            <div>
              <h2>No staff yet</h2>
              <p>Create a staff member before configuring working hours.</p>
            </div>
          </div>
        ) : (
          <div className="availability-staff-list">
            {staffMembers.map((staffMember) => {
              const staffRules = availabilityRules.filter(
                (availabilityRule) =>
                  availabilityRule.staffMemberId === staffMember.id,
              );

              const activeStaffRules = staffRules.filter(
                (availabilityRule) => availabilityRule.isActive,
              ).length;

              return (
                <article
                  className="availability-staff-card"
                  key={staffMember.id}
                >
                  <header className="availability-staff-card__header">
                    <div>
                      <div className="service-card__title">
                        <h3>{staffMember.name}</h3>

                        <span
                          className={`service-state ${
                            staffMember.isActive
                              ? 'service-state--active'
                              : 'service-state--inactive'
                          }`}
                        >
                          {staffMember.isActive
                            ? 'Active staff'
                            : 'Inactive staff'}
                        </span>
                      </div>

                      <p>
                        {staffRules.length === 0
                          ? 'No recurring availability configured.'
                          : `${activeStaffRules} of ${staffRules.length} blocks active.`}
                      </p>
                    </div>

                    <div className="staff-card__metric">
                      <strong>{staffRules.length}</strong>
                      <span>blocks</span>
                    </div>
                  </header>

                  <div className="availability-week">
                    {DAYS.map((day) => {
                      const dayRules = staffRules.filter(
                        (availabilityRule) =>
                          availabilityRule.dayOfWeek === day.value,
                      );

                      return (
                        <section className="availability-day" key={day.value}>
                          <header className="availability-day__header">
                            <div>
                              <span>{day.shortLabel}</span>
                              <strong>{day.label}</strong>
                            </div>

                            <small>
                              {dayRules.length === 0
                                ? 'Unavailable'
                                : `${dayRules.length} ${
                                    dayRules.length === 1 ? 'block' : 'blocks'
                                  }`}
                            </small>
                          </header>

                          {dayRules.length === 0 ? (
                            <div className="availability-day__empty">—</div>
                          ) : (
                            <div className="availability-day__blocks">
                              {dayRules.map((availabilityRule) => (
                                <article
                                  className={`availability-block${
                                    availabilityRule.isActive
                                      ? ''
                                      : ' availability-block--inactive'
                                  }`}
                                  key={availabilityRule.id}
                                >
                                  <div className="availability-block__heading">
                                    <div>
                                      <strong>
                                        {timeLabel(availabilityRule.startTime)}
                                      </strong>
                                      <span>to</span>
                                      <strong>
                                        {timeLabel(availabilityRule.endTime)}
                                      </strong>
                                    </div>

                                    <span
                                      className={`service-state ${
                                        availabilityRule.isActive
                                          ? 'service-state--active'
                                          : 'service-state--inactive'
                                      }`}
                                    >
                                      {availabilityRule.isActive
                                        ? 'Active'
                                        : 'Inactive'}
                                    </span>
                                  </div>

                                  <AvailabilityRuleEditor
                                    availabilityRule={availabilityRule}
                                    staffMembers={staffMembers}
                                  />

                                  <div className="availability-block__footer">
                                    <span>
                                      {dayLabel(availabilityRule.dayOfWeek)}
                                    </span>

                                    <form
                                      action={setAvailabilityRuleActiveAction}
                                    >
                                      <input
                                        type="hidden"
                                        name="availabilityRuleId"
                                        value={availabilityRule.id}
                                      />
                                      <input
                                        type="hidden"
                                        name="isActive"
                                        value={
                                          availabilityRule.isActive
                                            ? 'false'
                                            : 'true'
                                        }
                                      />

                                      <button
                                        className={
                                          availabilityRule.isActive
                                            ? 'service-status-action service-status-action--deactivate'
                                            : 'service-status-action'
                                        }
                                        type="submit"
                                      >
                                        {availabilityRule.isActive
                                          ? 'Deactivate'
                                          : 'Activate'}
                                      </button>
                                    </form>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
