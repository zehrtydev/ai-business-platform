import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAppointmentList } from './appointment-list';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const validAppointment = {
  id: 'appointment-a',
  status: 'SCHEDULED',
  startsAt: '2026-09-21T14:00:00.000Z',
  endsAt: '2026-09-21T14:30:00.000Z',
  createdAt: '2026-09-20T02:00:00.000Z',
  updatedAt: '2026-09-20T02:00:00.000Z',
  contact: {
    id: 'contact-a',
    name: 'Contact A',
    phone: '+10000000001',
    email: 'contact-a@example.com',
  },
  service: {
    id: 'service-a',
    name: 'Evaluation',
    durationMinutes: 30,
  },
  staffMember: {
    id: 'staff-a',
    name: 'Staff A',
  },
};

describe('getAppointmentList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      getAppointmentList('access-token'),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('returns appointments from the API', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [validAppointment],
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getAppointmentList('access-token')).resolves.toEqual({
      items: [validAppointment],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/appointments',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('accepts an empty appointment list', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [] }), { status: 200 }),
      ),
    );

    await expect(getAppointmentList('access-token')).resolves.toEqual({
      items: [],
    });
  });

  it('maps authentication and tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getAppointmentList('access-token'),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);

    await expect(
      getAppointmentList('access-token'),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed appointment responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...validAppointment,
                status: 'INVALID',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      getAppointmentList('access-token'),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
