import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CrmModule } from './crm/crm.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [
    AuthModule,
    CrmModule,
    DashboardModule,
    HealthModule,
    TenancyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
