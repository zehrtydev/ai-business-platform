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

export interface InboxConversationReader {
  listConversations(
    businessId: string,
  ): Promise<readonly InboxConversationListItem[]>;
}
