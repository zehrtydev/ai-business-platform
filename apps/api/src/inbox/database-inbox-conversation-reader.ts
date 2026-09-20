import { Injectable } from '@nestjs/common';
import {
  getConversationDetailForBusiness,
  listConversationsForBusiness,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  InboxConversationDetail,
  InboxConversationListItem,
  InboxConversationReader,
} from './inbox.types.js';

@Injectable()
export class DatabaseInboxConversationReader implements InboxConversationReader {
  constructor(private readonly database: DatabaseService) {}

  async listConversations(
    businessId: string,
  ): Promise<InboxConversationListItem[]> {
    const conversations = await listConversationsForBusiness(
      this.database.db,
      businessId,
    );

    return conversations.map((conversation) => ({
      id: conversation.id,
      contact: conversation.contact,
      channel: conversation.channel,
      status: conversation.status,
      assignedToUserId: conversation.assignedToUserId,
      aiEnabled: conversation.aiEnabled,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      latestMessage: conversation.latestMessage
        ? {
            ...conversation.latestMessage,
            createdAt: conversation.latestMessage.createdAt.toISOString(),
          }
        : null,
    }));
  }

  async getConversation(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationDetail | null> {
    const conversation = await getConversationDetailForBusiness(
      this.database.db,
      businessId,
      conversationId,
    );

    if (!conversation) {
      return null;
    }

    return {
      id: conversation.id,
      contact: conversation.contact,
      channel: conversation.channel,
      status: conversation.status,
      assignedToUserId: conversation.assignedToUserId,
      aiEnabled: conversation.aiEnabled,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }
}
