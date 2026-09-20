import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import {
  ApiAuthenticationError,
  getTenantContext,
} from '../../lib/api/tenant-context';
import { getVerifiedIdentity } from '../../lib/auth/verified-identity';
import { createClient } from '../../lib/supabase/server';
import { AppNavigation } from '../../components/app-navigation';
import { logout } from '../auth/actions';

export const dynamic = 'force-dynamic';

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
  const tenantLabel = tenantContext.businessId.slice(0, 8);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-mark" aria-hidden="true">
            A
          </div>
          <div>
            <strong>AIAA</strong>
            <span>Business operations</span>
          </div>
        </div>

        <AppNavigation />

        <div className="app-sidebar__footer">
          <div className="session-card">
            <div className="session-card__avatar" aria-hidden="true">
              {identityLabel.slice(0, 1).toUpperCase()}
            </div>

            <div className="session-card__body">
              <strong title={identityLabel}>{identityLabel}</strong>
              <span>
                {tenantContext.role} · {tenantLabel}
              </span>
            </div>
          </div>

          <form action={logout}>
            <button
              className="secondary-button secondary-button--full"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="app-content">{children}</main>
    </div>
  );
}
