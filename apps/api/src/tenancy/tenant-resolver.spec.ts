import {
  InvalidAuthenticatedIdentityError,
  TenantAccessDeniedError,
  type TenantMembership,
  type TenantMembershipReader,
  TenantResolver,
  TenantSelectionRequiredError,
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

describe('TenantResolver', () => {
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

  it('rejects a missing authenticated identity', async () => {
    const resolver = new TenantResolver(new FakeTenantMembershipReader({}));

    await expect(
      resolver.resolveForAuthenticatedUser('   '),
    ).rejects.toBeInstanceOf(InvalidAuthenticatedIdentityError);
  });

  it('rejects a user without business memberships', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('user-a'),
    ).rejects.toBeInstanceOf(TenantAccessDeniedError);
  });

  it('automatically resolves the only available membership', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [membershipA],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('user-a'),
    ).resolves.toEqual({
      userId: 'user-a',
      membershipId: 'membership-a',
      businessId: 'business-a',
      role: 'owner',
    });
  });

  it('requires an explicit tenant when the user belongs to multiple businesses', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [membershipA, membershipB],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('user-a'),
    ).rejects.toBeInstanceOf(TenantSelectionRequiredError);
  });

  it('resolves an explicitly selected tenant when membership exists', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [membershipA, membershipB],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('user-a', 'business-b'),
    ).resolves.toEqual({
      userId: 'user-a',
      membershipId: 'membership-b',
      businessId: 'business-b',
      role: 'member',
    });
  });

  it('rejects a client-selected tenant without membership', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [membershipA],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('user-a', 'business-b'),
    ).rejects.toBeInstanceOf(TenantAccessDeniedError);
  });

  it('normalizes trusted identity and tenant selection whitespace', async () => {
    const resolver = new TenantResolver(
      new FakeTenantMembershipReader({
        'user-a': [membershipA],
      }),
    );

    await expect(
      resolver.resolveForAuthenticatedUser('  user-a  ', '  business-a  '),
    ).resolves.toEqual({
      userId: 'user-a',
      membershipId: 'membership-a',
      businessId: 'business-a',
      role: 'owner',
    });
  });
});
