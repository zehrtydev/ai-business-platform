import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface ServicePrice {
  minorUnits: number;
  currencyCode: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceListResponse {
  items: ServiceItem[];
}

export interface ServiceMutationInput {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
}

export class ServiceMutationInvalidError extends Error {
  constructor() {
    super('The service data is invalid.');
    this.name = 'ServiceMutationInvalidError';
  }
}

export class ServiceNotFoundError extends Error {
  constructor() {
    super('The service could not be found.');
    this.name = 'ServiceNotFoundError';
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

function parsePrice(value: unknown): ServicePrice | null {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.minorUnits !== 'number' ||
    !Number.isSafeInteger(value.minorUnits) ||
    value.minorUnits < 0 ||
    typeof value.currencyCode !== 'string' ||
    !/^[A-Z]{3}$/.test(value.currencyCode)
  ) {
    throw new ApiUpstreamError('The API returned an invalid service price.');
  }

  return {
    minorUnits: value.minorUnits,
    currencyCode: value.currencyCode,
  };
}

function parseService(value: unknown): ServiceItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isStringOrNull(value.description) ||
    typeof value.durationMinutes !== 'number' ||
    !Number.isInteger(value.durationMinutes) ||
    value.durationMinutes <= 0 ||
    typeof value.isActive !== 'boolean' ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid service.');
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    durationMinutes: value.durationMinutes,
    price: parsePrice(value.price),
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

export async function getServiceList(
  accessToken: string,
): Promise<ServiceListResponse> {
  const response = await fetchApi(`${apiBaseUrl()}/services`, accessToken);

  if (response.status === 400) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new ApiUpstreamError('The API returned an invalid service list.');
  }

  return {
    items: payload.items.map(parseService),
  };
}

async function parseMutationResponse(response: Response): Promise<ServiceItem> {
  if (response.status === 400) {
    throw new ServiceMutationInvalidError();
  }

  if (response.status === 404) {
    throw new ServiceNotFoundError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload) || payload.service === undefined) {
    throw new ApiUpstreamError(
      'The API returned an invalid service mutation response.',
    );
  }

  return parseService(payload.service);
}

export async function createService(
  accessToken: string,
  input: ServiceMutationInput,
): Promise<ServiceItem> {
  const response = await fetchApi(`${apiBaseUrl()}/services`, accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return parseMutationResponse(response);
}

export async function updateService(
  accessToken: string,
  serviceId: string,
  input: ServiceMutationInput,
): Promise<ServiceItem> {
  const normalizedServiceId = serviceId.trim();

  if (!normalizedServiceId) {
    throw new ServiceMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/services/${encodeURIComponent(normalizedServiceId)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );

  return parseMutationResponse(response);
}

export async function setServiceActive(
  accessToken: string,
  serviceId: string,
  isActive: boolean,
): Promise<ServiceItem> {
  const normalizedServiceId = serviceId.trim();

  if (!normalizedServiceId) {
    throw new ServiceMutationInvalidError();
  }

  const response = await fetchApi(
    `${apiBaseUrl()}/services/${encodeURIComponent(
      normalizedServiceId,
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
