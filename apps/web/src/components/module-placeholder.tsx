interface ModulePlaceholderProps {
  description: string;
  eyebrow: string;
  title: string;
}

export function ModulePlaceholder({
  description,
  eyebrow,
  title,
}: ModulePlaceholderProps) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-header__description">{description}</p>
        </div>
      </header>

      <section className="empty-state">
        <div className="empty-state__mark" aria-hidden="true">
          A
        </div>
        <div>
          <h2>Module foundation ready</h2>
          <p>
            This route is now part of the authenticated administrative
            application. Domain functionality will be added in its roadmap
            milestone.
          </p>
        </div>
      </section>
    </div>
  );
}
