export interface VerifiedIdentity {
  userId: string;
  email?: string;
}

export interface AuthClaimsReader {
  getClaims(): Promise<{
    data: {
      claims: {
        sub?: unknown;
        email?: unknown;
      };
    } | null;
    error: unknown;
  }>;
}

export async function getVerifiedIdentity(
  auth: AuthClaimsReader,
): Promise<VerifiedIdentity | null> {
  const { data, error } = await auth.getClaims();

  if (error || !data) {
    return null;
  }

  const userId = data.claims.sub;

  if (typeof userId !== 'string' || !userId.trim()) {
    return null;
  }

  const email = data.claims.email;

  return {
    userId,
    ...(typeof email === 'string' && email ? { email } : {}),
  };
}
