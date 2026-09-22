'use client';

import { useEffect, useState } from 'react';

import type { AppointmentAvailableSlot } from '../../../lib/api/appointment-available-slots';
import type {
  AppointmentSchedulingAvailabilityRule,
  AppointmentSchedulingService,
} from '../../../lib/api/appointment-scheduling-options';
import type { ContactListItem } from '../../../lib/api/contact-list';
import {
  createAppointmentAction,
  getAppointmentAvailableSlotsAction,
} from './actions';

interface AppointmentCreateFormProps {
  contacts: ContactListItem[];
  services: AppointmentSchedulingService[];
  timezone: string;
  minimumDate: string;
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

function contactLabel(contact: ContactListItem): string {
  const identity = contact.phone ?? contact.email;

  if (contact.name && identity) {
    return `${contact.name} — ${identity}`;
  }

  return contact.name ?? identity ?? 'Unnamed contact';
}

function timeLabel(value: string): string {
  return value.slice(0, 5);
}

function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Day ${day}`;
}

function dayRangeLabel(days: number[]): string {
  const orderedDays = [...new Set(days)].sort((a, b) => a - b);
  const firstDay = orderedDays.at(0);

  if (firstDay === undefined) {
    return '';
  }

  const ranges: string[] = [];
  let rangeStart = firstDay;
  let previousDay = firstDay;

  for (const day of orderedDays.slice(1)) {
    if (day === previousDay + 1) {
      previousDay = day;
      continue;
    }

    ranges.push(
      rangeStart === previousDay
        ? dayLabel(rangeStart)
        : `${dayLabel(rangeStart)}–${dayLabel(previousDay)}`,
    );

    rangeStart = day;
    previousDay = day;
  }

  ranges.push(
    rangeStart === previousDay
      ? dayLabel(rangeStart)
      : `${dayLabel(rangeStart)}–${dayLabel(previousDay)}`,
  );

  return ranges.join(', ');
}

function availabilitySummary(
  rules: AppointmentSchedulingAvailabilityRule[],
): string {
  if (rules.length === 0) {
    return 'No working hours configured.';
  }

  const daysByTimeRange = new Map<string, number[]>();

  for (const rule of rules) {
    const key = `${rule.startTime}|${rule.endTime}`;
    const days = daysByTimeRange.get(key) ?? [];

    days.push(rule.dayOfWeek);
    daysByTimeRange.set(key, days);
  }

  const groups = Array.from(daysByTimeRange.entries()).map(
    ([key, days]) => {
      const [startTime = '', endTime = ''] = key.split('|');

      return {
        days,
        startTime,
        endTime,
      };
    },
  );

  groups.sort((left, right) => {
    const leftFirstDay = Math.min(...left.days);
    const rightFirstDay = Math.min(...right.days);

    return (
      leftFirstDay - rightFirstDay ||
      left.startTime.localeCompare(right.startTime)
    );
  });

  return groups
    .map(
      (group) =>
        `${dayRangeLabel(group.days)} · ${timeLabel(
          group.startTime,
        )}–${timeLabel(group.endTime)}`,
    )
    .join('; ');
}

function slotLabel(
  slot: AppointmentAvailableSlot,
  timezone: string,
): string {
  const formatter = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });

  return `${formatter.format(new Date(slot.startsAt))}–${formatter.format(
    new Date(slot.endsAt),
  )}`;
}

export function AppointmentCreateForm({
  contacts,
  services,
  timezone,
  minimumDate,
}: AppointmentCreateFormProps) {
  const [serviceId, setServiceId] = useState('');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [date, setDate] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [slots, setSlots] = useState<AppointmentAvailableSlot[]>([]);
  const [slotState, setSlotState] = useState<
    'idle' | 'loading' | 'ready' | 'empty' | 'error'
  >('idle');

  const selectedService =
    services.find((service) => service.id === serviceId) ?? null;

  const availableStaff = selectedService?.staffMembers ?? [];

  const selectedStaff =
    availableStaff.find(
      (staffMember) => staffMember.id === staffMemberId,
    ) ?? null;

  const hasConfiguration = contacts.length > 0 && services.length > 0;

  useEffect(() => {
    let cancelled = false;

    if (!serviceId || !staffMemberId || !date) {
      return () => {
        cancelled = true;
      };
    }

    void getAppointmentAvailableSlotsAction({
      serviceId,
      staffMemberId,
      date,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.kind !== 'success') {
          setSlots([]);
          setSlotState('error');
          return;
        }

        setSlots(result.availability.slots);
        setSlotState(
          result.availability.slots.length > 0 ? 'ready' : 'empty',
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSlots([]);
        setSlotState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [serviceId, staffMemberId, date]);

  return (
    <form
      action={createAppointmentAction}
      className="appointment-create-form"
    >
      <div className="appointment-create-grid">
        <label className="appointment-create-field">
          <span>Customer</span>

          <select name="contactId" required disabled={contacts.length === 0}>
            <option value="">Select customer</option>

            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contactLabel(contact)}
              </option>
            ))}
          </select>
        </label>

        <label className="appointment-create-field">
          <span>Service</span>

          <select
            name="serviceId"
            value={serviceId}
            required
            disabled={services.length === 0}
            onChange={(event) => {
              setServiceId(event.target.value);
              setStaffMemberId('');
              setDate('');
              setStartsAt('');
              setSlots([]);
              setSlotState('idle');
            }}
          >
            <option value="">Select service</option>

            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — {service.durationMinutes} min
              </option>
            ))}
          </select>
        </label>

        <label className="appointment-create-field">
          <span>Staff member</span>

          <select
            name="staffMemberId"
            value={staffMemberId}
            required
            disabled={!selectedService || availableStaff.length === 0}
            onChange={(event) => {
              setStaffMemberId(event.target.value);
              setDate('');
              setStartsAt('');
              setSlots([]);
              setSlotState('idle');
            }}
          >
            <option value="">
              {selectedService && availableStaff.length === 0
                ? 'No available staff'
                : 'Select staff member'}
            </option>

            {availableStaff.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
              </option>
            ))}
          </select>

          {selectedStaff ? (
            <small>
              Working hours:{' '}
              {availabilitySummary(selectedStaff.availability)}
            </small>
          ) : null}
        </label>

        <label className="appointment-create-field">
          <span>Date</span>

          <input
            type="date"
            name="date"
            value={date}
            min={minimumDate}
            required
            disabled={!selectedStaff}
            onChange={(event) => {
              const nextDate = event.target.value;

              setDate(nextDate);
              setStartsAt('');
              setSlots([]);
              setSlotState(nextDate ? 'loading' : 'idle');
            }}
          />
        </label>

        <label className="appointment-create-field">
          <span>Available time</span>

          <select
            name="startsAt"
            value={startsAt}
            required
            disabled={
              !date ||
              slotState === 'loading' ||
              slotState === 'empty' ||
              slotState === 'error'
            }
            onChange={(event) => setStartsAt(event.target.value)}
          >
            <option value="">
              {slotState === 'loading'
                ? 'Loading available times…'
                : slotState === 'empty'
                  ? 'No available times'
                  : slotState === 'error'
                    ? 'Availability unavailable'
                    : 'Select available time'}
            </option>

            {slots.map((slot) => (
              <option key={slot.startsAt} value={slot.startsAt}>
                {slotLabel(slot, timezone)}
              </option>
            ))}
          </select>

          <small aria-live="polite">
            {slotState === 'empty'
              ? 'Choose another date.'
              : slotState === 'error'
                ? 'Could not load availability. Try another selection.'
                : slotState === 'ready'
                  ? `${slots.length} available ${
                      slots.length === 1 ? 'time' : 'times'
                    }.`
                  : ''}
          </small>
        </label>
      </div>

      <div className="appointment-create-form__footer">
        <p>
          Times are shown in <strong>{timezone}</strong>.
        </p>

        <button
          type="submit"
          disabled={
            !hasConfiguration ||
            !serviceId ||
            !staffMemberId ||
            !date ||
            !startsAt ||
            slotState !== 'ready'
          }
        >
          Schedule appointment
        </button>
      </div>
    </form>
  );
}
