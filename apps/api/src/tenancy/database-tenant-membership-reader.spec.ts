import type { Database } from '@ai-business-platform/database';

import type { DatabaseService } from '../database/database.service.js';
import { DatabaseTenantMembershipReader } from './database-tenant-membership-reader.js';

describe('DatabaseTenantMembershipReader', () => {
  it('maps database memberships to tenant memberships', async () => {
    const rows = [
      {
        id: 'membership-a',
        businessId: 'business-a',
        role: 'owner' as const,
      },
      {
        id: 'membership-b',
        businessId: 'business-b',
        role: 'member' as const,
      },
    ];

    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: async () => rows,
          }),
        }),
      }),
    } as unknown as Database;

    const database = {
      db,
    } as DatabaseService;

    const reader = new DatabaseTenantMembershipReader(database);

    await expect(reader.listForUser('user-a')).resolves.toEqual([
      {
        membershipId: 'membership-a',
        businessId: 'business-a',
        role: 'owner',
      },
      {
        membershipId: 'membership-b',
        businessId: 'business-b',
        role: 'member',
      },
    ]);
  });
});
