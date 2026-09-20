const metrics = [
  {
    label: 'Leads received',
    value: '—',
    detail: 'CRM metrics pending',
  },
  {
    label: 'Open conversations',
    value: '—',
    detail: 'Inbox metrics pending',
  },
  {
    label: 'Scheduled appointments',
    value: '—',
    detail: 'Scheduling metrics pending',
  },
  {
    label: 'Human handoffs',
    value: '—',
    detail: 'Inbox metrics pending',
  },
];

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
    status: 'Active',
    detail: 'Private application navigation is available.',
  },
];

export default function DashboardPage() {
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
          Authenticated workspace
        </span>
      </header>

      <section aria-labelledby="metrics-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operational metrics</p>
            <h2 id="metrics-heading">Today at a glance</h2>
          </div>

          <p>Live domain metrics will arrive with CRM, Inbox and Scheduling.</p>
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
