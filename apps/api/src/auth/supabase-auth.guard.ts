import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AUTH_ACCESS_TOKEN_VERIFIER } from './auth.tokens.js';
import type {
  AccessTokenVerifier,
  AuthenticatedRequest,
} from './auth.types.js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_ACCESS_TOKEN_VERIFIER)
    private readonly verifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const accessToken = this.readBearerToken(request.headers.authorization);

    const identity = await this.verifier.verifyAccessToken(accessToken);

    if (!identity) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    request.authenticatedUserId = identity.userId;
    request.authenticatedIdentity = identity;

    return true;
  }

  private readBearerToken(value: string | string[] | undefined): string {
    if (typeof value !== 'string') {
      throw new UnauthorizedException('Bearer access token is required.');
    }

    const match = /^Bearer +([A-Za-z0-9._-]+)$/i.exec(value.trim());

    const accessToken = match?.[1];

    if (!accessToken) {
      throw new UnauthorizedException('Bearer access token is required.');
    }

    return accessToken;
  }
}
