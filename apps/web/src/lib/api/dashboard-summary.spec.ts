import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';
import { getDashboardSummary } from './dashboard-summary';

describe('getDashboardSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(getDashboardSummary('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('forwards the bearer token and returns a valid summary', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          leadsReceived: 12,
          openConversations: 5,
          scheduledAppointments: 3,
          humanHandoffs: 2,
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

    await expect(getDashboardSummary('access-token')).resolves.toEqual({
      leadsReceived: 12,
      openConversations: 5,
      scheduledAppointments: 3,
      humanHandoffs: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/dashboard/summary',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps API authentication failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(getDashboardSummary('access-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );
  });

  it('maps tenant resolution failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(getDashboardSummary('access-token')).rejects.toBeInstanceOf(
      ApiTenantResolutionError,
    );
  });

  it('rejects malformed API payloads', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            leadsReceived: -1,
            openConversations: 5,
            scheduledAppointments: 3,
            humanHandoffs: 2,
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

    await expect(getDashboardSummary('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });
});
