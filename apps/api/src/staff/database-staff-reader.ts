import { Injectable } from '@nestjs/common';
import {
  listStaffMembersForBusiness,
  type StaffMemberRecord,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type { StaffMemberItem, StaffReader } from './staff.types.js';

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
export class DatabaseStaffReader implements StaffReader {
  constructor(private readonly database: DatabaseService) {}

  async listStaffMembers(businessId: string): Promise<StaffMemberItem[]> {
    const staffMembers = await listStaffMembersForBusiness(
      this.database.db,
      businessId,
    );

    return staffMembers.map(mapStaffMember);
  }
}
