import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type {
  AccessTokenVerifier,
  AuthenticatedIdentity,
  AuthenticatedRequest,
} from './auth.types.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

class FakeAccessTokenVerifier implements AccessTokenVerifier {
  lastToken?: string;

  constructor(
    private readonly identities: Readonly<
      Record<string, AuthenticatedIdentity>
    >,
  ) {}

  async verifyAccessToken(
    accessToken: string,
  ): Promise<AuthenticatedIdentity | null> {
    this.lastToken = accessToken;
    return this.identities[accessToken] ?? null;
  }
}

function createExecutionContext(
  request: AuthenticatedRequest,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  it('rejects a request without Authorization', async () => {
    const guard = new SupabaseAuthGuard(new FakeAccessTokenVerifier({}));

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a non-Bearer authorization scheme', async () => {
    const guard = new SupabaseAuthGuard(new FakeAccessTokenVerifier({}));

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: 'Basic abc',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an ambiguous authorization header', async () => {
    const guard = new SupabaseAuthGuard(new FakeAccessTokenVerifier({}));

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: ['Bearer token-a', 'Bearer token-b'],
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token that fails verification', async () => {
    const guard = new SupabaseAuthGuard(new FakeAccessTokenVerifier({}));

    await expect(
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: 'Bearer invalid-token',
          },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('populates authenticated identity after verification', async () => {
    const verifier = new FakeAccessTokenVerifier({
      'valid-token': {
        userId: 'user-a',
        email: 'user@example.com',
      },
    });

    const guard = new SupabaseAuthGuard(verifier);

    const request: AuthenticatedRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(verifier.lastToken).toBe('valid-token');

    expect(request.authenticatedUserId).toBe('user-a');

    expect(request.authenticatedIdentity).toEqual({
      userId: 'user-a',
      email: 'user@example.com',
    });
  });
});
