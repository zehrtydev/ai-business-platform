import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface DashboardSummary {
  leadsReceived: number;
  openConversations: number;
  scheduledAppointments: number;
  humanHandoffs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function parseDashboardSummary(value: unknown): DashboardSummary {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.leadsReceived) ||
    !isNonNegativeInteger(value.openConversations) ||
    !isNonNegativeInteger(value.scheduledAppointments) ||
    !isNonNegativeInteger(value.humanHandoffs)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid dashboard summary.',
    );
  }

  return {
    leadsReceived: value.leadsReceived,
    openConversations: value.openConversations,
    scheduledAppointments: value.scheduledAppointments,
    humanHandoffs: value.humanHandoffs,
  };
}

export async function getDashboardSummary(
  accessToken: string,
): Promise<DashboardSummary> {
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
      `${apiBaseUrl.replace(/\/+$/, '')}/dashboard/summary`,
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

  return parseDashboardSummary(payload);
}
