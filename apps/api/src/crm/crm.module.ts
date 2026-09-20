import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CrmController } from './crm.controller.js';
import { CRM_CONTACT_READER } from './crm.tokens.js';
import { DatabaseCrmContactReader } from './database-crm-contact-reader.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [CrmController],
  providers: [
    DatabaseCrmContactReader,
    {
      provide: CRM_CONTACT_READER,
      useExisting: DatabaseCrmContactReader,
    },
  ],
})
export class CrmModule {}
