import {
  and,
  eq,
  isNotNull,
  isNull,
} from 'drizzle-orm';

import type { Database } from '../client.js';
import { conversations } from '../schema/conversation.js';

export interface ConversationControlState {
  id: string;
  status: 'OPEN' | 'HUMAN_REQUIRED' | 'CLOSED';
  assignedToUserId: string | null;
  aiEnabled: boolean;
  updatedAt: Date;
}

export type ConversationControlMutationResult =
  | {
      kind: 'updated';
      conversation: ConversationControlState;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'conflict';
    };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function classifyFailedMutation(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<ConversationControlMutationResult> {
  const [conversation] = await db
    .select({
      id: conversations.id,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, businessId),
        eq(conversations.id, conversationId),
      ),
    )
    .limit(1);

  return conversation
    ? { kind: 'conflict' }
    : { kind: 'not_found' };
}

export async function requestConversationHandoffForBusiness(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<ConversationControlMutationResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedConversationId = conversationId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedConversationId || !isUuid(normalizedConversationId)) {
    return { kind: 'not_found' };
  }

  const [conversation] = await db
    .update(conversations)
    .set({
      status: 'HUMAN_REQUIRED',
      aiEnabled: false,
      assignedToUserId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.businessId, normalizedBusinessId),
        eq(conversations.id, normalizedConversationId),
        eq(conversations.status, 'OPEN'),
        eq(conversations.aiEnabled, true),
        isNull(conversations.assignedToUserId),
      ),
    )
    .returning({
      id: conversations.id,
      status: conversations.status,
      assignedToUserId: conversations.assignedToUserId,
      aiEnabled: conversations.aiEnabled,
      updatedAt: conversations.updatedAt,
    });

  if (!conversation) {
    return classifyFailedMutation(
      db,
      normalizedBusinessId,
      normalizedConversationId,
    );
  }

  return {
    kind: 'updated',
    conversation,
  };
}

export async function takeOverConversationForBusiness(
  db: Database,
  businessId: string,
  conversationId: string,
  userId: string,
): Promise<ConversationControlMutationResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedConversationId = conversationId.trim();
  const normalizedUserId = userId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedUserId) {
    throw new Error('User ID is required.');
  }

  if (!normalizedConversationId || !isUuid(normalizedConversationId)) {
    return { kind: 'not_found' };
  }

  const [conversation] = await db
    .update(conversations)
    .set({
      status: 'OPEN',
      aiEnabled: false,
      assignedToUserId: normalizedUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.businessId, normalizedBusinessId),
        eq(conversations.id, normalizedConversationId),
        eq(conversations.status, 'HUMAN_REQUIRED'),
        eq(conversations.aiEnabled, false),
        isNull(conversations.assignedToUserId),
      ),
    )
    .returning({
      id: conversations.id,
      status: conversations.status,
      assignedToUserId: conversations.assignedToUserId,
      aiEnabled: conversations.aiEnabled,
      updatedAt: conversations.updatedAt,
    });

  if (!conversation) {
    return classifyFailedMutation(
      db,
      normalizedBusinessId,
      normalizedConversationId,
    );
  }

  return {
    kind: 'updated',
    conversation,
  };
}

export async function resumeConversationAiForBusiness(
  db: Database,
  businessId: string,
  conversationId: string,
): Promise<ConversationControlMutationResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedConversationId = conversationId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedConversationId || !isUuid(normalizedConversationId)) {
    return { kind: 'not_found' };
  }

  const [conversation] = await db
    .update(conversations)
    .set({
      status: 'OPEN',
      aiEnabled: true,
      assignedToUserId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.businessId, normalizedBusinessId),
        eq(conversations.id, normalizedConversationId),
        eq(conversations.status, 'OPEN'),
        eq(conversations.aiEnabled, false),
        isNotNull(conversations.assignedToUserId),
      ),
    )
    .returning({
      id: conversations.id,
      status: conversations.status,
      assignedToUserId: conversations.assignedToUserId,
      aiEnabled: conversations.aiEnabled,
      updatedAt: conversations.updatedAt,
    });

  if (!conversation) {
    return classifyFailedMutation(
      db,
      normalizedBusinessId,
      normalizedConversationId,
    );
  }

  return {
    kind: 'updated',
    conversation,
  };
}
