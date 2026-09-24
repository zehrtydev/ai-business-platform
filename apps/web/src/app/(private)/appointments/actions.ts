'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  AppointmentAvailableSlotsConfigurationError,
  AppointmentAvailableSlotsInvalidError,
  AppointmentAvailableSlotsNotFoundError,
  getAppointmentAvailableSlots,
  type AppointmentAvailableSlotsInput,
} from '../../../lib/api/appointment-available-slots';
import {
  AppointmentCreateConflictError,
  AppointmentCreateInvalidError,
  AppointmentCreateNotFoundError,
  createAppointment,
} from '../../../lib/api/appointment-create';
import {
  AppointmentStatusConflictError,
  AppointmentStatusInvalidError,
  AppointmentStatusNotFoundError,
  updateAppointmentStatus,
} from '../../../lib/api/appointment-status';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';

function readString(formData: FormData, field: string): string | null {
  const value = formData.get(field);

  return typeof value === 'string' ? value.trim() : null;
}

async function authenticatedAccessToken(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  return accessToken;
}

export async function getAppointmentAvailableSlotsAction(
  input: AppointmentAvailableSlotsInput,
) {
  const accessToken = await authenticatedAccessToken();

  try {
    const availability = await getAppointmentAvailableSlots(accessToken, input);

    return {
      kind: 'success' as const,
      availability,
    };
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AppointmentAvailableSlotsInvalidError) {
      return {
        kind: 'invalid' as const,
      };
    }

    if (
      error instanceof AppointmentAvailableSlotsNotFoundError ||
      error instanceof AppointmentAvailableSlotsConfigurationError
    ) {
      return {
        kind: 'unavailable' as const,
      };
    }

    throw error;
  }
}

export async function createAppointmentAction(formData: FormData) {
  const contactId = readString(formData, 'contactId');
  const serviceId = readString(formData, 'serviceId');
  const staffMemberId = readString(formData, 'staffMemberId');
  const date = readString(formData, 'date');
  const startsAtValue = readString(formData, 'startsAt');

  if (!contactId || !serviceId || !staffMemberId || !date || !startsAtValue) {
    redirect('/appointments?create=invalid');
  }

  const parsedStartsAt = new Date(startsAtValue);

  if (Number.isNaN(parsedStartsAt.getTime())) {
    redirect('/appointments?create=invalid');
  }

  const startsAt = parsedStartsAt.toISOString();
  const accessToken = await authenticatedAccessToken();

  let availability;

  try {
    availability = await getAppointmentAvailableSlots(accessToken, {
      serviceId,
      staffMemberId,
      date,
    });
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AppointmentAvailableSlotsInvalidError) {
      redirect('/appointments?create=invalid');
    }

    if (
      error instanceof AppointmentAvailableSlotsNotFoundError ||
      error instanceof AppointmentAvailableSlotsConfigurationError
    ) {
      redirect('/appointments?create=unavailable');
    }

    throw error;
  }

  const slotIsStillAvailable = availability.slots.some(
    (slot) => slot.startsAt === startsAt,
  );

  if (!slotIsStillAvailable) {
    redirect('/appointments?create=unavailable');
  }

  try {
    await createAppointment(accessToken, {
      contactId,
      serviceId,
      staffMemberId,
      startsAt,
    });
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AppointmentCreateInvalidError) {
      redirect('/appointments?create=invalid');
    }

    if (error instanceof AppointmentCreateNotFoundError) {
      redirect('/appointments?create=unavailable');
    }

    if (error instanceof AppointmentCreateConflictError) {
      redirect(
        `/appointments?create=conflict&reason=${encodeURIComponent(
          error.reason,
        )}`,
      );
    }

    throw error;
  }

  revalidatePath('/appointments');
  revalidatePath('/dashboard');

  redirect('/appointments?create=success');
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const appointmentId = readString(formData, 'appointmentId');
  const status = readString(formData, 'status');

  if (
    !appointmentId ||
    (status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'NO_SHOW')
  ) {
    redirect('/appointments?update=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await updateAppointmentStatus(accessToken, {
      appointmentId,
      status,
    });
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AppointmentStatusInvalidError) {
      redirect('/appointments?update=invalid');
    }

    if (error instanceof AppointmentStatusNotFoundError) {
      redirect('/appointments?update=not_found');
    }

    if (error instanceof AppointmentStatusConflictError) {
      redirect(
        `/appointments?update=conflict&currentStatus=${encodeURIComponent(
          error.currentStatus,
        )}`,
      );
    }

    throw error;
  }

  revalidatePath('/appointments');
  revalidatePath('/dashboard');

  redirect(
    `/appointments?update=success&appointmentStatus=${encodeURIComponent(
      status,
    )}`,
  );
}
