import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { contacts } from '../schema/contact.js';
import { conversations } from '../schema/conversation.js';
import { messages } from '../schema/message.js';

export interface ConversationDetailMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  sender: 'CONTACT' | 'AI' | 'HUMAN';
  senderUserId: string | null;
  content: string;
  messageType: 'TEXT';
  providerMessageId: string | null;
  createdAt: Date;
}

export interface ConversationDetail {
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
  messages: ConversationDetailMessage[];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getConversationDetailForBusiness(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedConversationId = conversationId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedConversationId || !isUuid(normalizedConversationId)) {
    return null;
  }

  const [conversation] = await db
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
    .where(
      and(
        eq(conversations.businessId, normalizedBusinessId),
        eq(conversations.id, normalizedConversationId),
      ),
    )
    .limit(1);

  if (!conversation) {
    return null;
  }

  const messageRows = await db
    .select({
      id: messages.id,
      direction: messages.direction,
      sender: messages.sender,
      senderUserId: messages.senderUserId,
      content: messages.content,
      messageType: messages.messageType,
      providerMessageId: messages.providerMessageId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.businessId, normalizedBusinessId),
        eq(messages.conversationId, normalizedConversationId),
      ),
    )
    .orderBy(asc(messages.createdAt), asc(messages.id));

  return {
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
    messages: messageRows,
  };
}
