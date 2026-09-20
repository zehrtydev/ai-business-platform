'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  createDevelopmentInboundMessage,
  DevelopmentConversationUnavailableError,
} from '../../../../lib/api/development-message';
import { ApiAuthenticationError } from '../../../../lib/api/tenant-context';
import { createClient } from '../../../../lib/supabase/server';

function readString(formData: FormData, field: string): string | null {
  const value = formData.get(field);

  return typeof value === 'string' ? value.trim() : null;
}

export async function simulateInboundMessage(formData: FormData) {
  const conversationId = readString(formData, 'conversationId');

  if (!conversationId) {
    redirect('/conversations');
  }

  const content = readString(formData, 'content');

  if (!content || content.length > 4_000) {
    redirect(
      `/conversations/${encodeURIComponent(conversationId)}?simulation=invalid`,
    );
  }

  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  try {
    await createDevelopmentInboundMessage(accessToken, conversationId, content);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof DevelopmentConversationUnavailableError) {
      redirect(
        `/conversations/${encodeURIComponent(
          conversationId,
        )}?simulation=unavailable`,
      );
    }

    throw error;
  }

  revalidatePath('/conversations');
  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath('/contacts');
  revalidatePath('/dashboard');

  redirect(
    `/conversations/${encodeURIComponent(conversationId)}?simulation=created`,
  );
}
