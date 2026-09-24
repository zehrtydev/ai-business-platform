import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { availabilityRules } from '../schema/availability-rule.js';
import { businesses } from '../schema/business.js';
import { services } from '../schema/service.js';
import { staffMembers } from '../schema/staff-member.js';
import { staffServices } from '../schema/staff-service.js';

export interface AppointmentSchedulingAvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AppointmentSchedulingStaffMember {
  id: string;
  name: string;
  availability: AppointmentSchedulingAvailabilityRule[];
}

export interface AppointmentSchedulingService {
  id: string;
  name: string;
  durationMinutes: number;
  staffMembers: AppointmentSchedulingStaffMember[];
}

export interface AppointmentSchedulingOptions {
  timezone: string;
  services: AppointmentSchedulingService[];
}

export async function getAppointmentSchedulingOptionsForBusiness(
  db: Database,
  businessId: string,
): Promise<AppointmentSchedulingOptions | null> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const [business] = await db
    .select({
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.id, normalizedBusinessId))
    .limit(1);

  if (!business) {
    return null;
  }

  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(
      and(
        eq(services.businessId, normalizedBusinessId),
        eq(services.isActive, true),
      ),
    )
    .orderBy(asc(services.name), asc(services.id));

  if (serviceRows.length === 0) {
    return {
      timezone: business.timezone,
      services: [],
    };
  }

  const staffRows = await db
    .select({
      serviceId: staffServices.serviceId,
      staffMemberId: staffMembers.id,
      staffMemberName: staffMembers.name,
    })
    .from(staffServices)
    .innerJoin(
      staffMembers,
      and(
        eq(staffServices.businessId, staffMembers.businessId),
        eq(staffServices.staffMemberId, staffMembers.id),
      ),
    )
    .where(
      and(
        eq(staffServices.businessId, normalizedBusinessId),
        eq(staffMembers.isActive, true),
      ),
    )
    .orderBy(asc(staffMembers.name), asc(staffMembers.id));

  const availabilityRows = await db
    .select({
      staffMemberId: availabilityRules.staffMemberId,
      dayOfWeek: availabilityRules.dayOfWeek,
      startTime: availabilityRules.startTime,
      endTime: availabilityRules.endTime,
    })
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.businessId, normalizedBusinessId),
        eq(availabilityRules.isActive, true),
      ),
    )
    .orderBy(
      asc(availabilityRules.staffMemberId),
      asc(availabilityRules.dayOfWeek),
      asc(availabilityRules.startTime),
      asc(availabilityRules.endTime),
    );

  const availabilityByStaffId = new Map<
    string,
    AppointmentSchedulingAvailabilityRule[]
  >();

  for (const rule of availabilityRows) {
    const current = availabilityByStaffId.get(rule.staffMemberId) ?? [];

    current.push({
      dayOfWeek: rule.dayOfWeek,
      startTime: rule.startTime,
      endTime: rule.endTime,
    });

    availabilityByStaffId.set(rule.staffMemberId, current);
  }

  const staffByServiceId = new Map<
    string,
    AppointmentSchedulingStaffMember[]
  >();

  for (const row of staffRows) {
    const current = staffByServiceId.get(row.serviceId) ?? [];

    current.push({
      id: row.staffMemberId,
      name: row.staffMemberName,
      availability: availabilityByStaffId.get(row.staffMemberId) ?? [],
    });

    staffByServiceId.set(row.serviceId, current);
  }

  return {
    timezone: business.timezone,
    services: serviceRows.map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      staffMembers: staffByServiceId.get(service.id) ?? [],
    })),
  };
}
