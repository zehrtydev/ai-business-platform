import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface ContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: string | null;
  createdAt: string;
  lead: {
    id: string;
    pipelineStage: {
      id: string;
      name: string;
    };
    service: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface ContactListResponse {
  items: ContactListItem[];
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

function parseLead(value: unknown): ContactListItem['lead'] {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isRecord(value.pipelineStage) ||
    typeof value.pipelineStage.id !== 'string' ||
    typeof value.pipelineStage.name !== 'string'
  ) {
    throw new ApiUpstreamError('The API returned an invalid contact lead.');
  }

  let service: ContactListItem['lead'] extends infer T
    ? T extends { service: infer S }
      ? S
      : never
    : never;

  if (value.service === null) {
    service = null;
  } else if (
    isRecord(value.service) &&
    typeof value.service.id === 'string' &&
    typeof value.service.name === 'string'
  ) {
    service = {
      id: value.service.id,
      name: value.service.name,
    };
  } else {
    throw new ApiUpstreamError('The API returned an invalid contact service.');
  }

  return {
    id: value.id,
    pipelineStage: {
      id: value.pipelineStage.id,
      name: value.pipelineStage.name,
    },
    service,
  };
}

function parseContact(value: unknown): ContactListItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStringOrNull(value.name) ||
    !isStringOrNull(value.phone) ||
    !isStringOrNull(value.email) ||
    typeof value.source !== 'string' ||
    !isStringOrNull(value.lastInteractionAt) ||
    !isValidDateString(value.createdAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid contact.');
  }

  if (
    value.lastInteractionAt !== null &&
    !isValidDateString(value.lastInteractionAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid contact interaction date.',
    );
  }

  return {
    id: value.id,
    name: value.name,
    phone: value.phone,
    email: value.email,
    source: value.source,
    lastInteractionAt: value.lastInteractionAt,
    createdAt: value.createdAt,
    lead: parseLead(value.lead),
  };
}

function parseContactListResponse(value: unknown): ContactListResponse {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ApiUpstreamError('The API returned an invalid contact list.');
  }

  return {
    items: value.items.map(parseContact),
  };
}

export async function getContactList(
  accessToken: string,
): Promise<ContactListResponse> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/crm/contacts`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
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

  return parseContactListResponse(payload);
}
