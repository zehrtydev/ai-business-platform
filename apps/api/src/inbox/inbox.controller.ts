import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  TenantContextGuard,
  type TenantRequest,
} from '../tenancy/tenant-context.guard.js';
import {
  INBOX_CONVERSATION_CONTROL_WRITER,
  INBOX_CONVERSATION_READER,
  INBOX_DEVELOPMENT_MESSAGE_WRITER,
} from './inbox.tokens.js';
import type {
  InboxConversationControlMutationResult,
  InboxConversationControlWriter,
  InboxConversationReader,
  InboxDevelopmentMessageWriter,
} from './inbox.types.js';

function parseDevelopmentMessageContent(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('Message content is required.');
  }

  const content = (body as Record<string, unknown>).content;

  if (typeof content !== 'string') {
    throw new BadRequestException('Message content is required.');
  }

  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new BadRequestException('Message content is required.');
  }

  if (normalizedContent.length > 4_000) {
    throw new BadRequestException(
      'Message content must not exceed 4000 characters.',
    );
  }

  return normalizedContent;
}

function resolveControlMutation(
  result: InboxConversationControlMutationResult,
) {
  if (result.kind === 'not_found') {
    throw new NotFoundException('Conversation not found.');
  }

  if (result.kind === 'conflict') {
    throw new ConflictException(
      'Conversation state does not allow this transition.',
    );
  }

  return {
    conversation: result.conversation,
  };
}

@Controller('inbox')
export class InboxController {
  constructor(
    @Inject(INBOX_CONVERSATION_READER)
    private readonly conversationReader: InboxConversationReader,
    @Inject(INBOX_CONVERSATION_CONTROL_WRITER)
    private readonly conversationControlWriter: InboxConversationControlWriter,
    @Inject(INBOX_DEVELOPMENT_MESSAGE_WRITER)
    private readonly developmentMessageWriter: InboxDevelopmentMessageWriter,
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

  @Get('conversations/:conversationId')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async conversation(
    @Req() request: TenantRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const conversation = await this.conversationReader.getConversation(
      businessId,
      conversationId,
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation;
  }

  @Post('conversations/:conversationId/request-handoff')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async requestHandoff(
    @Req() request: TenantRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const result = await this.conversationControlWriter.requestHandoff(
      businessId,
      conversationId,
    );

    return resolveControlMutation(result);
  }

  @Post('conversations/:conversationId/take-over')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async takeOver(
    @Req() request: TenantRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const businessId = request.tenantContext?.businessId;
    const userId = request.tenantContext?.userId;

    if (!businessId || !userId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const result = await this.conversationControlWriter.takeOver(
      businessId,
      conversationId,
      userId,
    );

    return resolveControlMutation(result);
  }

  @Post('conversations/:conversationId/resume-ai')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async resumeAi(
    @Req() request: TenantRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const result = await this.conversationControlWriter.resumeAi(
      businessId,
      conversationId,
    );

    return resolveControlMutation(result);
  }

  @Post('conversations/:conversationId/development/messages')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async createDevelopmentMessage(
    @Req() request: TenantRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const content = parseDevelopmentMessageContent(body);

    const message = await this.developmentMessageWriter.createInboundMessage(
      businessId,
      conversationId,
      content,
    );

    if (!message) {
      throw new NotFoundException('Development conversation is not available.');
    }

    return {
      message,
    };
  }
}
