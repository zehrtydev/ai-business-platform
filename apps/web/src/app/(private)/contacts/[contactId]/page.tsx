import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ContactNotFoundError,
  getContactDetail,
} from '../../../../lib/api/contact-detail';
import { ApiAuthenticationError } from '../../../../lib/api/tenant-context';
import { createClient } from '../../../../lib/supabase/server';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let contact;

  try {
    contact = await getContactDetail(accessToken, contactId);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ContactNotFoundError) {
      notFound();
    }

    throw error;
  }

  const displayName =
    contact.name ?? contact.phone ?? contact.email ?? 'Unnamed contact';

  return (
    <div className="page-stack">
      <Link className="back-link" href="/contacts">
        ← Back to contacts
      </Link>

      <header className="contact-detail-header">
        <div className="contact-detail-header__identity">
          <span className="contact-detail-header__avatar" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>

          <div>
            <p className="eyebrow">CRM contact</p>
            <h1>{displayName}</h1>
            <p className="page-header__description">
              Identity, commercial context and latest recorded activity for this
              contact.
            </p>
          </div>
        </div>

        <span className="neutral-pill">{contact.source}</span>
      </header>

      <div className="contact-detail-grid">
        <section className="detail-card" aria-labelledby="identity-heading">
          <div className="detail-card__heading">
            <p className="eyebrow">Contact</p>
            <h2 id="identity-heading">Identity</h2>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{contact.name ?? 'Not provided'}</dd>
            </div>

            <div>
              <dt>Phone</dt>
              <dd>{contact.phone ?? 'Not provided'}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>{contact.email ?? 'Not provided'}</dd>
            </div>

            <div>
              <dt>Source</dt>
              <dd>{contact.source}</dd>
            </div>
          </dl>
        </section>

        <section className="detail-card" aria-labelledby="lead-heading">
          <div className="detail-card__heading">
            <p className="eyebrow">Commercial context</p>
            <h2 id="lead-heading">Current lead</h2>
          </div>

          {contact.lead ? (
            <dl className="detail-list">
              <div>
                <dt>Pipeline stage</dt>
                <dd>
                  <span className="stage-pill">
                    {contact.lead.pipelineStage.name}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Service of interest</dt>
                <dd>{contact.lead.service?.name ?? 'Not specified'}</dd>
              </div>

              <div>
                <dt>Lead created</dt>
                <dd>
                  <time dateTime={contact.lead.createdAt}>
                    {formatDate(contact.lead.createdAt)}
                  </time>
                </dd>
              </div>

              <div>
                <dt>Lead updated</dt>
                <dd>
                  <time dateTime={contact.lead.updatedAt}>
                    {formatDate(contact.lead.updatedAt)}
                  </time>
                </dd>
              </div>
            </dl>
          ) : (
            <div className="detail-empty">
              <strong>No associated lead</strong>
              <p>
                This contact exists in the workspace but does not currently have
                commercial lead context.
              </p>
            </div>
          )}
        </section>

        <section
          className="detail-card detail-card--wide"
          aria-labelledby="activity-heading"
        >
          <div className="detail-card__heading">
            <p className="eyebrow">Activity</p>
            <h2 id="activity-heading">Record timeline</h2>
          </div>

          <div className="activity-strip">
            <div>
              <span>Contact created</span>
              <strong>{formatDate(contact.createdAt)}</strong>
            </div>

            <div>
              <span>Last interaction</span>
              <strong>
                {contact.lastInteractionAt
                  ? formatDate(contact.lastInteractionAt)
                  : 'No interaction recorded'}
              </strong>
            </div>

            <div>
              <span>Contact updated</span>
              <strong>{formatDate(contact.updatedAt)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
