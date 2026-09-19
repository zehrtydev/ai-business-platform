import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { businesses } from './business.js';
import { contacts } from './contact.js';
import { services } from './service.js';
import { staffMembers } from './staff-member.js';

export const appointmentStatus = pgEnum('appointment_status', [
  'SCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    staffMemberId: uuid('staff_member_id').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: appointmentStatus('status').default('SCHEDULED').notNull(),
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
      name: 'appointments_business_contact_fk',
    }),
    foreignKey({
      columns: [table.businessId, table.serviceId],
      foreignColumns: [services.businessId, services.id],
      name: 'appointments_business_service_fk',
    }),
    foreignKey({
      columns: [table.businessId, table.staffMemberId],
      foreignColumns: [staffMembers.businessId, staffMembers.id],
      name: 'appointments_business_staff_fk',
    }),
    unique('appointments_business_id_id_unique').on(table.businessId, table.id),
    index('appointments_business_start_idx').on(
      table.businessId,
      table.startsAt,
    ),
    index('appointments_business_staff_start_idx').on(
      table.businessId,
      table.staffMemberId,
      table.startsAt,
    ),
    index('appointments_business_contact_start_idx').on(
      table.businessId,
      table.contactId,
      table.startsAt,
    ),
    index('appointments_business_service_idx').on(
      table.businessId,
      table.serviceId,
    ),
    check(
      'appointments_valid_time_range',
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  ],
).enableRLS();
