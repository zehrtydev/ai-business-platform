import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

export interface ContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    pipelineStage: {
      id: string;
      name: string;
    };
    service: {
      id: string;
      name: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export class ContactNotFoundError extends Error {
  constructor() {
    super('Contact not found.');
    this.name = 'ContactNotFoundError';
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

function parseContactDetail(value: unknown): ContactDetail {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStringOrNull(value.name) ||
    !isStringOrNull(value.phone) ||
    !isStringOrNull(value.email) ||
    typeof value.source !== 'string' ||
    !isStringOrNull(value.lastInteractionAt) ||
    !isValidDateString(value.createdAt) ||
    !isValidDateString(value.updatedAt)
  ) {
    throw new ApiUpstreamError('The API returned an invalid contact detail.');
  }

  if (
    value.lastInteractionAt !== null &&
    !isValidDateString(value.lastInteractionAt)
  ) {
    throw new ApiUpstreamError(
      'The API returned an invalid contact interaction date.',
    );
  }

  let lead: ContactDetail['lead'] = null;

  if (value.lead !== null) {
    if (
      !isRecord(value.lead) ||
      typeof value.lead.id !== 'string' ||
      !isRecord(value.lead.pipelineStage) ||
      typeof value.lead.pipelineStage.id !== 'string' ||
      typeof value.lead.pipelineStage.name !== 'string' ||
      !isValidDateString(value.lead.createdAt) ||
      !isValidDateString(value.lead.updatedAt)
    ) {
      throw new ApiUpstreamError('The API returned an invalid contact lead.');
    }

    let service: ContactDetail['lead'] extends infer T
      ? T extends { service: infer S }
        ? S
        : never
      : never;

    if (value.lead.service === null) {
      service = null;
    } else if (
      isRecord(value.lead.service) &&
      typeof value.lead.service.id === 'string' &&
      typeof value.lead.service.name === 'string'
    ) {
      service = {
        id: value.lead.service.id,
        name: value.lead.service.name,
      };
    } else {
      throw new ApiUpstreamError(
        'The API returned an invalid contact service.',
      );
    }

    lead = {
      id: value.lead.id,
      pipelineStage: {
        id: value.lead.pipelineStage.id,
        name: value.lead.pipelineStage.name,
      },
      service,
      createdAt: value.lead.createdAt,
      updatedAt: value.lead.updatedAt,
    };
  }

  return {
    id: value.id,
    name: value.name,
    phone: value.phone,
    email: value.email,
    source: value.source,
    lastInteractionAt: value.lastInteractionAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lead,
  };
}

export async function getContactDetail(
  accessToken: string,
  contactId: string,
): Promise<ContactDetail> {
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigurationError();
  }

  if (!accessToken.trim()) {
    throw new ApiAuthenticationError();
  }

  if (!contactId.trim()) {
    throw new ContactNotFoundError();
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiBaseUrl.replace(/\/+$/, '')}/crm/contacts/${encodeURIComponent(
        contactId,
      )}`,
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

  if (response.status === 404) {
    throw new ContactNotFoundError();
  }

  if (!response.ok) {
    throw new ApiUpstreamError(`The API returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return parseContactDetail(payload);
}
