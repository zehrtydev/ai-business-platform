import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DASHBOARD_SUMMARY_READER } from './dashboard.tokens.js';
import { DatabaseDashboardSummaryReader } from './database-dashboard-summary-reader.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [DashboardController],
  providers: [
    DatabaseDashboardSummaryReader,
    {
      provide: DASHBOARD_SUMMARY_READER,
      useExisting: DatabaseDashboardSummaryReader,
    },
  ],
})
export class DashboardModule {}
