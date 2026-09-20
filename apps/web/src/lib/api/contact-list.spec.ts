import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';
import { getContactList } from './contact-list';

describe('getContactList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(getContactList('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('forwards authentication and returns contacts', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'contact-a',
              name: 'Contact A',
              phone: '+10000000001',
              email: 'contact-a@example.com',
              source: 'development',
              lastInteractionAt: '2026-09-20T01:00:00.000Z',
              createdAt: '2026-09-19T20:00:00.000Z',
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
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getContactList('access-token')).resolves.toEqual({
      items: [
        {
          id: 'contact-a',
          name: 'Contact A',
          phone: '+10000000001',
          email: 'contact-a@example.com',
          source: 'development',
          lastInteractionAt: '2026-09-20T01:00:00.000Z',
          createdAt: '2026-09-19T20:00:00.000Z',
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
          },
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/crm/contacts',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps authentication failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(getContactList('access-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );
  });

  it('maps tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(getContactList('access-token')).rejects.toBeInstanceOf(
      ApiTenantResolutionError,
    );
  });

  it('rejects malformed contacts', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'contact-a',
                name: 'Contact A',
                phone: null,
                email: null,
                source: 'development',
                lastInteractionAt: 'not-a-date',
                createdAt: '2026-09-19T20:00:00.000Z',
                lead: null,
              },
            ],
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

    await expect(getContactList('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });
});
