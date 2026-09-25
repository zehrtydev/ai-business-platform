import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface AvailabilityRuleItem {
  id: string;
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRuleListResponse {
  items: AvailabilityRuleItem[];
}

export interface AvailabilityRuleMutationInput {
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export class AvailabilityRuleMutationInvalidError extends Error {
  constructor() {
    super('The availability rule data is invalid.');
    this.name = 'AvailabilityRuleMutationInvalidError';
  }
}

export class AvailabilityRuleNotFoundError extends Error {
  constructor() {
    super('The availability rule or staff member could not be found.');
    this.name = 'AvailabilityRuleNotFoundError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isValidTimeString(value: unknown): value is string {
  return (
    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value)
  );
}

function parseAvailabilityRule(value: unknown): AvailabilityRuleItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.staffMemberId !== 'string' ||
    typeof value.dayOfWeek !== 'number' ||
    !Number.isInteger(value.dayOfWeek) ||
    value.dayOfWeek < 1 ||
    value.dayOfWeek > 7 ||
    !isValidTimeString(value.startTime) ||
    !isValidTimeString(value.endTime) ||
    typeof value.isActive !== 'boolean' ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid availability rule.',
    );
  }

  return {
    id: value.id,
    staffMemberId: value.staffMemberId,
    dayOfWeek: value.dayOfWeek,
    startTime: value.startTime,
    endTime: value.endTime,
    isActive: value.isActive,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function apiBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim();

  if (!value) {
    throw new ApiConfigurationError();
  }

  return value.replace(/\/+$/, '');
}

function authenticatedHeaders(
  accessToken: string,
  includeJson = false,
): HeadersInit {
  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  return {
    authorization: `Bearer ${accessToken}`,
    ...(includeJson
      ? {
          'content-type': 'application/json',
        }
      : {}),
  };
}

async function fetchApi(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...authenticatedHeaders(accessToken, init.body !== undefined),
        ...init.headers,
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

  if (response.status === 403) {
    throw new ApiTenantResolutionError(response.status);
  }

  return response;
}

export async function getAvailabilityRuleList(
  accessToken: string,
): Promise<AvailabilityRuleListResponse> {
  const response = await fetchApi(
    `${apiBaseUrl()}/availability-rules`,
    accessToken,
  );

  if (response.status === 400) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new ApiUpstreamError(
      'The API returned an invalid availability rule list.',
    );
  }

  return {
    items: payload.items.map(parseAvailabilityRule),
  };
}

async function parseMutationResponse(
  response: Response,
): Promise<AvailabilityRuleItem> {
  if (response.status === 400) {
    throw new AvailabilityRuleMutationInvalidError();
  }

  if (response.status === 404) {
    throw new AvailabilityRuleNotFoundError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || payload.availabilityRule === undefined) {
    throw new ApiUpstreamError(
      'The API returned an invalid availability rule mutation response.',
    );
  }

  return parseAvailabilityRule(payload.availabilityRule);
}

export async function createAvailabilityRule(
  accessToken: string,
  input: AvailabilityRuleMutationInput,
): Promise<AvailabilityRuleItem> {
  const response = await fetchApi(
    `${apiBaseUrl()}/availability-rules`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return parseMutationResponse(response);
}

export async function updateAvailabilityRule(
  accessToken: string,
  availabilityRuleId: string,
  input: AvailabilityRuleMutationInput,
): Promise<AvailabilityRuleItem> {
  const normalizedAvailabilityRuleId = availabilityRuleId.trim();

  if (!normalizedAvailabilityRuleId) {
    throw new AvailabilityRuleMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/availability-rules/${encodeURIComponent(
      normalizedAvailabilityRuleId,
    )}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );

  return parseMutationResponse(response);
}

export async function setAvailabilityRuleActive(
  accessToken: string,
  availabilityRuleId: string,
  isActive: boolean,
): Promise<AvailabilityRuleItem> {
  const normalizedAvailabilityRuleId = availabilityRuleId.trim();

  if (!normalizedAvailabilityRuleId) {
    throw new AvailabilityRuleMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/availability-rules/${encodeURIComponent(
      normalizedAvailabilityRuleId,
    )}/status`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({
        isActive,
      }),
    },
  );

  return parseMutationResponse(response);
}
