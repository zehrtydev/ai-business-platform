'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  AvailabilityRuleMutationInvalidError,
  AvailabilityRuleNotFoundError,
  createAvailabilityRule,
  setAvailabilityRuleActive,
  updateAvailabilityRule,
  type AvailabilityRuleMutationInput,
} from '../../../lib/api/availability-rule-management';
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

function availabilityRuleInputFromFormData(
  formData: FormData,
): AvailabilityRuleMutationInput {
  const staffMemberId = readString(formData, 'staffMemberId');
  const dayOfWeekValue = readString(formData, 'dayOfWeek');
  const startTime = readString(formData, 'startTime');
  const endTime = readString(formData, 'endTime');

  const dayOfWeek = dayOfWeekValue ? Number(dayOfWeekValue) : Number.NaN;

  if (
    !staffMemberId ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7 ||
    !startTime ||
    !endTime ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    startTime >= endTime
  ) {
    throw new AvailabilityRuleMutationInvalidError();
  }

  return {
    staffMemberId,
    dayOfWeek,
    startTime,
    endTime,
  };
}

export async function createAvailabilityRuleAction(formData: FormData) {
  const accessToken = await authenticatedAccessToken();

  try {
    await createAvailabilityRule(
      accessToken,
      availabilityRuleInputFromFormData(formData),
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AvailabilityRuleMutationInvalidError) {
      redirect('/availability?create=invalid');
    }

    if (error instanceof AvailabilityRuleNotFoundError) {
      redirect('/availability?create=not_found');
    }

    throw error;
  }

  revalidatePath('/availability');
  revalidatePath('/appointments');

  redirect('/availability?create=success');
}

export async function updateAvailabilityRuleAction(formData: FormData) {
  const availabilityRuleId = readString(formData, 'availabilityRuleId');

  if (!availabilityRuleId) {
    redirect('/availability?update=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await updateAvailabilityRule(
      accessToken,
      availabilityRuleId,
      availabilityRuleInputFromFormData(formData),
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AvailabilityRuleMutationInvalidError) {
      redirect('/availability?update=invalid');
    }

    if (error instanceof AvailabilityRuleNotFoundError) {
      redirect('/availability?update=not_found');
    }

    throw error;
  }

  revalidatePath('/availability');
  revalidatePath('/appointments');

  redirect('/availability?update=success');
}

export async function setAvailabilityRuleActiveAction(formData: FormData) {
  const availabilityRuleId = readString(formData, 'availabilityRuleId');
  const isActiveValue = readString(formData, 'isActive');

  if (
    !availabilityRuleId ||
    (isActiveValue !== 'true' && isActiveValue !== 'false')
  ) {
    redirect('/availability?status=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await setAvailabilityRuleActive(
      accessToken,
      availabilityRuleId,
      isActiveValue === 'true',
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof AvailabilityRuleMutationInvalidError) {
      redirect('/availability?status=invalid');
    }

    if (error instanceof AvailabilityRuleNotFoundError) {
      redirect('/availability?status=not_found');
    }

    throw error;
  }

  revalidatePath('/availability');
  revalidatePath('/appointments');

  redirect(
    `/availability?status=success&active=${encodeURIComponent(isActiveValue)}`,
  );
}
