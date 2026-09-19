import { describe, expect, it } from 'vitest';

import {
  getVerifiedIdentity,
  type AuthClaimsReader,
} from './verified-identity';

function createReader(
  result: Awaited<ReturnType<AuthClaimsReader['getClaims']>>,
): AuthClaimsReader {
  return {
    async getClaims() {
      return result;
    },
  };
}

describe('getVerifiedIdentity', () => {
  it('returns null when claim verification fails', async () => {
    const identity = await getVerifiedIdentity(
      createReader({
        data: null,
        error: new Error('invalid token'),
      }),
    );

    expect(identity).toBeNull();
  });

  it('returns null when claims are missing', async () => {
    const identity = await getVerifiedIdentity(
      createReader({
        data: null,
        error: null,
      }),
    );

    expect(identity).toBeNull();
  });

  it('returns null when the subject is missing', async () => {
    const identity = await getVerifiedIdentity(
      createReader({
        data: {
          claims: {
            email: 'user@example.com',
          },
        },
        error: null,
      }),
    );

    expect(identity).toBeNull();
  });

  it('returns the verified subject and email', async () => {
    const identity = await getVerifiedIdentity(
      createReader({
        data: {
          claims: {
            sub: 'user-id',
            email: 'user@example.com',
          },
        },
        error: null,
      }),
    );

    expect(identity).toEqual({
      userId: 'user-id',
      email: 'user@example.com',
    });
  });

  it('does not trust a non-string email claim', async () => {
    const identity = await getVerifiedIdentity(
      createReader({
        data: {
          claims: {
            sub: 'user-id',
            email: 123,
          },
        },
        error: null,
      }),
    );

    expect(identity).toEqual({
      userId: 'user-id',
    });
  });
});
