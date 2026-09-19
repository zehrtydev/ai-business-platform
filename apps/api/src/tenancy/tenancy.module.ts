import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { DatabaseTenantMembershipReader } from './database-tenant-membership-reader.js';
import { TenantController } from './tenant.controller.js';
import { TenantContextGuard } from './tenant-context.guard.js';
import { TenantResolver } from './tenant-resolver.js';
import { TENANT_MEMBERSHIP_READER } from './tenancy.tokens.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TenantController],
  providers: [
    {
      provide: TENANT_MEMBERSHIP_READER,
      useClass: DatabaseTenantMembershipReader,
    },
    TenantResolver,
    TenantContextGuard,
  ],
  exports: [TenantResolver, TenantContextGuard],
})
export class TenancyModule {}
