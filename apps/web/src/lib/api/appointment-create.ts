import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface CreateAppointmentInput {
  contactId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: string;
}

export type AppointmentConflictReason =
  | 'past'
  | 'unavailable_day'
  | 'outside_hours'
  | 'overlap'
  | 'configuration';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppointmentConflictReason(
  value: unknown,
): value is AppointmentConflictReason {
  return (
    value === 'past' ||
    value === 'unavailable_day' ||
    value === 'outside_hours' ||
    value === 'overlap' ||
    value === 'configuration'
  );
}

export class AppointmentCreateInvalidError extends Error {
  constructor() {
    super('The appointment data is invalid.');
    this.name = 'AppointmentCreateInvalidError';
  }
}

export class AppointmentCreateNotFoundError extends Error {
  constructor() {
    super('The appointment resources could not be found.');
    this.name = 'AppointmentCreateNotFoundError';
  }
}

export class AppointmentCreateConflictError extends Error {
  constructor(readonly reason: AppointmentConflictReason) {
    super('The requested appointment conflicts with the current schedule.');
    this.name = 'AppointmentCreateConflictError';
  }
}

export async function createAppointment(
  accessToken: string,
  input: CreateAppointmentInput,
): Promise<void> {
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
      `${apiBaseUrl.replace(/\/+$/, '')}/appointments`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
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

  if (response.status === 400) {
    throw new AppointmentCreateInvalidError();
  }

  if (response.status === 403) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (response.status === 404) {
    throw new AppointmentCreateNotFoundError();
  }

  if (response.status === 409) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiUpstreamError(
        'The API returned an invalid appointment conflict response.',
        { cause: error },
      );
    }

    if (!isRecord(payload) || !isAppointmentConflictReason(payload.reason)) {
      throw new ApiUpstreamError(
        'The API returned an invalid appointment conflict response.',
      );
    }

    throw new AppointmentCreateConflictError(payload.reason);
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }
}
