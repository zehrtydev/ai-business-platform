'use server';

import { redirect } from 'next/navigation';

import { createClient } from '../../lib/supabase/server';

function readRequiredString(
  formData: FormData,
  field: string,
  trim: boolean,
): string {
  const value = formData.get(field);

  if (typeof value !== 'string' || !value.trim()) {
    redirect('/login?error=invalid_credentials');
  }

  return trim ? value.trim() : value;
}

export async function login(formData: FormData) {
  const email = readRequiredString(formData, 'email', true);
  const password = readRequiredString(formData, 'password', false);

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect('/login?error=invalid_credentials');
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect('/login');
}
