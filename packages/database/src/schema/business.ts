import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check('businesses_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check(
      'businesses_timezone_not_blank',
      sql`length(trim(${table.timezone})) > 0`,
    ),
  ],
).enableRLS();
