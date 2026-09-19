import { Injectable } from '@nestjs/common';
import { listBusinessMembershipsForUser } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  TenantMembership,
  TenantMembershipReader,
} from './tenant-resolver.js';

@Injectable()
export class DatabaseTenantMembershipReader implements TenantMembershipReader {
  constructor(private readonly database: DatabaseService) {}

  async listForUser(userId: string): Promise<readonly TenantMembership[]> {
    const memberships = await listBusinessMembershipsForUser(
      this.database.db,
      userId,
    );

    return memberships.map((membership) => ({
      membershipId: membership.id,
      businessId: membership.businessId,
      role: membership.role,
    }));
  }
}
