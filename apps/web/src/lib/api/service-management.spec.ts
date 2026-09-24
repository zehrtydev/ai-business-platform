import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createService,
  getServiceList,
  ServiceMutationInvalidError,
  ServiceNotFoundError,
  setServiceActive,
  updateService,
} from './service-management';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const service = {
  id: 'service-a',
  name: 'Evaluation',
  description: 'Initial evaluation',
  durationMinutes: 30,
  price: {
    minorUnits: 12_000_000,
    currencyCode: 'COP',
  },
  isActive: true,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

const input = {
  name: 'Evaluation',
  description: 'Initial evaluation',
  durationMinutes: 30,
  price: {
    minorUnits: 12_000_000,
    currencyCode: 'COP',
  },
};

describe('service management API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(getServiceList('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('returns services from the API', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [service],
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

    await expect(getServiceList('access-token')).resolves.toEqual({
      items: [service],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/services',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer access-token',
        }),
        cache: 'no-store',
      }),
    );
  });

  it('maps authentication and tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 403,
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getServiceList('access-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );

    await expect(getServiceList('access-token')).rejects.toBeInstanceOf(
      ApiTenantResolutionError,
    );
  });

  it('rejects malformed service responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...service,
                price: {
                  minorUnits: 1000,
                  currencyCode: 'CO',
                },
              },
            ],
          }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(getServiceList('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });

  it('creates a service', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          service,
        }),
        {
          status: 201,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(createService('access-token', input)).resolves.toEqual(
      service,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/services',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
        headers: expect.objectContaining({
          authorization: 'Bearer access-token',
          'content-type': 'application/json',
        }),
      }),
    );
  });

  it('updates a service', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          service,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      updateService('access-token', 'service-a', input),
    ).resolves.toEqual(service);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/services/service-a',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    );
  });

  it('rejects an empty service id locally', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    await expect(
      updateService('access-token', '   ', input),
    ).rejects.toBeInstanceOf(ServiceMutationInvalidError);
  });

  it('maps missing services to not found', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
        }),
      ),
    );

    await expect(
      updateService('access-token', 'missing-service', input),
    ).rejects.toBeInstanceOf(ServiceNotFoundError);
  });

  it('updates service activation state', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const inactiveService = {
      ...service,
      isActive: false,
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          service: inactiveService,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      setServiceActive('access-token', 'service-a', false),
    ).resolves.toEqual(inactiveService);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/services/service-a/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isActive: false,
        }),
      }),
    );
  });
});
