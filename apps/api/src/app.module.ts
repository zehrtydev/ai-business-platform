import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CrmModule } from './crm/crm.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { InboxModule } from './inbox/inbox.module.js';
import { ServicesModule } from './services/services.module.js';
import { StaffModule } from './staff/staff.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [
    AppointmentsModule,
    AuthModule,
    CrmModule,
    DashboardModule,
    HealthModule,
    InboxModule,
    ServicesModule,
    StaffModule,
    TenancyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
