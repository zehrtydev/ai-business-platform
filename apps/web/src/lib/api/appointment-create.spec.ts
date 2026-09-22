import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AppointmentCreateConflictError,
  createAppointment,
  type AppointmentConflictReason,
} from './appointment-create';
import { ApiConfigurationError } from './tenant-context';

const input = {
  contactId: 'contact-a',
  serviceId: 'service-a',
  staffMemberId: 'staff-a',
  startsAt: '2026-09-21T14:00:00.000Z',
};

describe('createAppointment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      createAppointment('access-token', input),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('accepts a successful appointment creation', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            appointment: {
              id: 'appointment-a',
            },
          }),
          {
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(
      createAppointment('access-token', input),
    ).resolves.toBeUndefined();
  });

  it.each<AppointmentConflictReason>([
    'past',
    'unavailable_day',
    'outside_hours',
    'overlap',
    'configuration',
  ])('preserves the %s conflict reason', async (reason) => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 409,
            message:
              'Appointment cannot be scheduled with the requested configuration.',
            reason,
          }),
          {
            status: 409,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    try {
      await createAppointment('access-token', input);

      throw new Error('Expected createAppointment to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(AppointmentCreateConflictError);
      expect(
        (error as AppointmentCreateConflictError).reason,
      ).toBe(reason);
    }
  });
});
