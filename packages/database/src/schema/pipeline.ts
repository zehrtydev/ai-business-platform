import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';

export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('pipelines_business_id_idx').on(table.businessId),
    unique('pipelines_business_id_id_unique').on(table.businessId, table.id),
    uniqueIndex('pipelines_business_name_uidx').on(
      table.businessId,
      table.name,
    ),
    uniqueIndex('pipelines_one_default_per_business_uidx')
      .on(table.businessId)
      .where(sql`${table.isDefault} = true`),
    check('pipelines_name_not_blank', sql`length(trim(${table.name})) > 0`),
  ],
).enableRLS();
