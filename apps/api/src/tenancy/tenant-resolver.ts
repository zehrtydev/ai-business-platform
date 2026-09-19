import { Inject, Injectable } from '@nestjs/common';

import { TENANT_MEMBERSHIP_READER } from './tenancy.tokens.js';

export type TenantRole = 'owner' | 'admin' | 'member';

export interface TenantMembership {
  membershipId: string;
  businessId: string;
  role: TenantRole;
}

export interface TenantMembershipReader {
  listForUser(userId: string): Promise<readonly TenantMembership[]>;
}

export interface TenantContext {
  userId: string;
  membershipId: string;
  businessId: string;
  role: TenantRole;
}

export class InvalidAuthenticatedIdentityError extends Error {
  constructor() {
    super('Authenticated user identity is required.');
    this.name = 'InvalidAuthenticatedIdentityError';
  }
}

export class TenantAccessDeniedError extends Error {
  constructor() {
    super(
      'The authenticated user does not have access to the requested tenant.',
    );
    this.name = 'TenantAccessDeniedError';
  }
}

export class TenantSelectionRequiredError extends Error {
  constructor() {
    super('An explicit tenant selection is required.');
    this.name = 'TenantSelectionRequiredError';
  }
}

@Injectable()
export class TenantResolver {
  constructor(
    @Inject(TENANT_MEMBERSHIP_READER)
    private readonly memberships: TenantMembershipReader,
  ) {}

  async resolveForAuthenticatedUser(
    authenticatedUserId: string,
    requestedBusinessId?: string | null,
  ): Promise<TenantContext> {
    const userId = authenticatedUserId.trim();

    if (!userId) {
      throw new InvalidAuthenticatedIdentityError();
    }

    const availableMemberships = await this.memberships.listForUser(userId);
    const normalizedRequestedBusinessId = requestedBusinessId?.trim();

    if (normalizedRequestedBusinessId) {
      const membership = availableMemberships.find(
        (candidate) => candidate.businessId === normalizedRequestedBusinessId,
      );

      if (!membership) {
        throw new TenantAccessDeniedError();
      }

      return this.toContext(userId, membership);
    }

    if (availableMemberships.length === 0) {
      throw new TenantAccessDeniedError();
    }

    if (availableMemberships.length > 1) {
      throw new TenantSelectionRequiredError();
    }

    const membership = availableMemberships[0];

    if (!membership) {
      throw new TenantAccessDeniedError();
    }

    return this.toContext(userId, membership);
  }

  private toContext(
    userId: string,
    membership: TenantMembership,
  ): TenantContext {
    return {
      userId,
      membershipId: membership.membershipId,
      businessId: membership.businessId,
      role: membership.role,
    };
  }
}
