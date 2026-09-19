import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { pipelines } from './pipeline.js';

export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id').notNull(),
    pipelineId: uuid('pipeline_id').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
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
      columns: [table.businessId, table.pipelineId],
      foreignColumns: [pipelines.businessId, pipelines.id],
      name: 'pipeline_stages_business_pipeline_fk',
    }).onDelete('cascade'),
    unique('pipeline_stages_business_pipeline_id_unique').on(
      table.businessId,
      table.pipelineId,
      table.id,
    ),
    unique('pipeline_stages_business_pipeline_position_unique').on(
      table.businessId,
      table.pipelineId,
      table.position,
    ),
    check(
      'pipeline_stages_name_not_blank',
      sql`length(trim(${table.name})) > 0`,
    ),
    check('pipeline_stages_position_positive', sql`${table.position} > 0`),
  ],
).enableRLS();
