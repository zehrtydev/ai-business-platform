import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { staffMembers } from './staff-member.js';

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id').notNull(),
    staffMemberId: uuid('staff_member_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId, table.staffMemberId],
      foreignColumns: [staffMembers.businessId, staffMembers.id],
      name: 'availability_rules_business_staff_fk',
    }).onDelete('cascade'),
    index('availability_rules_business_staff_day_idx').on(
      table.businessId,
      table.staffMemberId,
      table.dayOfWeek,
    ),
    check(
      'availability_rules_day_of_week_range',
      sql`${table.dayOfWeek} between 1 and 7`,
    ),
    check(
      'availability_rules_valid_time_range',
      sql`${table.startTime} < ${table.endTime}`,
    ),
  ],
).enableRLS();
