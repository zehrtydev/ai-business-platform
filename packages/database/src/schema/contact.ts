import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name'),
    phone: text('phone'),
    email: text('email'),
    source: text('source').notNull(),
    lastInteractionAt: timestamp('last_interaction_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('contacts_business_id_idx').on(table.businessId),
    index('contacts_business_phone_idx').on(table.businessId, table.phone),
    index('contacts_business_email_idx').on(table.businessId, table.email),
    unique('contacts_business_id_id_unique').on(table.businessId, table.id),
    check('contacts_source_not_blank', sql`length(trim(${table.source})) > 0`),
    check(
      'contacts_name_not_blank',
      sql`${table.name} is null or length(trim(${table.name})) > 0`,
    ),
    check(
      'contacts_phone_not_blank',
      sql`${table.phone} is null or length(trim(${table.phone})) > 0`,
    ),
    check(
      'contacts_email_not_blank',
      sql`${table.email} is null or length(trim(${table.email})) > 0`,
    ),
    check(
      'contacts_has_identity',
      sql`${table.name} is not null or ${table.phone} is not null or ${table.email} is not null`,
    ),
  ],
).enableRLS();
