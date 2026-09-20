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
import { INBOX_CONVERSATION_READER } from './inbox.tokens.js';
import type { InboxConversationReader } from './inbox.types.js';

@Controller('inbox')
export class InboxController {
  constructor(
    @Inject(INBOX_CONVERSATION_READER)
    private readonly conversationReader: InboxConversationReader,
  ) {}

  @Get('conversations')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async conversations(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items: await this.conversationReader.listConversations(businessId),
    };
  }
}
