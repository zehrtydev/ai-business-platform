import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface AppointmentAvailableSlotsInput {
  serviceId: string;
  staffMemberId: string;
  date: string;
}

export interface AppointmentAvailableSlot {
  startsAt: string;
  endsAt: string;
}

export interface AppointmentAvailableSlots {
  timezone: string;
  date: string;
  serviceId: string;
  staffMemberId: string;
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  slots: AppointmentAvailableSlot[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function parseSlot(value: unknown): AppointmentAvailableSlot {
  if (
    !isRecord(value) ||
    !isValidDateTime(value.startsAt) ||
    !isValidDateTime(value.endsAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid appointment slot.');
  }

  return {
    startsAt: value.startsAt,
    endsAt: value.endsAt,
  };
}

function parseAvailableSlots(value: unknown): AppointmentAvailableSlots {
  if (
    !isRecord(value) ||
    typeof value.timezone !== 'string' ||
    !value.timezone ||
    typeof value.date !== 'string' ||
    !value.date ||
    typeof value.serviceId !== 'string' ||
    !value.serviceId ||
    typeof value.staffMemberId !== 'string' ||
    !value.staffMemberId ||
    typeof value.serviceDurationMinutes !== 'number' ||
    !Number.isInteger(value.serviceDurationMinutes) ||
    value.serviceDurationMinutes <= 0 ||
    typeof value.slotIntervalMinutes !== 'number' ||
    !Number.isInteger(value.slotIntervalMinutes) ||
    value.slotIntervalMinutes <= 0 ||
    !Array.isArray(value.slots)
  ) {
    throw new ApiUpstreamError(
      'The API returned invalid appointment availability.',
    );
  }

  return {
    timezone: value.timezone,
    date: value.date,
    serviceId: value.serviceId,
    staffMemberId: value.staffMemberId,
    serviceDurationMinutes: value.serviceDurationMinutes,
    slotIntervalMinutes: value.slotIntervalMinutes,
    slots: value.slots.map(parseSlot),
  };
}

export class AppointmentAvailableSlotsInvalidError extends Error {
  constructor() {
    super('The requested availability date is invalid.');
    this.name = 'AppointmentAvailableSlotsInvalidError';
  }
}

export class AppointmentAvailableSlotsNotFoundError extends Error {
  constructor() {
    super('The requested service or staff member could not be found.');
    this.name = 'AppointmentAvailableSlotsNotFoundError';
  }
}

export class AppointmentAvailableSlotsConfigurationError extends Error {
  constructor() {
    super('The selected staff member is not configured for that service.');
    this.name = 'AppointmentAvailableSlotsConfigurationError';
  }
}

export async function getAppointmentAvailableSlots(
  accessToken: string,
  input: AppointmentAvailableSlotsInput,
): Promise<AppointmentAvailableSlots> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  const query = new URLSearchParams({
    serviceId: input.serviceId,
    staffMemberId: input.staffMemberId,
    date: input.date,
  });

  let response: Response;

  try {
    response = await fetch(
      `${apiBaseUrl.replace(
        /\/+$/,
        '',
      )}/appointments/available-slots?${query.toString()}`,
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

  if (response.status === 400) {
    throw new AppointmentAvailableSlotsInvalidError();
  }

  if (response.status === 403) {
    throw new ApiTenantResolutionError(response.status);
  }

  if (response.status === 404) {
    throw new AppointmentAvailableSlotsNotFoundError();
  }

  if (response.status === 409) {
    throw new AppointmentAvailableSlotsConfigurationError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseAvailableSlots(payload);
}
