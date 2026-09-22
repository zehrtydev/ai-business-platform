import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../client.js';
import { appointments } from '../schema/appointment.js';
import { availabilityRules } from '../schema/availability-rule.js';
import { businesses } from '../schema/business.js';
import { contacts } from '../schema/contact.js';
import { services } from '../schema/service.js';
import { staffMembers } from '../schema/staff-member.js';
import { staffServices } from '../schema/staff-service.js';

export interface CreatedAppointment {
  id: string;
  contactId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  status: 'SCHEDULED';
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentConflictReason =
  | 'past'
  | 'unavailable_day'
  | 'outside_hours'
  | 'overlap'
  | 'configuration';

export type CreateAppointmentResult =
  | {
      kind: 'created';
      appointment: CreatedAppointment;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'conflict';
      reason: AppointmentConflictReason;
    };

export interface CreateAppointmentInput {
  contactId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: Date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isPostgresErrorWithCode(
  error: unknown,
  code: string,
): boolean {
  let current: unknown = error;

  while (typeof current === 'object' && current !== null) {
    if (
      'code' in current &&
      (current as { code?: unknown }).code === code
    ) {
      return true;
    }

    if ('cause' in current) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }

    break;
  }

  return false;
}

export async function createAppointmentForBusiness(
  db: Database,
  businessId: string,
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const normalizedBusinessId = businessId.trim();
  const contactId = input.contactId.trim();
  const serviceId = input.serviceId.trim();
  const staffMemberId = input.staffMemberId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (
    !isUuid(contactId) ||
    !isUuid(serviceId) ||
    !isUuid(staffMemberId)
  ) {
    return { kind: 'not_found' };
  }

  if (Number.isNaN(input.startsAt.getTime())) {
    throw new Error('Appointment start time is invalid.');
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

  const [contact] = await db
    .select({
      id: contacts.id,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.businessId, normalizedBusinessId),
        eq(contacts.id, contactId),
      ),
    )
    .limit(1);

  if (!contact) {
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
    return {
      kind: 'conflict',
      reason: 'configuration',
    };
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
    return {
      kind: 'conflict',
      reason: 'configuration',
    };
  }

  const endsAt = new Date(
    input.startsAt.getTime() + service.durationMinutes * 60_000,
  );

  if (input.startsAt.getTime() <= Date.now()) {
    return {
      kind: 'conflict',
      reason: 'past',
    };
  }

  const startsAtIso = input.startsAt.toISOString();
  const endsAtIso = endsAt.toISOString();

  const localDayRules = await db
    .select({
      id: availabilityRules.id,
    })
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.businessId, normalizedBusinessId),
        eq(availabilityRules.staffMemberId, staffMemberId),
        eq(availabilityRules.isActive, true),
        sql`${availabilityRules.dayOfWeek} = extract(
          isodow from (
            ${startsAtIso}::timestamptz
            at time zone ${business.timezone}
          )
        )`,
      ),
    );

  if (localDayRules.length === 0) {
    return {
      kind: 'conflict',
      reason: 'unavailable_day',
    };
  }

  const [availabilityRule] = await db
    .select({
      id: availabilityRules.id,
    })
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.businessId, normalizedBusinessId),
        eq(availabilityRules.staffMemberId, staffMemberId),
        eq(availabilityRules.isActive, true),
        sql`${availabilityRules.dayOfWeek} = extract(
          isodow from (
            ${startsAtIso}::timestamptz
            at time zone ${business.timezone}
          )
        )`,
        sql`(
          ${startsAtIso}::timestamptz
          at time zone ${business.timezone}
        )::date = (
          ${endsAtIso}::timestamptz
          at time zone ${business.timezone}
        )::date`,
        sql`${availabilityRules.startTime} <= (
          ${startsAtIso}::timestamptz
          at time zone ${business.timezone}
        )::time`,
        sql`${availabilityRules.endTime} >= (
          ${endsAtIso}::timestamptz
          at time zone ${business.timezone}
        )::time`,
      ),
    )
    .limit(1);

  if (!availabilityRule) {
    return {
      kind: 'conflict',
      reason: 'outside_hours',
    };
  }

  try {
    const [appointment] = await db
      .insert(appointments)
      .values({
        businessId: normalizedBusinessId,
        contactId,
        serviceId,
        staffMemberId,
        startsAt: input.startsAt,
        endsAt,
        status: 'SCHEDULED',
      })
      .returning({
        id: appointments.id,
        contactId: appointments.contactId,
        serviceId: appointments.serviceId,
        staffMemberId: appointments.staffMemberId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      });

    if (!appointment) {
      throw new Error('Appointment insert returned no row.');
    }

    return {
      kind: 'created',
      appointment: {
        ...appointment,
        status: 'SCHEDULED',
      },
    };
  } catch (error) {
    // exclusion_violation:
    // appointments_no_staff_overlap_excl
    if (isPostgresErrorWithCode(error, '23P01')) {
      return {
        kind: 'conflict',
        reason: 'overlap',
      };
    }

    throw error;
  }
}
