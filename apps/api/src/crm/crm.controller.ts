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
import { CRM_CONTACT_READER } from './crm.tokens.js';
import type { CrmContactReader } from './crm.types.js';

@Controller('crm')
export class CrmController {
  constructor(
    @Inject(CRM_CONTACT_READER)
    private readonly contactReader: CrmContactReader,
  ) {}

  @Get('contacts')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async contacts(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items: await this.contactReader.listContacts(businessId),
    };
  }
}
