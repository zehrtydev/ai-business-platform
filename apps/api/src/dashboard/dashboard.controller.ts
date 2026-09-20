import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  TenantContextGuard,
  type TenantRequest,
} from '../tenancy/tenant-context.guard.js';
import { DASHBOARD_SUMMARY_READER } from './dashboard.tokens.js';
import type { DashboardSummaryReader } from './dashboard.types.js';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DASHBOARD_SUMMARY_READER)
    private readonly summaryReader: DashboardSummaryReader,
  ) {}

  @Get('summary')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  summary(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return this.summaryReader.getSummary(businessId);
  }
}
