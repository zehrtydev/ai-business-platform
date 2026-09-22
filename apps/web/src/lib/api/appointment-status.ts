import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export type AppointmentLifecycleStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type AppointmentStatus =
  | 'SCHEDULED'
  | AppointmentLifecycleStatus;

export interface UpdateAppointmentStatusInput {
  appointmentId: string;
  status: AppointmentLifecycleStatus;
}

export interface UpdatedAppointmentStatus {
  id: string;
  status: AppointmentLifecycleStatus;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLifecycleStatus(
  value: unknown,
): value is AppointmentLifecycleStatus {
  return (
    value === 'CANCELLED' ||
    value === 'COMPLETED' ||
    value === 'NO_SHOW'
  );
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return value === 'SCHEDULED' || isLifecycleStatus(value);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseUpdatedAppointmentStatus(
  value: unknown,
): UpdatedAppointmentStatus {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isLifecycleStatus(value.status) ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment status response.',
    );
  }

  return {
    id: value.id,
    status: value.status,
    updatedAt: value.updatedAt,
  };
}

export class AppointmentStatusInvalidError extends Error {
  constructor() {
    super('The appointment status request is invalid.');
    this.name = 'AppointmentStatusInvalidError';
  }
}

export class AppointmentStatusNotFoundError extends Error {
  constructor() {
    super('The appointment could not be found.');
    this.name = 'AppointmentStatusNotFoundError';
  }
}

export class AppointmentStatusConflictError extends Error {
  constructor(readonly currentStatus: AppointmentStatus) {
    super('The appointment can no longer change lifecycle status.');
    this.name = 'AppointmentStatusConflictError';
  }
}

export async function updateAppointmentStatus(
  accessToken: string,
  input: UpdateAppointmentStatusInput,
): Promise<UpdatedAppointmentStatus> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();
  const appointmentId = input.appointmentId.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  if (!appointmentId || !isLifecycleStatus(input.status)) {
    throw new AppointmentStatusInvalidError();
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiBaseUrl.replace(/\/+$/, '')}/appointments/${encodeURIComponent(
        appointmentId,
      )}/status`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          status: input.status,
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

  if (response.status === 400) {
    throw new AppointmentStatusInvalidError();
  }

  if (response.status === 403) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (response.status === 404) {
    throw new AppointmentStatusNotFoundError();
  }

  if (response.status === 409) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiUpstreamError(
        'The API returned an invalid appointment status conflict response.',
        { cause: error },
      );
    }

    if (
      !isRecord(payload) ||
      !isAppointmentStatus(payload.currentStatus)
    ) {
      throw new ApiUpstreamError(
        'The API returned an invalid appointment status conflict response.',
      );
    }

    throw new AppointmentStatusConflictError(payload.currentStatus);
  }

  if (!response.ok) {
    throw new ApiUpstreamError(
      `The API returned HTTP ${response.status}.`,
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment status response.',
      { cause: error },
    );
  }

  if (!isRecord(payload)) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment status response.',
    );
  }

  return parseUpdatedAppointmentStatus(payload.appointment);
}
