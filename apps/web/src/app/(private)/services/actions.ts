'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  createService,
  ServiceMutationInvalidError,
  ServiceNotFoundError,
  setServiceActive,
  updateService,
  type ServicePrice,
} from '../../../lib/api/service-management';
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

function currencyFractionDigits(currencyCode: string): number {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function parsePrice(
  amountValue: string | null,
  currencyValue: string | null,
): ServicePrice | null {
  if (!amountValue) {
    return null;
  }

  const currencyCode = currencyValue?.toUpperCase() ?? '';

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new ServiceMutationInvalidError();
  }

  if (!/^\d+(?:\.\d+)?$/.test(amountValue)) {
    throw new ServiceMutationInvalidError();
  }

  const fractionDigits = currencyFractionDigits(currencyCode);

  const [whole = '', fraction = ''] = amountValue.split('.');

  if (fraction.length > fractionDigits) {
    throw new ServiceMutationInvalidError();
  }

  const paddedFraction = fraction.padEnd(fractionDigits, '0');

  const minorUnits = Number(`${whole}${paddedFraction}`);

  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
    throw new ServiceMutationInvalidError();
  }

  return {
    minorUnits,
    currencyCode,
  };
}

function serviceInputFromFormData(formData: FormData) {
  const name = readString(formData, 'name');
  const description = readString(formData, 'description') || null;
  const durationValue = readString(formData, 'durationMinutes');

  const durationMinutes = durationValue ? Number(durationValue) : Number.NaN;

  if (!name || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new ServiceMutationInvalidError();
  }

  return {
    name,
    description,
    durationMinutes,
    price: parsePrice(
      readString(formData, 'priceAmount'),
      readString(formData, 'currencyCode'),
    ),
  };
}

export async function createServiceAction(formData: FormData) {
  const accessToken = await authenticatedAccessToken();

  try {
    await createService(accessToken, serviceInputFromFormData(formData));
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ServiceMutationInvalidError) {
      redirect('/services?create=invalid');
    }

    throw error;
  }

  revalidatePath('/services');
  revalidatePath('/appointments');

  redirect('/services?create=success');
}

export async function updateServiceAction(formData: FormData) {
  const serviceId = readString(formData, 'serviceId');

  if (!serviceId) {
    redirect('/services?update=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await updateService(
      accessToken,
      serviceId,
      serviceInputFromFormData(formData),
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ServiceMutationInvalidError) {
      redirect('/services?update=invalid');
    }

    if (error instanceof ServiceNotFoundError) {
      redirect('/services?update=not_found');
    }

    throw error;
  }

  revalidatePath('/services');
  revalidatePath('/appointments');

  redirect('/services?update=success');
}

export async function setServiceActiveAction(formData: FormData) {
  const serviceId = readString(formData, 'serviceId');
  const isActiveValue = readString(formData, 'isActive');

  if (!serviceId || (isActiveValue !== 'true' && isActiveValue !== 'false')) {
    redirect('/services?status=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await setServiceActive(accessToken, serviceId, isActiveValue === 'true');
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ServiceMutationInvalidError) {
      redirect('/services?status=invalid');
    }

    if (error instanceof ServiceNotFoundError) {
      redirect('/services?status=not_found');
    }

    throw error;
  }

  revalidatePath('/services');
  revalidatePath('/appointments');

  redirect(
    `/services?status=success&active=${encodeURIComponent(isActiveValue)}`,
  );
}
