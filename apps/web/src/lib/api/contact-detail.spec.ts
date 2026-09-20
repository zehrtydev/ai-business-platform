import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContactNotFoundError, getContactDetail } from './contact-detail';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const validContact = {
  id: 'contact-a',
  name: 'Contact A',
  phone: '+10000000001',
  email: 'contact-a@example.com',
  source: 'development',
  lastInteractionAt: '2026-09-20T01:00:00.000Z',
  createdAt: '2026-09-19T20:00:00.000Z',
  updatedAt: '2026-09-20T01:05:00.000Z',
  lead: {
    id: 'lead-a',
    pipelineStage: {
      id: 'stage-a',
      name: 'Qualified',
    },
    service: {
      id: 'service-a',
      name: 'Evaluation',
    },
    createdAt: '2026-09-19T20:05:00.000Z',
    updatedAt: '2026-09-20T00:45:00.000Z',
  },
};

describe('getContactDetail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      getContactDetail('access-token', 'contact-a'),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('forwards authentication and returns contact detail', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validContact), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getContactDetail('access-token', 'contact-a'),
    ).resolves.toEqual(validContact);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/crm/contacts/contact-a',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps missing contacts', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      getContactDetail('access-token', 'missing-contact'),
    ).rejects.toBeInstanceOf(ContactNotFoundError);
  });

  it('maps authentication failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(
      getContactDetail('access-token', 'contact-a'),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);
  });

  it('maps tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(
      getContactDetail('access-token', 'contact-a'),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed contact detail', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...validContact,
            updatedAt: 'not-a-date',
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(
      getContactDetail('access-token', 'contact-a'),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
