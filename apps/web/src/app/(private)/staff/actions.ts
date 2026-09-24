'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  createStaffMember,
  setStaffMemberActive,
  StaffMutationInvalidError,
  StaffNotFoundError,
  updateStaffMember,
  type StaffMutationInput,
} from '../../../lib/api/staff-management';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';

function readString(formData: FormData, field: string): string | null {
  const value = formData.get(field);

  return typeof value === 'string' ? value.trim() : null;
}

function readServiceIds(formData: FormData): string[] {
  return formData
    .getAll('serviceIds')
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
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

function staffInputFromFormData(formData: FormData): StaffMutationInput {
  const name = readString(formData, 'name');

  if (!name) {
    throw new StaffMutationInvalidError();
  }

  return {
    name,
    serviceIds: readServiceIds(formData),
  };
}

export async function createStaffMemberAction(formData: FormData) {
  const accessToken = await authenticatedAccessToken();

  try {
    await createStaffMember(accessToken, staffInputFromFormData(formData));
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof StaffMutationInvalidError) {
      redirect('/staff?create=invalid');
    }

    if (error instanceof StaffNotFoundError) {
      redirect('/staff?create=not_found');
    }

    throw error;
  }

  revalidatePath('/staff');
  revalidatePath('/appointments');

  redirect('/staff?create=success');
}

export async function updateStaffMemberAction(formData: FormData) {
  const staffMemberId = readString(formData, 'staffMemberId');

  if (!staffMemberId) {
    redirect('/staff?update=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await updateStaffMember(
      accessToken,
      staffMemberId,
      staffInputFromFormData(formData),
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof StaffMutationInvalidError) {
      redirect('/staff?update=invalid');
    }

    if (error instanceof StaffNotFoundError) {
      redirect('/staff?update=not_found');
    }

    throw error;
  }

  revalidatePath('/staff');
  revalidatePath('/appointments');

  redirect('/staff?update=success');
}

export async function setStaffMemberActiveAction(formData: FormData) {
  const staffMemberId = readString(formData, 'staffMemberId');
  const isActiveValue = readString(formData, 'isActive');

  if (
    !staffMemberId ||
    (isActiveValue !== 'true' && isActiveValue !== 'false')
  ) {
    redirect('/staff?status=invalid');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await setStaffMemberActive(
      accessToken,
      staffMemberId,
      isActiveValue === 'true',
    );
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof StaffMutationInvalidError) {
      redirect('/staff?status=invalid');
    }

    if (error instanceof StaffNotFoundError) {
      redirect('/staff?status=not_found');
    }

    throw error;
  }

  revalidatePath('/staff');
  revalidatePath('/appointments');

  redirect(`/staff?status=success&active=${encodeURIComponent(isActiveValue)}`);
}
