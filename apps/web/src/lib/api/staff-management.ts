import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface StaffAssignedService {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StaffMemberItem {
  id: string;
  name: string;
  isActive: boolean;
  services: StaffAssignedService[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffListResponse {
  items: StaffMemberItem[];
}

export interface StaffMutationInput {
  name: string;
  serviceIds: string[];
}

export class StaffMutationInvalidError extends Error {
  constructor() {
    super('The staff member data is invalid.');
    this.name = 'StaffMutationInvalidError';
  }
}

export class StaffNotFoundError extends Error {
  constructor() {
    super('The staff member or assigned service could not be found.');
    this.name = 'StaffNotFoundError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseAssignedService(value: unknown): StaffAssignedService {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.isActive !== 'boolean'
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid staff service assignment.',
    );
  }

  return {
    id: value.id,
    name: value.name,
    isActive: value.isActive,
  };
}

function parseStaffMember(value: unknown): StaffMemberItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.isActive !== 'boolean' ||
    !Array.isArray(value.services) ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid staff member.');
  }

  return {
    id: value.id,
    name: value.name,
    isActive: value.isActive,
    services: value.services.map(parseAssignedService),
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

export async function getStaffList(
  accessToken: string,
): Promise<StaffListResponse> {
  const response = await fetchApi(`${apiBaseUrl()}/staff`, accessToken);

  if (response.status === 400) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new ApiUpstreamError('The API returned an invalid staff list.');
  }

  return {
    items: payload.items.map(parseStaffMember),
  };
}

async function parseMutationResponse(
  response: Response,
): Promise<StaffMemberItem> {
  if (response.status === 400) {
    throw new StaffMutationInvalidError();
  }

  if (response.status === 404) {
    throw new StaffNotFoundError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || payload.staffMember === undefined) {
    throw new ApiUpstreamError(
      'The API returned an invalid staff mutation response.',
    );
  }

  return parseStaffMember(payload.staffMember);
}

export async function createStaffMember(
  accessToken: string,
  input: StaffMutationInput,
): Promise<StaffMemberItem> {
  const response = await fetchApi(`${apiBaseUrl()}/staff`, accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return parseMutationResponse(response);
}

export async function updateStaffMember(
  accessToken: string,
  staffMemberId: string,
  input: StaffMutationInput,
): Promise<StaffMemberItem> {
  const normalizedStaffMemberId = staffMemberId.trim();

  if (!normalizedStaffMemberId) {
    throw new StaffMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/staff/${encodeURIComponent(normalizedStaffMemberId)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );

  return parseMutationResponse(response);
}

export async function setStaffMemberActive(
  accessToken: string,
  staffMemberId: string,
  isActive: boolean,
): Promise<StaffMemberItem> {
  const normalizedStaffMemberId = staffMemberId.trim();

  if (!normalizedStaffMemberId) {
    throw new StaffMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/staff/${encodeURIComponent(
      normalizedStaffMemberId,
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
