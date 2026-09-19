import { Injectable } from '@nestjs/common';

import type {
  AccessTokenVerifier,
  AuthenticatedIdentity,
} from './auth.types.js';

export class SupabaseAuthConfigurationError extends Error {
  constructor() {
    super(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for authentication.',
    );
    this.name = 'SupabaseAuthConfigurationError';
  }
}

export class SupabaseAuthUpstreamError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SupabaseAuthUpstreamError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class SupabaseAuthVerifier implements AccessTokenVerifier {
  async verifyAccessToken(
    accessToken: string,
  ): Promise<AuthenticatedIdentity | null> {
    const url = process.env.SUPABASE_URL?.trim();
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!url || !publishableKey) {
      throw new SupabaseAuthConfigurationError();
    }

    let response: Response;

    try {
      response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: publishableKey,
          authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      throw new SupabaseAuthUpstreamError(
        'Supabase Auth could not be reached.',
        {
          cause: error,
        },
      );
    }

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      throw new SupabaseAuthUpstreamError(
        `Supabase Auth returned HTTP ${response.status}.`,
      );
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      throw new SupabaseAuthUpstreamError(
        'Supabase Auth returned an invalid user payload.',
      );
    }

    const userId = payload.id;

    if (typeof userId !== 'string' || !userId.trim()) {
      throw new SupabaseAuthUpstreamError(
        'Supabase Auth returned a user without an identifier.',
      );
    }

    const email = payload.email;

    return {
      userId,
      ...(typeof email === 'string' && email ? { email } : {}),
    };
  }
}
