import { asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { businessMemberships } from '../schema/business-membership.js';

export async function listBusinessMembershipsForUser(
  db: Database,
  userId: string,
) {
  return db
    .select({
      id: businessMemberships.id,
      businessId: businessMemberships.businessId,
      role: businessMemberships.role,
    })
    .from(businessMemberships)
    .where(eq(businessMemberships.userId, userId))
    .orderBy(asc(businessMemberships.businessId));
}
