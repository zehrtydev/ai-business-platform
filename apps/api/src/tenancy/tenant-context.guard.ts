import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  InvalidAuthenticatedIdentityError,
  TenantAccessDeniedError,
  type TenantContext,
  TenantResolver,
  TenantSelectionRequiredError,
} from './tenant-resolver.js';

export interface TenantRequest {
  authenticatedUserId?: string;
  tenantContext?: TenantContext;
  headers: {
    'x-business-id'?: string | string[];
  };
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantResolver: TenantResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();

    const requestedBusinessId = this.readBusinessSelection(
      request.headers['x-business-id'],
    );

    try {
      request.tenantContext =
        await this.tenantResolver.resolveForAuthenticatedUser(
          request.authenticatedUserId ?? '',
          requestedBusinessId,
        );

      return true;
    } catch (error) {
      if (error instanceof InvalidAuthenticatedIdentityError) {
        throw new UnauthorizedException('Authenticated identity is required.');
      }

      if (error instanceof TenantAccessDeniedError) {
        throw new ForbiddenException(
          'The authenticated user cannot access this tenant.',
        );
      }

      if (error instanceof TenantSelectionRequiredError) {
        throw new BadRequestException(
          'An explicit tenant selection is required.',
        );
      }

      throw error;
    }
  }

  private readBusinessSelection(
    value: string | string[] | undefined,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      throw new BadRequestException('x-business-id must contain one value.');
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException('x-business-id must not be blank.');
    }

    return normalizedValue;
  }
}
