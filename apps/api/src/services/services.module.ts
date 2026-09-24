import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DatabaseServiceReader } from './database-service-reader.js';
import { DatabaseServiceWriter } from './database-service-writer.js';
import { SERVICE_READER, SERVICE_WRITER } from './services.tokens.js';
import { ServicesController } from './services.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [ServicesController],
  providers: [
    DatabaseServiceReader,
    DatabaseServiceWriter,
    {
      provide: SERVICE_READER,
      useExisting: DatabaseServiceReader,
    },
    {
      provide: SERVICE_WRITER,
      useExisting: DatabaseServiceWriter,
    },
  ],
})
export class ServicesModule {}
