import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getContactList } from '../../../lib/api/contact-list';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';

function formatInteraction(value: string | null, createdAt: string): string {
  const date = new Date(value ?? createdAt);

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function contactIdentity(contact: {
  phone: string | null;
  email: string | null;
}): string {
  return contact.phone ?? contact.email ?? 'No contact detail';
}

export default async function ContactsPage() {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let contacts;

  try {
    contacts = (await getContactList(accessToken)).items;
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    throw error;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Contacts</h1>
          <p className="page-header__description">
            Review people, their current commercial context and the latest
            interaction recorded for this workspace.
          </p>
        </div>

        <span className="count-pill">
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
        </span>
      </header>

      {contacts.length === 0 ? (
        <section className="empty-state">
          <div className="empty-state__mark" aria-hidden="true">
            C
          </div>
          <div>
            <h2>No contacts yet</h2>
            <p>
              Contacts will appear here as leads and conversations enter the
              workspace. The list is already connected to the authenticated
              tenant API.
            </p>
          </div>
        </section>
      ) : (
        <section aria-labelledby="contact-list-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Commercial activity</p>
              <h2 id="contact-list-heading">Registered contacts</h2>
            </div>

            <p>
              The stage and service shown belong to the most recently updated
              lead for each contact.
            </p>
          </div>

          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Contact</th>
                  <th scope="col">Source</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Service</th>
                  <th scope="col">Last interaction</th>
                </tr>
              </thead>

              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link
                        className="contact-cell contact-cell--link"
                        href={`/contacts/${contact.id}`}
                      >
                        <span
                          className="contact-cell__avatar"
                          aria-hidden="true"
                        >
                          {(
                            contact.name ??
                            contact.phone ??
                            contact.email ??
                            '?'
                          )
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>

                        <span className="contact-cell__body">
                          <strong>{contact.name ?? 'Unnamed contact'}</strong>
                          <span>{contactIdentity(contact)}</span>
                        </span>
                      </Link>
                    </td>

                    <td>
                      <span className="neutral-pill">{contact.source}</span>
                    </td>

                    <td>
                      {contact.lead ? (
                        <span className="stage-pill">
                          {contact.lead.pipelineStage.name}
                        </span>
                      ) : (
                        <span className="table-muted">No lead</span>
                      )}
                    </td>

                    <td>
                      {contact.lead?.service?.name ?? (
                        <span className="table-muted">Not specified</span>
                      )}
                    </td>

                    <td>
                      <time
                        dateTime={
                          contact.lastInteractionAt ?? contact.createdAt
                        }
                      >
                        {formatInteraction(
                          contact.lastInteractionAt,
                          contact.createdAt,
                        )}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
