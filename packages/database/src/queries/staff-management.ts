import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Database } from '../client.js';
import { services } from '../schema/service.js';
import { staffMembers } from '../schema/staff-member.js';
import { staffServices } from '../schema/staff-service.js';

export interface StaffAssignedService {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StaffMemberRecord {
  id: string;
  name: string;
  isActive: boolean;
  services: StaffAssignedService[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffMemberInput {
  name: string;
  serviceIds?: string[];
}

export interface UpdateStaffMemberInput {
  name: string;
  serviceIds: string[];
}

export type CreateStaffMemberResult =
  | {
      kind: 'created';
      staffMember: StaffMemberRecord;
    }
  | {
      kind: 'service_not_found';
    };

export type UpdateStaffMemberResult =
  | {
      kind: 'updated';
      staffMember: StaffMemberRecord;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'service_not_found';
    };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeServiceIds(
  serviceIds: readonly string[] | undefined,
): string[] | null {
  if (!serviceIds) {
    return [];
  }

  const normalized = new Set<string>();

  for (const serviceId of serviceIds) {
    const value = serviceId.trim();

    if (!isUuid(value)) {
      return null;
    }

    normalized.add(value);
  }

  return [...normalized];
}

function mapStaffMember(
  row: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  assignedServices: StaffAssignedService[],
): StaffMemberRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    services: assignedServices,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const staffMemberSelection = {
  id: staffMembers.id,
  name: staffMembers.name,
  isActive: staffMembers.isActive,
  createdAt: staffMembers.createdAt,
  updatedAt: staffMembers.updatedAt,
};

export async function listStaffMembersForBusiness(
  db: Database,
  businessId: string,
): Promise<StaffMemberRecord[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const rows = await db
    .select({
      staffId: staffMembers.id,
      staffName: staffMembers.name,
      staffIsActive: staffMembers.isActive,
      staffCreatedAt: staffMembers.createdAt,
      staffUpdatedAt: staffMembers.updatedAt,
      serviceId: services.id,
      serviceName: services.name,
      serviceIsActive: services.isActive,
    })
    .from(staffMembers)
    .leftJoin(
      staffServices,
      and(
        eq(staffServices.businessId, staffMembers.businessId),
        eq(staffServices.staffMemberId, staffMembers.id),
      ),
    )
    .leftJoin(
      services,
      and(
        eq(services.businessId, staffMembers.businessId),
        eq(services.id, staffServices.serviceId),
      ),
    )
    .where(eq(staffMembers.businessId, normalizedBusinessId))
    .orderBy(
      asc(staffMembers.name),
      asc(staffMembers.id),
      asc(services.name),
      asc(services.id),
    );

  const staffById = new Map<string, StaffMemberRecord>();

  for (const row of rows) {
    let staffMember = staffById.get(row.staffId);

    if (!staffMember) {
      staffMember = {
        id: row.staffId,
        name: row.staffName,
        isActive: row.staffIsActive,
        services: [],
        createdAt: row.staffCreatedAt,
        updatedAt: row.staffUpdatedAt,
      };

      staffById.set(row.staffId, staffMember);
    }

    if (
      row.serviceId !== null &&
      row.serviceName !== null &&
      row.serviceIsActive !== null
    ) {
      staffMember.services.push({
        id: row.serviceId,
        name: row.serviceName,
        isActive: row.serviceIsActive,
      });
    }
  }

  return [...staffById.values()];
}

export async function createStaffMemberForBusiness(
  db: Database,
  businessId: string,
  input: CreateStaffMemberInput,
): Promise<CreateStaffMemberResult> {
  const normalizedBusinessId = businessId.trim();
  const name = input.name.trim();
  const serviceIds = normalizeServiceIds(input.serviceIds);

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!name) {
    throw new Error('Staff member name is required.');
  }

  if (serviceIds === null) {
    return {
      kind: 'service_not_found',
    };
  }

  return db.transaction(async (transaction) => {
    const assignedServices =
      serviceIds.length === 0
        ? []
        : await transaction
            .select({
              id: services.id,
              name: services.name,
              isActive: services.isActive,
            })
            .from(services)
            .where(
              and(
                eq(services.businessId, normalizedBusinessId),
                inArray(services.id, serviceIds),
              ),
            )
            .orderBy(asc(services.name), asc(services.id));

    if (assignedServices.length !== serviceIds.length) {
      return {
        kind: 'service_not_found' as const,
      };
    }

    const [created] = await transaction
      .insert(staffMembers)
      .values({
        businessId: normalizedBusinessId,
        name,
      })
      .returning(staffMemberSelection);

    if (!created) {
      throw new Error('Staff member could not be created.');
    }

    if (serviceIds.length > 0) {
      await transaction.insert(staffServices).values(
        serviceIds.map((serviceId) => ({
          businessId: normalizedBusinessId,
          staffMemberId: created.id,
          serviceId,
        })),
      );
    }

    return {
      kind: 'created' as const,
      staffMember: mapStaffMember(created, assignedServices),
    };
  });
}

export async function updateStaffMemberForBusiness(
  db: Database,
  businessId: string,
  staffMemberId: string,
  input: UpdateStaffMemberInput,
): Promise<UpdateStaffMemberResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedStaffMemberId = staffMemberId.trim();
  const name = input.name.trim();
  const serviceIds = normalizeServiceIds(input.serviceIds);

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedStaffMemberId)) {
    return {
      kind: 'not_found',
    };
  }

  if (!name) {
    throw new Error('Staff member name is required.');
  }

  if (serviceIds === null) {
    return {
      kind: 'service_not_found',
    };
  }

  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({
        id: staffMembers.id,
      })
      .from(staffMembers)
      .where(
        and(
          eq(staffMembers.businessId, normalizedBusinessId),
          eq(staffMembers.id, normalizedStaffMemberId),
        ),
      )
      .limit(1);

    if (!existing) {
      return {
        kind: 'not_found' as const,
      };
    }

    const assignedServices =
      serviceIds.length === 0
        ? []
        : await transaction
            .select({
              id: services.id,
              name: services.name,
              isActive: services.isActive,
            })
            .from(services)
            .where(
              and(
                eq(services.businessId, normalizedBusinessId),
                inArray(services.id, serviceIds),
              ),
            )
            .orderBy(asc(services.name), asc(services.id));

    if (assignedServices.length !== serviceIds.length) {
      return {
        kind: 'service_not_found' as const,
      };
    }

    const [updated] = await transaction
      .update(staffMembers)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(staffMembers.businessId, normalizedBusinessId),
          eq(staffMembers.id, normalizedStaffMemberId),
        ),
      )
      .returning(staffMemberSelection);

    if (!updated) {
      return {
        kind: 'not_found' as const,
      };
    }

    await transaction
      .delete(staffServices)
      .where(
        and(
          eq(staffServices.businessId, normalizedBusinessId),
          eq(staffServices.staffMemberId, normalizedStaffMemberId),
        ),
      );

    if (serviceIds.length > 0) {
      await transaction.insert(staffServices).values(
        serviceIds.map((serviceId) => ({
          businessId: normalizedBusinessId,
          staffMemberId: normalizedStaffMemberId,
          serviceId,
        })),
      );
    }

    return {
      kind: 'updated' as const,
      staffMember: mapStaffMember(updated, assignedServices),
    };
  });
}

export async function setStaffMemberActiveForBusiness(
  db: Database,
  businessId: string,
  staffMemberId: string,
  isActive: boolean,
): Promise<StaffMemberRecord | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedStaffMemberId = staffMemberId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedStaffMemberId)) {
    return null;
  }

  const [updated] = await db
    .update(staffMembers)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(staffMembers.businessId, normalizedBusinessId),
        eq(staffMembers.id, normalizedStaffMemberId),
      ),
    )
    .returning(staffMemberSelection);

  if (!updated) {
    return null;
  }

  const assignedServices = await db
    .select({
      id: services.id,
      name: services.name,
      isActive: services.isActive,
    })
    .from(staffServices)
    .innerJoin(
      services,
      and(
        eq(staffServices.businessId, services.businessId),
        eq(staffServices.serviceId, services.id),
      ),
    )
    .where(
      and(
        eq(staffServices.businessId, normalizedBusinessId),
        eq(staffServices.staffMemberId, normalizedStaffMemberId),
      ),
    )
    .orderBy(asc(services.name), asc(services.id));

  return mapStaffMember(updated, assignedServices);
}
