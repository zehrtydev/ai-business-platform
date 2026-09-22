'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  ConversationControlConflictError,
  requestConversationHandoff,
  resumeConversationAi,
  takeOverConversation,
} from '../../../../lib/api/conversation-control';
import { ConversationNotFoundError } from '../../../../lib/api/conversation-detail';
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

function revalidateConversation(conversationId: string): void {
  revalidatePath('/conversations');
  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath('/dashboard');
}

async function runConversationControl(
  formData: FormData,
  mutation: (
    accessToken: string,
    conversationId: string,
  ) => Promise<unknown>,
) {
  const conversationId = readString(formData, 'conversationId');

  if (!conversationId) {
    redirect('/conversations');
  }

  const accessToken = await authenticatedAccessToken();

  try {
    await mutation(accessToken, conversationId);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ConversationNotFoundError) {
      redirect('/conversations');
    }

    if (error instanceof ConversationControlConflictError) {
      redirect(
        `/conversations/${encodeURIComponent(
          conversationId,
        )}?control=conflict`,
      );
    }

    throw error;
  }

  revalidateConversation(conversationId);

  redirect(`/conversations/${encodeURIComponent(conversationId)}`);
}

export async function requestHandoffAction(formData: FormData) {
  return runConversationControl(formData, requestConversationHandoff);
}

export async function takeOverAction(formData: FormData) {
  return runConversationControl(formData, takeOverConversation);
}

export async function resumeAiAction(formData: FormData) {
  return runConversationControl(formData, resumeConversationAi);
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

  const accessToken = await authenticatedAccessToken();

  try {
    await createDevelopmentInboundMessage(
      accessToken,
      conversationId,
      content,
    );
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

  revalidateConversation(conversationId);
  revalidatePath('/contacts');

  redirect(
    `/conversations/${encodeURIComponent(conversationId)}?simulation=created`,
  );
}
