export type TenantRole = 'owner' | 'admin' | 'member';

export interface TenantContext {
  userId: string;
  membershipId: string;
  businessId: string;
  role: TenantRole;
}

export class ApiConfigurationError extends Error {
  constructor() {
    super('API_BASE_URL is required.');
    this.name = 'ApiConfigurationError';
  }
}

export class ApiAuthenticationError extends Error {
  constructor() {
    super('The API rejected the authenticated session.');
    this.name = 'ApiAuthenticationError';
  }
}

export class ApiTenantResolutionError extends Error {
  constructor(readonly status: number) {
    super('The API could not resolve tenant access.');
    this.name = 'ApiTenantResolutionError';
  }
}

export class ApiUpstreamError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiUpstreamError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTenantRole(value: unknown): value is TenantRole {
  return value === 'owner' || value === 'admin' || value === 'member';
}

function parseTenantContext(value: unknown): TenantContext {
  if (
    !isRecord(value) ||
    typeof value.userId !== 'string' ||
    !value.userId ||
    typeof value.membershipId !== 'string' ||
    !value.membershipId ||
    typeof value.businessId !== 'string' ||
    !value.businessId ||
    !isTenantRole(value.role)
  ) {
    throw new ApiUpstreamError('The API returned an invalid tenant context.');
  }

  return {
    userId: value.userId,
    membershipId: value.membershipId,
    businessId: value.businessId,
    role: value.role,
  };
}

export async function getTenantContext(
  accessToken: string,
): Promise<TenantContext> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/tenant/context`, {
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

  return parseTenantContext(payload);
}
