import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createStaffMember,
  getStaffList,
  setStaffMemberActive,
  StaffMutationInvalidError,
  StaffNotFoundError,
  updateStaffMember,
} from './staff-management';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const staffMember = {
  id: 'staff-a',
  name: 'Doctor A',
  isActive: true,
  services: [
    {
      id: 'service-a',
      name: 'Evaluation',
      isActive: true,
    },
  ],
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

const input = {
  name: 'Doctor A',
  serviceIds: ['service-a'],
};

describe('staff management API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(getStaffList('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('returns staff from the API', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [staffMember],
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

    await expect(getStaffList('access-token')).resolves.toEqual({
      items: [staffMember],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/staff',
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

    await expect(getStaffList('access-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );

    await expect(getStaffList('access-token')).rejects.toBeInstanceOf(
      ApiTenantResolutionError,
    );
  });

  it('rejects malformed staff responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...staffMember,
                services: [
                  {
                    id: 'service-a',
                    name: 'Evaluation',
                    isActive: 'yes',
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(getStaffList('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });

  it('creates a staff member', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          staffMember,
        }),
        {
          status: 201,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(createStaffMember('access-token', input)).resolves.toEqual(
      staffMember,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/staff',
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

  it('updates a staff member', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          staffMember,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      updateStaffMember('access-token', 'staff-a', input),
    ).resolves.toEqual(staffMember);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/staff/staff-a',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    );
  });

  it('rejects an empty staff member id locally', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    await expect(
      updateStaffMember('access-token', '   ', input),
    ).rejects.toBeInstanceOf(StaffMutationInvalidError);
  });

  it('maps missing staff or services to not found', async () => {
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
      updateStaffMember('access-token', 'missing-staff', input),
    ).rejects.toBeInstanceOf(StaffNotFoundError);
  });

  it('updates staff activation state', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const inactiveStaffMember = {
      ...staffMember,
      isActive: false,
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          staffMember: inactiveStaffMember,
        }),
        {
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      setStaffMemberActive('access-token', 'staff-a', false),
    ).resolves.toEqual(inactiveStaffMember);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/staff/staff-a/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          isActive: false,
        }),
      }),
    );
  });
});
