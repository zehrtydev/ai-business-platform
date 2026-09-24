import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface AppointmentSchedulingAvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AppointmentSchedulingStaffMember {
  id: string;
  name: string;
  availability: AppointmentSchedulingAvailabilityRule[];
}

export interface AppointmentSchedulingService {
  id: string;
  name: string;
  durationMinutes: number;
  staffMembers: AppointmentSchedulingStaffMember[];
}

export interface AppointmentSchedulingOptions {
  timezone: string;
  services: AppointmentSchedulingService[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAvailabilityRule(
  value: unknown,
): AppointmentSchedulingAvailabilityRule {
  if (
    !isRecord(value) ||
    typeof value.dayOfWeek !== 'number' ||
    !Number.isInteger(value.dayOfWeek) ||
    value.dayOfWeek < 1 ||
    value.dayOfWeek > 7 ||
    typeof value.startTime !== 'string' ||
    !value.startTime ||
    typeof value.endTime !== 'string' ||
    !value.endTime
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid staff availability rule.',
    );
  }

  return {
    dayOfWeek: value.dayOfWeek,
    startTime: value.startTime,
    endTime: value.endTime,
  };
}

function parseStaffMember(value: unknown): AppointmentSchedulingStaffMember {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.name !== 'string' ||
    !value.name ||
    !Array.isArray(value.availability)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment staff member.',
    );
  }

  return {
    id: value.id,
    name: value.name,
    availability: value.availability.map(parseAvailabilityRule),
  };
}

function parseService(value: unknown): AppointmentSchedulingService {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.name !== 'string' ||
    !value.name ||
    typeof value.durationMinutes !== 'number' ||
    !Number.isInteger(value.durationMinutes) ||
    value.durationMinutes <= 0 ||
    !Array.isArray(value.staffMembers)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment service.',
    );
  }

  return {
    id: value.id,
    name: value.name,
    durationMinutes: value.durationMinutes,
    staffMembers: value.staffMembers.map(parseStaffMember),
  };
}

function parseSchedulingOptions(value: unknown): AppointmentSchedulingOptions {
  if (
    !isRecord(value) ||
    typeof value.timezone !== 'string' ||
    !value.timezone ||
    !Array.isArray(value.services)
  ) {
    throw new ApiUpstreamError(
      'The API returned invalid appointment scheduling options.',
    );
  }

  return {
    timezone: value.timezone,
    services: value.services.map(parseService),
  };
}

export async function getAppointmentSchedulingOptions(
  accessToken: string,
): Promise<AppointmentSchedulingOptions> {
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
      `${apiBaseUrl.replace(/\/+$/, '')}/appointments/options`,
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

  return parseSchedulingOptions(payload);
}
