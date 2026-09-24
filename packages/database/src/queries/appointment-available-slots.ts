import { and, asc, eq, gt, lt, sql } from 'drizzle-orm';

import type { Database } from '../client.js';
import { appointments } from '../schema/appointment.js';
import { businesses } from '../schema/business.js';
import { services } from '../schema/service.js';
import { staffMembers } from '../schema/staff-member.js';
import { staffServices } from '../schema/staff-service.js';

export interface AppointmentAvailableSlot {
  startsAt: Date;
  endsAt: Date;
}

export interface AppointmentAvailableSlots {
  timezone: string;
  date: string;
  serviceId: string;
  staffMemberId: string;
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  slots: AppointmentAvailableSlot[];
}

export type GetAppointmentAvailableSlotsResult =
  | {
      kind: 'available';
      availability: AppointmentAvailableSlots;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'configuration';
    }
  | {
      kind: 'invalid';
    };

export interface GetAppointmentAvailableSlotsInput {
  serviceId: string;
  staffMemberId: string;
  date: string;
}

interface TimeInterval {
  startsAt: Date;
  endsAt: Date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const ordered = [...intervals].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );

  const first = ordered.at(0);

  if (!first) {
    return [];
  }

  const merged: TimeInterval[] = [
    {
      startsAt: new Date(first.startsAt),
      endsAt: new Date(first.endsAt),
    },
  ];

  for (const interval of ordered.slice(1)) {
    const current = merged.at(-1);

    if (!current) {
      continue;
    }

    if (interval.startsAt.getTime() <= current.endsAt.getTime()) {
      if (interval.endsAt.getTime() > current.endsAt.getTime()) {
        current.endsAt = new Date(interval.endsAt);
      }

      continue;
    }

    merged.push({
      startsAt: new Date(interval.startsAt),
      endsAt: new Date(interval.endsAt),
    });
  }

  return merged;
}

function freeIntervals(
  window: TimeInterval,
  busyIntervals: TimeInterval[],
): TimeInterval[] {
  const result: TimeInterval[] = [];

  const windowStart = window.startsAt.getTime();
  const windowEnd = window.endsAt.getTime();

  let cursor = windowStart;

  for (const busy of busyIntervals) {
    const busyStart = Math.max(busy.startsAt.getTime(), windowStart);

    const busyEnd = Math.min(busy.endsAt.getTime(), windowEnd);

    if (busyEnd <= cursor || busyStart >= windowEnd) {
      continue;
    }

    if (busyStart > cursor) {
      result.push({
        startsAt: new Date(cursor),
        endsAt: new Date(busyStart),
      });
    }

    cursor = Math.max(cursor, busyEnd);

    if (cursor >= windowEnd) {
      break;
    }
  }

  if (cursor < windowEnd) {
    result.push({
      startsAt: new Date(cursor),
      endsAt: new Date(windowEnd),
    });
  }

  return result;
}

export async function getAppointmentAvailableSlotsForBusiness(
  db: Database,
  businessId: string,
  input: GetAppointmentAvailableSlotsInput,
): Promise<GetAppointmentAvailableSlotsResult> {
  const normalizedBusinessId = businessId.trim();
  const serviceId = input.serviceId.trim();
  const staffMemberId = input.staffMemberId.trim();
  const date = input.date.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(serviceId) || !isUuid(staffMemberId)) {
    return { kind: 'not_found' };
  }

  if (!isIsoDate(date)) {
    return { kind: 'invalid' };
  }

  const [business] = await db
    .select({
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.id, normalizedBusinessId))
    .limit(1);

  if (!business) {
    return { kind: 'not_found' };
  }

  const [service] = await db
    .select({
      id: services.id,
      durationMinutes: services.durationMinutes,
      isActive: services.isActive,
    })
    .from(services)
    .where(
      and(
        eq(services.businessId, normalizedBusinessId),
        eq(services.id, serviceId),
      ),
    )
    .limit(1);

  if (!service) {
    return { kind: 'not_found' };
  }

  const [staffMember] = await db
    .select({
      id: staffMembers.id,
      isActive: staffMembers.isActive,
    })
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.businessId, normalizedBusinessId),
        eq(staffMembers.id, staffMemberId),
      ),
    )
    .limit(1);

  if (!staffMember) {
    return { kind: 'not_found' };
  }

  if (!service.isActive || !staffMember.isActive) {
    return { kind: 'configuration' };
  }

  const [staffService] = await db
    .select({
      id: staffServices.id,
    })
    .from(staffServices)
    .where(
      and(
        eq(staffServices.businessId, normalizedBusinessId),
        eq(staffServices.staffMemberId, staffMemberId),
        eq(staffServices.serviceId, serviceId),
      ),
    )
    .limit(1);

  if (!staffService) {
    return { kind: 'configuration' };
  }

  const rawWindows = await db.execute<{
    startsAt: Date | string;
    endsAt: Date | string;
  }>(sql`
    select
      (
        ${date}::date + availability_rule.start_time
      ) at time zone ${business.timezone} as "startsAt",
      (
        ${date}::date + availability_rule.end_time
      ) at time zone ${business.timezone} as "endsAt"
    from availability_rules as availability_rule
    where
      availability_rule.business_id = ${normalizedBusinessId}
      and availability_rule.staff_member_id = ${staffMemberId}
      and availability_rule.is_active = true
      and availability_rule.day_of_week = extract(
        isodow from ${date}::date
      )
    order by
      availability_rule.start_time,
      availability_rule.end_time
  `);

  const availabilityWindows = mergeIntervals(
    rawWindows.map((window) => ({
      startsAt: toDate(window.startsAt),
      endsAt: toDate(window.endsAt),
    })),
  );

  if (availabilityWindows.length === 0) {
    return {
      kind: 'available',
      availability: {
        timezone: business.timezone,
        date,
        serviceId,
        staffMemberId,
        serviceDurationMinutes: service.durationMinutes,
        slotIntervalMinutes: service.durationMinutes,
        slots: [],
      },
    };
  }

  const firstWindow = availabilityWindows.at(0);
  const lastWindow = availabilityWindows.at(-1);

  if (!firstWindow || !lastWindow) {
    throw new Error('Availability window resolution failed.');
  }

  const busyRows = await db
    .select({
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, normalizedBusinessId),
        eq(appointments.staffMemberId, staffMemberId),
        eq(appointments.status, 'SCHEDULED'),
        lt(appointments.startsAt, lastWindow.endsAt),
        gt(appointments.endsAt, firstWindow.startsAt),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const busyIntervals: TimeInterval[] = busyRows.map((row) => ({
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }));

  const durationMs = service.durationMinutes * 60_000;
  const now = Date.now();

  const slotsByStart = new Map<string, AppointmentAvailableSlot>();

  for (const window of availabilityWindows) {
    const free = freeIntervals(window, busyIntervals);

    for (const interval of free) {
      let startsAtMs = interval.startsAt.getTime();
      const freeEndsAtMs = interval.endsAt.getTime();

      while (startsAtMs + durationMs <= freeEndsAtMs) {
        if (startsAtMs > now) {
          const startsAt = new Date(startsAtMs);
          const endsAt = new Date(startsAtMs + durationMs);

          slotsByStart.set(startsAt.toISOString(), {
            startsAt,
            endsAt,
          });
        }

        startsAtMs += durationMs;
      }
    }
  }

  const slots = Array.from(slotsByStart.values()).sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );

  return {
    kind: 'available',
    availability: {
      timezone: business.timezone,
      date,
      serviceId,
      staffMemberId,
      serviceDurationMinutes: service.durationMinutes,
      slotIntervalMinutes: service.durationMinutes,
      slots,
    },
  };
}
