import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AvailabilityRuleMutationInvalidError,
  AvailabilityRuleNotFoundError,
  createAvailabilityRule,
  getAvailabilityRuleList,
  setAvailabilityRuleActive,
  updateAvailabilityRule,
} from './availability-rule-management';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const availabilityRule = {
  id: 'rule-a',
  staffMemberId: 'staff-a',
  dayOfWeek: 1,
  startTime: '08:00:00',
  endTime: '12:00:00',
  isActive: true,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

const input = {
  staffMemberId: 'staff-a',
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '12:00',
};

describe('availability rule management API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      getAvailabilityRuleList('access-token'),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('returns availability rules from the API', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [availabilityRule],
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

    await expect(getAvailabilityRuleList('access-token')).resolves.toEqual({
      items: [availabilityRule],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/availability-rules',
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

    await expect(
      getAvailabilityRuleList('access-token'),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);

    await expect(
      getAvailabilityRuleList('access-token'),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed availability rule responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...availabilityRule,
                dayOfWeek: 8,
              },
            ],
          }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(
      getAvailabilityRuleList('access-token'),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });

  it('creates an availability rule', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          availabilityRule,
        }),
        {
          status: 201,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createAvailabilityRule('access-token', input),
    ).resolves.toEqual(availabilityRule);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/availability-rules',
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

  it('updates an availability rule', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          availabilityRule,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      updateAvailabilityRule('access-token', 'rule-a', input),
    ).resolves.toEqual(availabilityRule);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/availability-rules/rule-a',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    );
  });

  it('rejects an empty availability rule id locally', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    await expect(
      updateAvailabilityRule('access-token', '   ', input),
    ).rejects.toBeInstanceOf(AvailabilityRuleMutationInvalidError);
  });

  it('maps missing rules or staff to not found', async () => {
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
      updateAvailabilityRule('access-token', 'missing-rule', input),
    ).rejects.toBeInstanceOf(AvailabilityRuleNotFoundError);
  });

  it('updates availability rule activation state', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const inactiveAvailabilityRule = {
      ...availabilityRule,
      isActive: false,
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          availabilityRule: inactiveAvailabilityRule,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      setAvailabilityRuleActive('access-token', 'rule-a', false),
    ).resolves.toEqual(inactiveAvailabilityRule);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/availability-rules/rule-a/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isActive: false,
        }),
      }),
    );
  });
});
