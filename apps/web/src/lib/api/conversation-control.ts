import { ConversationNotFoundError } from './conversation-detail';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface ConversationControlState {
  id: string;
  status: 'OPEN' | 'HUMAN_REQUIRED' | 'CLOSED';
  assignedToUserId: string | null;
  aiEnabled: boolean;
  updatedAt: string;
}

export class ConversationControlConflictError extends Error {
  constructor() {
    super('Conversation state does not allow this transition.');
    this.name = 'ConversationControlConflictError';
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

function isStatus(value: unknown): value is ConversationControlState['status'] {
  return value === 'OPEN' || value === 'HUMAN_REQUIRED' || value === 'CLOSED';
}

function parseControlState(value: unknown): ConversationControlState {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStatus(value.status) ||
    !isStringOrNull(value.assignedToUserId) ||
    typeof value.aiEnabled !== 'boolean' ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid conversation control state.',
    );
  }

  return {
    id: value.id,
    status: value.status,
    assignedToUserId: value.assignedToUserId,
    aiEnabled: value.aiEnabled,
    updatedAt: value.updatedAt,
  };
}

async function mutateConversationControl(
  accessToken: string,
  conversationId: string,
  action: 'request-handoff' | 'take-over' | 'resume-ai',
): Promise<ConversationControlState> {
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
      )}/inbox/conversations/${encodeURIComponent(conversationId)}/${action}`,
      {
        method: 'POST',
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

  if (response.status === 409) {
    throw new ConversationControlConflictError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new ApiUpstreamError(
      'The API returned an invalid conversation control response.',
    );
  }

  return parseControlState(payload.conversation);
}

export function requestConversationHandoff(
  accessToken: string,
  conversationId: string,
): Promise<ConversationControlState> {
  return mutateConversationControl(
    accessToken,
    conversationId,
    'request-handoff',
  );
}

export function takeOverConversation(
  accessToken: string,
  conversationId: string,
): Promise<ConversationControlState> {
  return mutateConversationControl(accessToken, conversationId, 'take-over');
}

export function resumeConversationAi(
  accessToken: string,
  conversationId: string,
): Promise<ConversationControlState> {
  return mutateConversationControl(accessToken, conversationId, 'resume-ai');
}
