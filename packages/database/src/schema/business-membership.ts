import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { appUsers } from './app-user.js';
import { businesses } from './business.js';

export const businessMembershipRole = pgEnum('business_membership_role', [
  'owner',
  'admin',
  'member',
]);

export const businessMemberships = pgTable(
  'business_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    role: businessMembershipRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('business_memberships_business_user_uidx').on(
      table.businessId,
      table.userId,
    ),
    index('business_memberships_user_id_idx').on(table.userId),
  ],
).enableRLS();
