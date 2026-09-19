import { authUsers } from 'drizzle-orm/supabase';
import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const appUsers = pgTable(
  'app_users',
  {
    id: uuid('id').primaryKey(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: 'app_users_id_auth_users_id_fk',
    }).onDelete('cascade'),
  ],
).enableRLS();
