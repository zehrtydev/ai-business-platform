import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { DatabaseTenantMembershipReader } from './database-tenant-membership-reader.js';
import { TenantContextGuard } from './tenant-context.guard.js';
import { TenantResolver } from './tenant-resolver.js';
import { TENANT_MEMBERSHIP_READER } from './tenancy.tokens.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    DatabaseTenantMembershipReader,
    {
      provide: TENANT_MEMBERSHIP_READER,
      useExisting: DatabaseTenantMembershipReader,
    },
    TenantResolver,
    TenantContextGuard,
  ],
  exports: [TenantResolver, TenantContextGuard],
})
export class TenancyModule {}
