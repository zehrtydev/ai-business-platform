import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businessMemberships } from './business-membership.js';
import { businesses } from './business.js';
import { contacts } from './contact.js';

export const conversationStatus = pgEnum('conversation_status', [
  'OPEN',
  'HUMAN_REQUIRED',
  'CLOSED',
]);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull(),
    channel: text('channel').notNull(),
    status: conversationStatus('status').default('OPEN').notNull(),
    assignedToUserId: uuid('assigned_to_user_id'),
    aiEnabled: boolean('ai_enabled').default(true).notNull(),
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
      name: 'conversations_business_contact_fk',
    }),
    foreignKey({
      columns: [table.businessId, table.assignedToUserId],
      foreignColumns: [
        businessMemberships.businessId,
        businessMemberships.userId,
      ],
      name: 'conversations_business_assignee_fk',
    }),
    unique('conversations_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    index('conversations_business_status_updated_idx').on(
      table.businessId,
      table.status,
      table.updatedAt,
    ),
    index('conversations_business_contact_updated_idx').on(
      table.businessId,
      table.contactId,
      table.updatedAt,
    ),
    index('conversations_business_assignee_idx').on(
      table.businessId,
      table.assignedToUserId,
    ),
    check(
      'conversations_channel_not_blank',
      sql`length(trim(${table.channel})) > 0`,
    ),
    check(
      'conversations_ai_state_valid',
      sql`${table.status} = 'OPEN' or ${table.aiEnabled} = false`,
    ),
  ],
).enableRLS();
