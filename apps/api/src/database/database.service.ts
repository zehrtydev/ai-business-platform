import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabase, type Database } from '@ai-business-platform/database';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly db: Database;

  private readonly client: ReturnType<typeof createDatabase>['client'];

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();

    if (!connectionString) {
      throw new Error('DATABASE_URL is required.');
    }

    const database = createDatabase(connectionString);

    this.client = database.client;
    this.db = database.db;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
