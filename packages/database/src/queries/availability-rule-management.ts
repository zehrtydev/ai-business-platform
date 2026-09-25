import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { availabilityRules } from '../schema/availability-rule.js';
import { staffMembers } from '../schema/staff-member.js';

export interface AvailabilityRuleRecord {
  id: string;
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityRuleMutationInput {
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type CreateAvailabilityRuleResult =
  | {
      kind: 'created';
      availabilityRule: AvailabilityRuleRecord;
    }
  | {
      kind: 'staff_not_found';
    };

export type UpdateAvailabilityRuleResult =
  | {
      kind: 'updated';
      availabilityRule: AvailabilityRuleRecord;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'staff_not_found';
    };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeDayOfWeek(dayOfWeek: number): number {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('Availability day of week must be an integer from 1 to 7.');
  }

  return dayOfWeek;
}

function normalizeTime(value: string): string {
  const normalized = value.trim();

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(normalized);

  if (!match) {
    throw new Error('Availability time must use HH:MM or HH:MM:SS format.');
  }

  const [, hours, minutes, seconds = '00'] = match;

  return `${hours}:${minutes}:${seconds}`;
}

function normalizeInput(input: AvailabilityRuleMutationInput) {
  const staffMemberId = input.staffMemberId.trim();

  if (!isUuid(staffMemberId)) {
    return null;
  }

  const dayOfWeek = normalizeDayOfWeek(input.dayOfWeek);
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);

  if (startTime >= endTime) {
    throw new Error('Availability start time must be before end time.');
  }

  return {
    staffMemberId,
    dayOfWeek,
    startTime,
    endTime,
  };
}

const availabilityRuleSelection = {
  id: availabilityRules.id,
  staffMemberId: availabilityRules.staffMemberId,
  dayOfWeek: availabilityRules.dayOfWeek,
  startTime: availabilityRules.startTime,
  endTime: availabilityRules.endTime,
  isActive: availabilityRules.isActive,
  createdAt: availabilityRules.createdAt,
  updatedAt: availabilityRules.updatedAt,
};

async function staffMemberExists(
  db: Database,
  businessId: string,
  staffMemberId: string,
): Promise<boolean> {
  const [staffMember] = await db
    .select({
      id: staffMembers.id,
    })
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.businessId, businessId),
        eq(staffMembers.id, staffMemberId),
      ),
    )
    .limit(1);

  return Boolean(staffMember);
}

export async function listAvailabilityRulesForBusiness(
  db: Database,
  businessId: string,
): Promise<AvailabilityRuleRecord[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  return db
    .select(availabilityRuleSelection)
    .from(availabilityRules)
    .where(eq(availabilityRules.businessId, normalizedBusinessId))
    .orderBy(
      asc(availabilityRules.staffMemberId),
      asc(availabilityRules.dayOfWeek),
      asc(availabilityRules.startTime),
      asc(availabilityRules.id),
    );
}

export async function createAvailabilityRuleForBusiness(
  db: Database,
  businessId: string,
  input: AvailabilityRuleMutationInput,
): Promise<CreateAvailabilityRuleResult> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const normalized = normalizeInput(input);

  if (
    !normalized ||
    !(await staffMemberExists(
      db,
      normalizedBusinessId,
      normalized.staffMemberId,
    ))
  ) {
    return {
      kind: 'staff_not_found',
    };
  }

  const [created] = await db
    .insert(availabilityRules)
    .values({
      businessId: normalizedBusinessId,
      staffMemberId: normalized.staffMemberId,
      dayOfWeek: normalized.dayOfWeek,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
    })
    .returning(availabilityRuleSelection);

  if (!created) {
    throw new Error('Availability rule could not be created.');
  }

  return {
    kind: 'created',
    availabilityRule: created,
  };
}

export async function updateAvailabilityRuleForBusiness(
  db: Database,
  businessId: string,
  availabilityRuleId: string,
  input: AvailabilityRuleMutationInput,
): Promise<UpdateAvailabilityRuleResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedAvailabilityRuleId = availabilityRuleId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedAvailabilityRuleId)) {
    return {
      kind: 'not_found',
    };
  }

  const normalized = normalizeInput(input);

  if (
    !normalized ||
    !(await staffMemberExists(
      db,
      normalizedBusinessId,
      normalized.staffMemberId,
    ))
  ) {
    return {
      kind: 'staff_not_found',
    };
  }

  const [updated] = await db
    .update(availabilityRules)
    .set({
      staffMemberId: normalized.staffMemberId,
      dayOfWeek: normalized.dayOfWeek,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(availabilityRules.businessId, normalizedBusinessId),
        eq(availabilityRules.id, normalizedAvailabilityRuleId),
      ),
    )
    .returning(availabilityRuleSelection);

  if (!updated) {
    return {
      kind: 'not_found',
    };
  }

  return {
    kind: 'updated',
    availabilityRule: updated,
  };
}

export async function setAvailabilityRuleActiveForBusiness(
  db: Database,
  businessId: string,
  availabilityRuleId: string,
  isActive: boolean,
): Promise<AvailabilityRuleRecord | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedAvailabilityRuleId = availabilityRuleId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedAvailabilityRuleId)) {
    return null;
  }

  const [updated] = await db
    .update(availabilityRules)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(availabilityRules.businessId, normalizedBusinessId),
        eq(availabilityRules.id, normalizedAvailabilityRuleId),
      ),
    )
    .returning(availabilityRuleSelection);

  return updated ?? null;
}
