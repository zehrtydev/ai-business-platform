import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { businessMemberships } from './business-membership.js';
import { businesses } from './business.js';
import { conversations } from './conversation.js';

export const messageDirection = pgEnum('message_direction', [
  'INBOUND',
  'OUTBOUND',
]);

export const messageSender = pgEnum('message_sender', [
  'CONTACT',
  'AI',
  'HUMAN',
]);

export const messageType = pgEnum('message_type', ['TEXT']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').notNull(),
    direction: messageDirection('direction').notNull(),
    sender: messageSender('sender').notNull(),
    senderUserId: uuid('sender_user_id'),
    content: text('content').notNull(),
    messageType: messageType('message_type').default('TEXT').notNull(),
    providerMessageId: text('provider_message_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId, table.conversationId],
      foreignColumns: [conversations.businessId, conversations.id],
      name: 'messages_business_conversation_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.businessId, table.senderUserId],
      foreignColumns: [
        businessMemberships.businessId,
        businessMemberships.userId,
      ],
      name: 'messages_business_sender_user_fk',
    }),
    unique('messages_business_id_id_unique').on(table.businessId, table.id),
    index('messages_business_conversation_created_idx').on(
      table.businessId,
      table.conversationId,
      table.createdAt,
    ),
    index('messages_business_sender_user_idx').on(
      table.businessId,
      table.senderUserId,
    ),
    uniqueIndex('messages_business_provider_message_uidx')
      .on(table.businessId, table.providerMessageId)
      .where(sql`${table.providerMessageId} is not null`),
    check(
      'messages_content_not_blank',
      sql`length(trim(${table.content})) > 0`,
    ),
    check(
      'messages_provider_message_id_not_blank',
      sql`${table.providerMessageId} is null or length(trim(${table.providerMessageId})) > 0`,
    ),
    check(
      'messages_direction_sender_valid',
      sql`(${table.direction} = 'INBOUND' and ${table.sender} = 'CONTACT')
        or (${table.direction} = 'OUTBOUND' and ${table.sender} in ('AI', 'HUMAN'))`,
    ),
    check(
      'messages_human_sender_user_valid',
      sql`(${table.sender} = 'HUMAN' and ${table.senderUserId} is not null)
        or (${table.sender} <> 'HUMAN' and ${table.senderUserId} is null)`,
    ),
  ],
).enableRLS();
