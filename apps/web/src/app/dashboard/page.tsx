import { redirect } from 'next/navigation';

import { getVerifiedIdentity } from '../../lib/auth/verified-identity';
import { createClient } from '../../lib/supabase/server';
import { logout } from '../auth/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const identity = await getVerifiedIdentity(supabase.auth);

  if (!identity) {
    redirect('/login');
  }

  const identityLabel = identity.email ?? identity.userId;

  return (
    <main>
      <section>
        <h1>Dashboard</h1>

        <p>Authenticated as {identityLabel}</p>

        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
