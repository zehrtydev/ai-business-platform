import { Injectable } from '@nestjs/common';
import {
  requestConversationHandoffForBusiness,
  resumeConversationAiForBusiness,
  takeOverConversationForBusiness,
  type ConversationControlMutationResult,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  InboxConversationControlMutationResult,
  InboxConversationControlWriter,
} from './inbox.types.js';

@Injectable()
export class DatabaseInboxConversationControlWriter implements InboxConversationControlWriter {
  constructor(private readonly database: DatabaseService) {}

  async requestHandoff(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationControlMutationResult> {
    const result = await requestConversationHandoffForBusiness(
      this.database.db,
      businessId,
      conversationId,
    );

    return this.mapResult(result);
  }

  async takeOver(
    businessId: string,
    conversationId: string,
    userId: string,
  ): Promise<InboxConversationControlMutationResult> {
    const result = await takeOverConversationForBusiness(
      this.database.db,
      businessId,
      conversationId,
      userId,
    );

    return this.mapResult(result);
  }

  async resumeAi(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationControlMutationResult> {
    const result = await resumeConversationAiForBusiness(
      this.database.db,
      businessId,
      conversationId,
    );

    return this.mapResult(result);
  }

  private mapResult(
    result: ConversationControlMutationResult,
  ): InboxConversationControlMutationResult {
    if (result.kind !== 'updated') {
      return result;
    }

    return {
      kind: 'updated',
      conversation: {
        ...result.conversation,
        updatedAt: result.conversation.updatedAt.toISOString(),
      },
    };
  }
}
