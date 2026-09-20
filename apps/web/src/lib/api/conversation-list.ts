import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

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

export interface ConversationListResponse {
  items: ConversationListItem[];
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

function isStatus(value: unknown): value is ConversationListItem['status'] {
  return value === 'OPEN' || value === 'HUMAN_REQUIRED' || value === 'CLOSED';
}

function parseLatestMessage(
  value: unknown,
): ConversationListItem['latestMessage'] {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.direction !== 'INBOUND' && value.direction !== 'OUTBOUND') ||
    (value.sender !== 'CONTACT' &&
      value.sender !== 'AI' &&
      value.sender !== 'HUMAN') ||
    typeof value.content !== 'string' ||
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
    content: value.content,
    createdAt: value.createdAt,
  };
}

function parseConversation(value: unknown): ConversationListItem {
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
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid conversation.');
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
    latestMessage: parseLatestMessage(value.latestMessage),
  };
}

function parseConversationListResponse(
  value: unknown,
): ConversationListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ApiUpstreamError(
      'The API returned an invalid conversation list.',
    );
  }

  return {
    items: value.items.map(parseConversation),
  };
}

export async function getConversationList(
  accessToken: string,
): Promise<ConversationListResponse> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiBaseUrl.replace(/\/+$/, '')}/inbox/conversations`,
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

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseConversationListResponse(payload);
}
