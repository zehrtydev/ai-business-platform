import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';

export const staffMembers = pgTable(
  'staff_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('staff_members_business_id_idx').on(table.businessId),
    unique('staff_members_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    check('staff_members_name_not_blank', sql`length(trim(${table.name})) > 0`),
  ],
).enableRLS();
