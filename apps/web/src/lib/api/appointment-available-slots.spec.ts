import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AppointmentAvailableSlotsConfigurationError,
  AppointmentAvailableSlotsInvalidError,
  AppointmentAvailableSlotsNotFoundError,
  getAppointmentAvailableSlots,
} from './appointment-available-slots';
import { ApiConfigurationError, ApiUpstreamError } from './tenant-context';

const input = {
  serviceId: 'service-a',
  staffMemberId: 'staff-a',
  date: '2026-09-21',
};

describe('getAppointmentAvailableSlots', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('returns available appointment slots', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          timezone: 'America/Bogota',
          date: '2026-09-21',
          serviceId: 'service-a',
          staffMemberId: 'staff-a',
          serviceDurationMinutes: 30,
          slotIntervalMinutes: 30,
          slots: [
            {
              startsAt: '2026-09-21T14:00:00.000Z',
              endsAt: '2026-09-21T14:30:00.000Z',
            },
          ],
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).resolves.toEqual({
      timezone: 'America/Bogota',
      date: '2026-09-21',
      serviceId: 'service-a',
      staffMemberId: 'staff-a',
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      slots: [
        {
          startsAt: '2026-09-21T14:00:00.000Z',
          endsAt: '2026-09-21T14:30:00.000Z',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/appointments/available-slots?serviceId=service-a&staffMemberId=staff-a&date=2026-09-21',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps invalid availability requests', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 400 })),
    );

    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).rejects.toBeInstanceOf(AppointmentAvailableSlotsInvalidError);
  });

  it('maps missing availability resources', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).rejects.toBeInstanceOf(AppointmentAvailableSlotsNotFoundError);
  });

  it('maps invalid staff service configuration', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 409 })),
    );

    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).rejects.toBeInstanceOf(AppointmentAvailableSlotsConfigurationError);
  });

  it('rejects malformed availability responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            timezone: 'America/Bogota',
            slots: 'invalid',
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      getAppointmentAvailableSlots('access-token', input),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
