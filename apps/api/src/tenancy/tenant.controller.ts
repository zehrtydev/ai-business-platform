import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  TenantContextGuard,
  type TenantRequest,
} from './tenant-context.guard.js';

@Controller('tenant')
export class TenantController {
  @Get('context')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  context(@Req() request: TenantRequest) {
    return request.tenantContext;
  }
}
