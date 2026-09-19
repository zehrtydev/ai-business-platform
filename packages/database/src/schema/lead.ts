import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { contacts } from './contact.js';
import { pipelineStages } from './pipeline-stage.js';
import { services } from './service.js';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull(),
    pipelineId: uuid('pipeline_id').notNull(),
    pipelineStageId: uuid('pipeline_stage_id').notNull(),
    serviceId: uuid('service_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId, table.contactId],
      foreignColumns: [contacts.businessId, contacts.id],
      name: 'leads_business_contact_fk',
    }),
    foreignKey({
      columns: [table.businessId, table.pipelineId, table.pipelineStageId],
      foreignColumns: [
        pipelineStages.businessId,
        pipelineStages.pipelineId,
        pipelineStages.id,
      ],
      name: 'leads_business_pipeline_stage_fk',
    }),
    foreignKey({
      columns: [table.businessId, table.serviceId],
      foreignColumns: [services.businessId, services.id],
      name: 'leads_business_service_fk',
    }),
    unique('leads_business_id_id_unique').on(table.businessId, table.id),
    index('leads_business_contact_idx').on(table.businessId, table.contactId),
    index('leads_business_pipeline_stage_idx').on(
      table.businessId,
      table.pipelineId,
      table.pipelineStageId,
    ),
    index('leads_business_service_idx').on(table.businessId, table.serviceId),
  ],
).enableRLS();
