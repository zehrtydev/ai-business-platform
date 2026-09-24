import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DatabaseStaffReader } from './database-staff-reader.js';
import { DatabaseStaffWriter } from './database-staff-writer.js';
import { StaffController } from './staff.controller.js';
import { STAFF_READER, STAFF_WRITER } from './staff.tokens.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [StaffController],
  providers: [
    DatabaseStaffReader,
    DatabaseStaffWriter,
    {
      provide: STAFF_READER,
      useExisting: DatabaseStaffReader,
    },
    {
      provide: STAFF_WRITER,
      useExisting: DatabaseStaffWriter,
    },
  ],
})
export class StaffModule {}
