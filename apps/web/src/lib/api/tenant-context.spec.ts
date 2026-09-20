import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiUpstreamError,
  getTenantContext,
} from './tenant-context';

describe('getTenantContext', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires API configuration', async () => {
    vi.stubEnv('API_BASE_URL', '');

    await expect(getTenantContext('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('forwards the access token and returns tenant context', async () => {
    vi.stubEnv('API_BASE_URL', 'http://127.0.0.1:3001/');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'user-a',
          membershipId: 'membership-a',
          businessId: 'business-a',
          role: 'owner',
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

    await expect(getTenantContext('access-token')).resolves.toEqual({
      userId: 'user-a',
      membershipId: 'membership-a',
      businessId: 'business-a',
      role: 'owner',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/tenant/context',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps API 401 to authentication failure', async () => {
    vi.stubEnv('API_BASE_URL', 'http://127.0.0.1:3001');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    );

    await expect(getTenantContext('invalid-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );
  });

  it('rejects an invalid API payload', async () => {
    vi.stubEnv('API_BASE_URL', 'http://127.0.0.1:3001');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            userId: 'user-a',
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

    await expect(getTenantContext('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });
});
