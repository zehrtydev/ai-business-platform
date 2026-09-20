import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Database } from '../client.js';
import { contacts } from '../schema/contact.js';
import { conversations } from '../schema/conversation.js';
import { messages } from '../schema/message.js';

export interface ConversationListMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  sender: 'CONTACT' | 'AI' | 'HUMAN';
  content: string;
  createdAt: Date;
}

export interface ConversationListItem {
  id: string;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  channel: string;
  status: 'OPEN' | 'HUMAN_REQUIRED' | 'CLOSED';
  assignedToUserId: string | null;
  aiEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  latestMessage: ConversationListMessage | null;
}

export async function listConversationsForBusiness(
  db: Database,
  businessId: string,
  limit = 100,
): Promise<ConversationListItem[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Conversation list limit must be between 1 and 100.');
  }

  const conversationRows = await db
    .select({
      id: conversations.id,
      contactId: contacts.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactEmail: contacts.email,
      channel: conversations.channel,
      status: conversations.status,
      assignedToUserId: conversations.assignedToUserId,
      aiEnabled: conversations.aiEnabled,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(
      contacts,
      and(
        eq(conversations.businessId, contacts.businessId),
        eq(conversations.contactId, contacts.id),
      ),
    )
    .where(eq(conversations.businessId, normalizedBusinessId))
    .orderBy(desc(conversations.updatedAt), desc(conversations.id))
    .limit(limit);

  if (conversationRows.length === 0) {
    return [];
  }

  const conversationIds = conversationRows.map(
    (conversation) => conversation.id,
  );

  const messageRows = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      direction: messages.direction,
      sender: messages.sender,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.businessId, normalizedBusinessId),
        inArray(messages.conversationId, conversationIds),
      ),
    )
    .orderBy(desc(messages.createdAt), desc(messages.id));

  const latestMessageByConversationId = new Map<
    string,
    ConversationListMessage
  >();

  for (const message of messageRows) {
    if (latestMessageByConversationId.has(message.conversationId)) {
      continue;
    }

    latestMessageByConversationId.set(message.conversationId, {
      id: message.id,
      direction: message.direction,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    });
  }

  return conversationRows.map((conversation) => ({
    id: conversation.id,
    contact: {
      id: conversation.contactId,
      name: conversation.contactName,
      phone: conversation.contactPhone,
      email: conversation.contactEmail,
    },
    channel: conversation.channel,
    status: conversation.status,
    assignedToUserId: conversation.assignedToUserId,
    aiEnabled: conversation.aiEnabled,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    latestMessage: latestMessageByConversationId.get(conversation.id) ?? null,
  }));
}
