import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface AppointmentListItem {
  id: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  staffMember: {
    id: string;
    name: string;
  };
}

export interface AppointmentListResponse {
  items: AppointmentListItem[];
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

function isStatus(value: unknown): value is AppointmentListItem['status'] {
  return (
    value === 'SCHEDULED' ||
    value === 'CANCELLED' ||
    value === 'COMPLETED' ||
    value === 'NO_SHOW'
  );
}

function parseAppointment(value: unknown): AppointmentListItem {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStatus(value.status) ||
    !isValidDateString(value.startsAt) ||
    !isValidDateString(value.endsAt) ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt) ||
    !isRecord(value.contact) ||
    typeof value.contact.id !== 'string' ||
    !isStringOrNull(value.contact.name) ||
    !isStringOrNull(value.contact.phone) ||
    !isStringOrNull(value.contact.email) ||
    !isRecord(value.service) ||
    typeof value.service.id !== 'string' ||
    typeof value.service.name !== 'string' ||
    typeof value.service.durationMinutes !== 'number' ||
    !Number.isInteger(value.service.durationMinutes) ||
    value.service.durationMinutes <= 0 ||
    !isRecord(value.staffMember) ||
    typeof value.staffMember.id !== 'string' ||
    typeof value.staffMember.name !== 'string'
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment list item.',
    );
  }

  return {
    id: value.id,
    status: value.status,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    contact: {
      id: value.contact.id,
      name: value.contact.name,
      phone: value.contact.phone,
      email: value.contact.email,
    },
    service: {
      id: value.service.id,
      name: value.service.name,
      durationMinutes: value.service.durationMinutes,
    },
    staffMember: {
      id: value.staffMember.id,
      name: value.staffMember.name,
    },
  };
}

export async function getAppointmentList(
  accessToken: string,
): Promise<AppointmentListResponse> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/appointments`, {
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

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new ApiUpstreamError(
      'The API returned an invalid appointment list response.',
    );
  }

  return {
    items: payload.items.map(parseAppointment),
  };
}
