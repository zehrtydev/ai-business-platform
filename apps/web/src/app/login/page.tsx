import { redirect } from 'next/navigation';

import { getVerifiedIdentity } from '../../lib/auth/verified-identity';
import { createClient } from '../../lib/supabase/server';
import { login } from '../auth/actions';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const identity = await getVerifiedIdentity(supabase.auth);

  if (identity) {
    redirect('/dashboard');
  }

  const { error } = await searchParams;

  return (
    <main>
      <section>
        <h1>Sign in</h1>

        <p>Access the AIAA administrative application.</p>

        {error === 'invalid_credentials' ? (
          <p role="alert">Invalid email or password.</p>
        ) : null}

        <form action={login}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>

          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
