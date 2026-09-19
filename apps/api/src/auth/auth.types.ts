export interface AuthenticatedIdentity {
  userId: string;
  email?: string;
}

export interface AccessTokenVerifier {
  verifyAccessToken(accessToken: string): Promise<AuthenticatedIdentity | null>;
}

export interface AuthenticatedRequest {
  authenticatedUserId?: string;
  authenticatedIdentity?: AuthenticatedIdentity;
  headers: {
    authorization?: string | string[];
  };
}
