import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    priceMinorUnits: integer('price_minor_units'),
    currencyCode: text('currency_code'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('services_business_id_idx').on(table.businessId),
    unique('services_business_id_id_unique').on(table.businessId, table.id),
    check('services_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check(
      'services_duration_minutes_positive',
      sql`${table.durationMinutes} > 0`,
    ),
    check(
      'services_price_minor_units_non_negative',
      sql`${table.priceMinorUnits} is null or ${table.priceMinorUnits} >= 0`,
    ),
    check(
      'services_price_currency_consistent',
      sql`(
        (${table.priceMinorUnits} is null and ${table.currencyCode} is null)
        or
        (
          ${table.priceMinorUnits} is not null
          and ${table.currencyCode} is not null
          and ${table.currencyCode} ~ '^[A-Z]{3}$'
        )
      )`,
    ),
  ],
).enableRLS();
