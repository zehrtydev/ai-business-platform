import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface ConversationDetailMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  sender: 'CONTACT' | 'AI' | 'HUMAN';
  senderUserId: string | null;
  content: string;
  messageType: 'TEXT';
  providerMessageId: string | null;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
  messages: ConversationDetailMessage[];
}

export class ConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found.');
    this.name = 'ConversationNotFoundError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isStatus(value: unknown): value is ConversationDetail['status'] {
  return value === 'OPEN' || value === 'HUMAN_REQUIRED' || value === 'CLOSED';
}

function parseMessage(value: unknown): ConversationDetailMessage {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.direction !== 'INBOUND' && value.direction !== 'OUTBOUND') ||
    (value.sender !== 'CONTACT' &&
      value.sender !== 'AI' &&
      value.sender !== 'HUMAN') ||
    !isStringOrNull(value.senderUserId) ||
    typeof value.content !== 'string' ||
    value.messageType !== 'TEXT' ||
    !isStringOrNull(value.providerMessageId) ||
    !isValidDateString(value.createdAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid conversation message.',
    );
  }

  return {
    id: value.id,
    direction: value.direction,
    sender: value.sender,
    senderUserId: value.senderUserId,
    content: value.content,
    messageType: value.messageType,
    providerMessageId: value.providerMessageId,
    createdAt: value.createdAt,
  };
}

function parseConversationDetail(value: unknown): ConversationDetail {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isRecord(value.contact) ||
    typeof value.contact.id !== 'string' ||
    !isStringOrNull(value.contact.name) ||
    !isStringOrNull(value.contact.phone) ||
    !isStringOrNull(value.contact.email) ||
    typeof value.channel !== 'string' ||
    !isStatus(value.status) ||
    !isStringOrNull(value.assignedToUserId) ||
    typeof value.aiEnabled !== 'boolean' ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt) ||
    !Array.isArray(value.messages)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid conversation detail.',
    );
  }

  return {
    id: value.id,
    contact: {
      id: value.contact.id,
      name: value.contact.name,
      phone: value.contact.phone,
      email: value.contact.email,
    },
    channel: value.channel,
    status: value.status,
    assignedToUserId: value.assignedToUserId,
    aiEnabled: value.aiEnabled,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    messages: value.messages.map(parseMessage),
  };
}

export async function getConversationDetail(
  accessToken: string,
  conversationId: string,
): Promise<ConversationDetail> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  if (!conversationId.trim()) {
    throw new ConversationNotFoundError();
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiBaseUrl.replace(
        /\/+$/,
        '',
      )}/inbox/conversations/${encodeURIComponent(conversationId)}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch (error) {
    throw new ApiUpstreamError('The API could not be reached.', {
      cause: error,
    });
  }

  if (response.status === 401) {
    throw new ApiAuthenticationError();
  }

  if (response.status === 400 || response.status === 403) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (response.status === 404) {
    throw new ConversationNotFoundError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseConversationDetail(payload);
}
