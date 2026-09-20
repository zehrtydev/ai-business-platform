import { redirect } from 'next/navigation';

import {
  ApiAuthenticationError,
  getTenantContext,
} from '../../lib/api/tenant-context';
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

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let tenantContext;

  try {
    tenantContext = await getTenantContext(accessToken);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const identityLabel = identity.email ?? identity.userId;

  return (
    <main>
      <section>
        <h1>Dashboard</h1>

        <p>Authenticated as {identityLabel}</p>
        <p>Tenant resolved: {tenantContext.businessId}</p>
        <p>Role: {tenantContext.role}</p>

        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
