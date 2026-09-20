import { and, eq, like, ne } from 'drizzle-orm';

import type { Database } from '../client.js';
import { contacts } from '../schema/contact.js';
import { conversations } from '../schema/conversation.js';
import { messages } from '../schema/message.js';

export interface DevelopmentInboundMessage {
  id: string;
  conversationId: string;
  direction: 'INBOUND';
  sender: 'CONTACT';
  senderUserId: null;
  content: string;
  messageType: 'TEXT';
  providerMessageId: null;
  createdAt: Date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function createDevelopmentInboundMessageForBusiness(
  db: Database,
  businessId: string,
  conversationId: string,
  content: string,
): Promise<DevelopmentInboundMessage | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedConversationId = conversationId.trim();
  const normalizedContent = content.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedConversationId || !isUuid(normalizedConversationId)) {
    return null;
  }

  if (!normalizedContent) {
    throw new Error('Message content is required.');
  }

  if (normalizedContent.length > 4_000) {
    throw new Error('Message content must not exceed 4000 characters.');
  }

  const occurredAt = new Date();

  return db.transaction(async (transaction) => {
    const [conversation] = await transaction
      .select({
        id: conversations.id,
        contactId: conversations.contactId,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, normalizedBusinessId),
          eq(conversations.id, normalizedConversationId),
          ne(conversations.status, 'CLOSED'),
          like(conversations.channel, 'development%'),
        ),
      )
      .limit(1);

    if (!conversation) {
      return null;
    }

    const [message] = await transaction
      .insert(messages)
      .values({
        businessId: normalizedBusinessId,
        conversationId: conversation.id,
        direction: 'INBOUND',
        sender: 'CONTACT',
        content: normalizedContent,
        createdAt: occurredAt,
      })
      .returning({
        id: messages.id,
        conversationId: messages.conversationId,
        direction: messages.direction,
        sender: messages.sender,
        senderUserId: messages.senderUserId,
        content: messages.content,
        messageType: messages.messageType,
        providerMessageId: messages.providerMessageId,
        createdAt: messages.createdAt,
      });

    if (!message) {
      throw new Error('Development message could not be created.');
    }

    await transaction
      .update(conversations)
      .set({
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(conversations.businessId, normalizedBusinessId),
          eq(conversations.id, conversation.id),
        ),
      );

    await transaction
      .update(contacts)
      .set({
        lastInteractionAt: occurredAt,
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(contacts.businessId, normalizedBusinessId),
          eq(contacts.id, conversation.contactId),
        ),
      );

    return {
      ...message,
      direction: 'INBOUND',
      sender: 'CONTACT',
      senderUserId: null,
      messageType: 'TEXT',
      providerMessageId: null,
    };
  });
}
