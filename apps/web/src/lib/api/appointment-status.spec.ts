import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiUpstreamError } from './tenant-context';
import {
  AppointmentStatusConflictError,
  AppointmentStatusInvalidError,
  AppointmentStatusNotFoundError,
  updateAppointmentStatus,
} from './appointment-status';

const originalApiBaseUrl = process.env.API_BASE_URL;

describe('updateAppointmentStatus', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.example.test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    if (originalApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = originalApiBaseUrl;
    }
  });

  it('updates an appointment lifecycle status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          appointment: {
            id: 'appointment-a',
            status: 'COMPLETED',
            updatedAt: '2026-09-22T01:30:00.000Z',
          },
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

    await expect(
      updateAppointmentStatus('access-token', {
        appointmentId: 'appointment-a',
        status: 'COMPLETED',
      }),
    ).resolves.toEqual({
      id: 'appointment-a',
      status: 'COMPLETED',
      updatedAt: '2026-09-22T01:30:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/appointments/appointment-a/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      }),
    );
  });

  it('rejects invalid local input', async () => {
    await expect(
      updateAppointmentStatus('access-token', {
        appointmentId: '',
        status: 'CANCELLED',
      }),
    ).rejects.toBeInstanceOf(AppointmentStatusInvalidError);
  });

  it('maps 404 to not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
        }),
      ),
    );

    await expect(
      updateAppointmentStatus('access-token', {
        appointmentId: 'missing-appointment',
        status: 'CANCELLED',
      }),
    ).rejects.toBeInstanceOf(AppointmentStatusNotFoundError);
  });

  it('exposes the current status on lifecycle conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Only scheduled appointments can change lifecycle status.',
            currentStatus: 'COMPLETED',
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
      await updateAppointmentStatus('access-token', {
        appointmentId: 'appointment-a',
        status: 'NO_SHOW',
      });

      throw new Error('Expected updateAppointmentStatus to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(AppointmentStatusConflictError);
      expect((error as AppointmentStatusConflictError).currentStatus).toBe(
        'COMPLETED',
      );
    }
  });

  it('rejects malformed conflict responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            currentStatus: 'UNKNOWN',
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

    await expect(
      updateAppointmentStatus('access-token', {
        appointmentId: 'appointment-a',
        status: 'CANCELLED',
      }),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });

  it('rejects malformed success responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            appointment: {
              id: 'appointment-a',
              status: 'SCHEDULED',
              updatedAt: 'invalid',
            },
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
      updateAppointmentStatus('access-token', {
        appointmentId: 'appointment-a',
        status: 'COMPLETED',
      }),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
