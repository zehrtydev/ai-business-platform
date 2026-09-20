import type { ConversationDetailMessage } from './conversation-detail';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export class DevelopmentConversationUnavailableError extends Error {
  constructor() {
    super('Development conversation is not available.');
    this.name = 'DevelopmentConversationUnavailableError';
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

function parseMessage(value: unknown): ConversationDetailMessage {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.direction !== 'INBOUND' ||
    value.sender !== 'CONTACT' ||
    value.senderUserId !== null ||
    typeof value.content !== 'string' ||
    value.messageType !== 'TEXT' ||
    !isStringOrNull(value.providerMessageId) ||
    !isValidDateString(value.createdAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid development message.',
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

export async function createDevelopmentInboundMessage(
  accessToken: string,
  conversationId: string,
  content: string,
): Promise<ConversationDetailMessage> {
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
      `${apiBaseUrl.replace(
        /\/+$/,
        '',
      )}/inbox/conversations/${encodeURIComponent(
        conversationId,
      )}/development/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
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
    throw new DevelopmentConversationUnavailableError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new ApiUpstreamError(
      'The API returned an invalid development message response.',
    );
  }

  return parseMessage(payload.message);
}
