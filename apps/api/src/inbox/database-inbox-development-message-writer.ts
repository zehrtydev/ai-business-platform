import { Injectable } from '@nestjs/common';
import { createDevelopmentInboundMessageForBusiness } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  InboxConversationMessage,
  InboxDevelopmentMessageWriter,
} from './inbox.types.js';

@Injectable()
export class DatabaseInboxDevelopmentMessageWriter implements InboxDevelopmentMessageWriter {
  constructor(private readonly database: DatabaseService) {}

  async createInboundMessage(
    businessId: string,
    conversationId: string,
    content: string,
  ): Promise<InboxConversationMessage | null> {
    const message = await createDevelopmentInboundMessageForBusiness(
      this.database.db,
      businessId,
      conversationId,
      content,
    );

    if (!message) {
      return null;
    }

    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
