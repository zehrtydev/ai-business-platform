import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { services } from './service.js';
import { staffMembers } from './staff-member.js';

export const staffServices = pgTable(
  'staff_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id').notNull(),
    staffMemberId: uuid('staff_member_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.businessId, table.staffMemberId],
      foreignColumns: [staffMembers.businessId, staffMembers.id],
      name: 'staff_services_business_staff_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.businessId, table.serviceId],
      foreignColumns: [services.businessId, services.id],
      name: 'staff_services_business_service_fk',
    }).onDelete('cascade'),
    uniqueIndex('staff_services_business_staff_service_uidx').on(
      table.businessId,
      table.staffMemberId,
      table.serviceId,
    ),
    index('staff_services_business_service_idx').on(
      table.businessId,
      table.serviceId,
    ),
  ],
).enableRLS();
