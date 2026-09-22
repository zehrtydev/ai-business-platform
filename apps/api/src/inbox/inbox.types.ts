export interface InboxConversationMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  sender: 'CONTACT' | 'AI' | 'HUMAN';
  senderUserId: string | null;
  content: string;
  messageType: 'TEXT';
  providerMessageId: string | null;
  createdAt: string;
}

export interface InboxConversationListItem {
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
  createdAt: string;
  updatedAt: string;
  latestMessage: {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    sender: 'CONTACT' | 'AI' | 'HUMAN';
    content: string;
    createdAt: string;
  } | null;
}

export interface InboxConversationDetail {
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
  createdAt: string;
  updatedAt: string;
  messages: InboxConversationMessage[];
}

export interface InboxConversationReader {
  listConversations(
    businessId: string,
  ): Promise<readonly InboxConversationListItem[]>;

  getConversation(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationDetail | null>;
}

export interface InboxDevelopmentMessageWriter {
  createInboundMessage(
    businessId: string,
    conversationId: string,
    content: string,
  ): Promise<InboxConversationMessage | null>;
}

export interface InboxConversationControlState {
  id: string;
  status: 'OPEN' | 'HUMAN_REQUIRED' | 'CLOSED';
  assignedToUserId: string | null;
  aiEnabled: boolean;
  updatedAt: string;
}

export type InboxConversationControlMutationResult =
  | {
      kind: 'updated';
      conversation: InboxConversationControlState;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'conflict';
    };

export interface InboxConversationControlWriter {
  requestHandoff(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationControlMutationResult>;

  takeOver(
    businessId: string,
    conversationId: string,
    userId: string,
  ): Promise<InboxConversationControlMutationResult>;

  resumeAi(
    businessId: string,
    conversationId: string,
  ): Promise<InboxConversationControlMutationResult>;
}
