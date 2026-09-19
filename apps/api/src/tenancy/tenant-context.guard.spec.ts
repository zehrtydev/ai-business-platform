import {
  BadRequestException,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  TenantContextGuard,
  type TenantRequest,
} from './tenant-context.guard.js';
import {
  type TenantMembership,
  type TenantMembershipReader,
  TenantResolver,
} from './tenant-resolver.js';

class FakeTenantMembershipReader implements TenantMembershipReader {
  constructor(
    private readonly membershipsByUser: Readonly<
      Record<string, readonly TenantMembership[]>
    >,
  ) {}

  async listForUser(userId: string): Promise<readonly TenantMembership[]> {
    return this.membershipsByUser[userId] ?? [];
  }
}

function createExecutionContext(request: TenantRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('TenantContextGuard', () => {
  const membershipA: TenantMembership = {
    membershipId: 'membership-a',
    businessId: 'business-a',
    role: 'owner',
  };

  const membershipB: TenantMembership = {
    membershipId: 'membership-b',
    businessId: 'business-b',
    role: 'member',
  };

  function createGuard(
    membershipsByUser: Readonly<Record<string, readonly TenantMembership[]>>,
  ) {
    return new TenantContextGuard(
      new TenantResolver(new FakeTenantMembershipReader(membershipsByUser)),
    );
  }

  it('rejects a request without an authenticated identity', async () => {
    const guard = createGuard({});
    const request: TenantRequest = {
      headers: {},
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resolves the only membership automatically', async () => {
    const guard = createGuard({
      'user-a': [membershipA],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {},
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(request.tenantContext).toEqual({
      userId: 'user-a',
      membershipId: 'membership-a',
      businessId: 'business-a',
      role: 'owner',
    });
  });

  it('requires tenant selection for a multi-business user', async () => {
    const guard = createGuard({
      'user-a': [membershipA, membershipB],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {},
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a selected tenant when membership exists', async () => {
    const guard = createGuard({
      'user-a': [membershipA, membershipB],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {
        'x-business-id': 'business-b',
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);

    expect(request.tenantContext?.businessId).toBe('business-b');
    expect(request.tenantContext?.role).toBe('member');
  });

  it('rejects a selected tenant without membership', async () => {
    const guard = createGuard({
      'user-a': [membershipA],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {
        'x-business-id': 'business-b',
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an ambiguous tenant header', async () => {
    const guard = createGuard({
      'user-a': [membershipA],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {
        'x-business-id': ['business-a', 'business-b'],
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a blank tenant header', async () => {
    const guard = createGuard({
      'user-a': [membershipA],
    });

    const request: TenantRequest = {
      authenticatedUserId: 'user-a',
      headers: {
        'x-business-id': '   ',
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
