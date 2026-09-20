import { redirect } from 'next/navigation';

import { getDashboardSummary } from '../../../lib/api/dashboard-summary';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';

const foundations = [
  {
    title: 'Authentication',
    status: 'Ready',
    detail: 'Supabase session verified server-side.',
  },
  {
    title: 'Tenant resolution',
    status: 'Ready',
    detail: 'Business membership resolved by the API.',
  },
  {
    title: 'Administrative shell',
    status: 'Ready',
    detail: 'Private application navigation is available.',
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let summary;

  try {
    summary = await getDashboardSummary(accessToken);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  const metrics = [
    {
      label: 'Leads received',
      value: summary.leadsReceived,
      detail: 'All recorded leads',
    },
    {
      label: 'Open conversations',
      value: summary.openConversations,
      detail: 'Currently open',
    },
    {
      label: 'Scheduled appointments',
      value: summary.scheduledAppointments,
      detail: 'Currently scheduled',
    },
    {
      label: 'Human handoffs',
      value: summary.humanHandoffs,
      detail: 'Awaiting human attention',
    },
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1>Dashboard</h1>
          <p className="page-header__description">
            Monitor the operational signals that turn conversations into
            appointments.
          </p>
        </div>

        <span className="status-pill">
          <span className="status-pill__dot" />
          Live workspace data
        </span>
      </header>

      <section aria-labelledby="metrics-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operational metrics</p>
            <h2 id="metrics-heading">Current activity</h2>
          </div>

          <p>
            Metrics are calculated from persisted records for the authenticated
            business.
          </p>
        </div>

        <div className="metric-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span className="metric-card__label">{metric.label}</span>
              <strong>{metric.value}</strong>
              <span className="metric-card__detail">{metric.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="foundation-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">M3 foundation</p>
            <h2 id="foundation-heading">Application readiness</h2>
          </div>
        </div>

        <div className="foundation-grid">
          {foundations.map((foundation) => (
            <article className="foundation-card" key={foundation.title}>
              <div className="foundation-card__topline">
                <h3>{foundation.title}</h3>
                <span>{foundation.status}</span>
              </div>
              <p>{foundation.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
