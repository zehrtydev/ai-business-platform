import {
  SupabaseAuthConfigurationError,
  SupabaseAuthUpstreamError,
  SupabaseAuthVerifier,
} from './supabase-auth-verifier.js';

describe('SupabaseAuthVerifier', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function configureEnvironment() {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  }

  it('requires Supabase configuration', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');

    const verifier = new SupabaseAuthVerifier();

    await expect(verifier.verifyAccessToken('token')).rejects.toBeInstanceOf(
      SupabaseAuthConfigurationError,
    );
  });

  it('returns null for an unauthorized token', async () => {
    configureEnvironment();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    );

    const verifier = new SupabaseAuthVerifier();

    await expect(
      verifier.verifyAccessToken('invalid-token'),
    ).resolves.toBeNull();
  });

  it('returns identity for a verified Supabase user', async () => {
    configureEnvironment();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'user-a',
          email: 'user@example.com',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const verifier = new SupabaseAuthVerifier();

    await expect(verifier.verifyAccessToken('valid-token')).resolves.toEqual({
      userId: 'user-a',
      email: 'user@example.com',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        method: 'GET',
        headers: {
          apikey: 'publishable-key',
          authorization: 'Bearer valid-token',
        },
      }),
    );
  });

  it('rejects an invalid successful user payload', async () => {
    configureEnvironment();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            email: 'user@example.com',
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    const verifier = new SupabaseAuthVerifier();

    await expect(
      verifier.verifyAccessToken('valid-token'),
    ).rejects.toBeInstanceOf(SupabaseAuthUpstreamError);
  });

  it('does not turn an upstream failure into authentication failure', async () => {
    configureEnvironment();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 500,
        }),
      ),
    );

    const verifier = new SupabaseAuthVerifier();

    await expect(
      verifier.verifyAccessToken('valid-token'),
    ).rejects.toBeInstanceOf(SupabaseAuthUpstreamError);
  });
});
