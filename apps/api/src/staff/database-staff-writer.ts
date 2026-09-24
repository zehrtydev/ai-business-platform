import { Injectable } from '@nestjs/common';
import {
  createStaffMemberForBusiness,
  setStaffMemberActiveForBusiness,
  updateStaffMemberForBusiness,
  type StaffMemberRecord,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  StaffCreateResult,
  StaffMemberItem,
  StaffMutationInput,
  StaffUpdateResult,
  StaffWriter,
} from './staff.types.js';

function mapStaffMember(staffMember: StaffMemberRecord): StaffMemberItem {
  return {
    id: staffMember.id,
    name: staffMember.name,
    isActive: staffMember.isActive,
    services: staffMember.services,
    createdAt: staffMember.createdAt.toISOString(),
    updatedAt: staffMember.updatedAt.toISOString(),
  };
}

@Injectable()
export class DatabaseStaffWriter implements StaffWriter {
  constructor(private readonly database: DatabaseService) {}

  async createStaffMember(
    businessId: string,
    input: StaffMutationInput,
  ): Promise<StaffCreateResult> {
    const result = await createStaffMemberForBusiness(
      this.database.db,
      businessId,
      input,
    );

    if (result.kind === 'service_not_found') {
      return result;
    }

    return {
      kind: 'created',
      staffMember: mapStaffMember(result.staffMember),
    };
  }

  async updateStaffMember(
    businessId: string,
    staffMemberId: string,
    input: StaffMutationInput,
  ): Promise<StaffUpdateResult> {
    const result = await updateStaffMemberForBusiness(
      this.database.db,
      businessId,
      staffMemberId,
      input,
    );

    if (result.kind !== 'updated') {
      return result;
    }

    return {
      kind: 'updated',
      staffMember: mapStaffMember(result.staffMember),
    };
  }

  async setStaffMemberActive(
    businessId: string,
    staffMemberId: string,
    isActive: boolean,
  ): Promise<StaffMemberItem | null> {
    const staffMember = await setStaffMemberActiveForBusiness(
      this.database.db,
      businessId,
      staffMemberId,
      isActive,
    );

    return staffMember ? mapStaffMember(staffMember) : null;
  }
}
