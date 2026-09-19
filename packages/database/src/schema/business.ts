import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check('businesses_name_not_blank', sql`length(trim(${table.name})) > 0`),
  ],
).enableRLS();
