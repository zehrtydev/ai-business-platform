import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export function createDatabase(connectionString: string) {
  const normalizedConnectionString = connectionString.trim();

  if (!normalizedConnectionString) {
    throw new Error('Database connection string is required.');
  }

  const client = postgres(normalizedConnectionString);
  const db = drizzle(client, { schema });

  return {
    client,
    db,
  };
}
