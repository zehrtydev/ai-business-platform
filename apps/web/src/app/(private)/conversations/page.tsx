import { redirect } from 'next/navigation';

import {
  type ConversationListItem,
  getConversationList,
} from '../../../lib/api/conversation-list';
import { ApiAuthenticationError } from '../../../lib/api/tenant-context';
import { createClient } from '../../../lib/supabase/server';

function contactName(contact: ConversationListItem['contact']): string {
  return contact.name ?? contact.phone ?? contact.email ?? 'Unnamed contact';
}

function contactIdentity(contact: ConversationListItem['contact']): string {
  return contact.phone ?? contact.email ?? 'No contact detail';
}

function formatActivity(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(status: ConversationListItem['status']): string {
  switch (status) {
    case 'HUMAN_REQUIRED':
      return 'Human required';
    case 'CLOSED':
      return 'Closed';
    case 'OPEN':
      return 'Open';
  }
}

export default async function ConversationsPage() {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let conversations;

  try {
    conversations = (await getConversationList(accessToken)).items;
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
          <p className="eyebrow">Inbox</p>
          <h1>Conversations</h1>
          <p className="page-header__description">
            Supervise customer conversations, AI activity and conversations that
            need human attention.
          </p>
        </div>

        <span className="count-pill">
          {conversations.length}{' '}
          {conversations.length === 1 ? 'conversation' : 'conversations'}
        </span>
      </header>

      {conversations.length === 0 ? (
        <section className="empty-state">
          <div className="empty-state__mark" aria-hidden="true">
            I
          </div>

          <div>
            <h2>No conversations yet</h2>
            <p>
              New customer conversations will appear here when messages enter
              the workspace.
            </p>
          </div>
        </section>
      ) : (
        <section aria-labelledby="conversation-list-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Customer activity</p>
              <h2 id="conversation-list-heading">Active inbox</h2>
            </div>

            <p>
              Human-required conversations are surfaced alongside the current AI
              control state.
            </p>
          </div>

          <div className="conversation-list">
            {conversations.map((conversation) => {
              const name = contactName(conversation.contact);
              const activityAt =
                conversation.latestMessage?.createdAt ?? conversation.updatedAt;

              return (
                <article className="conversation-row" key={conversation.id}>
                  <div className="conversation-row__identity">
                    <span className="contact-cell__avatar" aria-hidden="true">
                      {name.slice(0, 1).toUpperCase()}
                    </span>

                    <div className="conversation-row__contact">
                      <strong>{name}</strong>
                      <span>{contactIdentity(conversation.contact)}</span>
                    </div>
                  </div>

                  <div className="conversation-row__message">
                    <div className="conversation-row__message-meta">
                      <span className="neutral-pill">
                        {conversation.channel}
                      </span>

                      {conversation.latestMessage ? (
                        <span>
                          {conversation.latestMessage.sender === 'CONTACT'
                            ? 'Customer'
                            : conversation.latestMessage.sender}
                        </span>
                      ) : null}
                    </div>

                    <p>
                      {conversation.latestMessage?.content ??
                        'No messages recorded yet.'}
                    </p>
                  </div>

                  <div className="conversation-row__state">
                    <span
                      className={`conversation-status conversation-status--${conversation.status.toLowerCase()}`}
                    >
                      {statusLabel(conversation.status)}
                    </span>

                    <span
                      className={
                        conversation.aiEnabled
                          ? 'control-pill control-pill--ai'
                          : 'control-pill control-pill--human'
                      }
                    >
                      {conversation.aiEnabled ? 'AI active' : 'Human control'}
                    </span>
                  </div>

                  <time
                    className="conversation-row__time"
                    dateTime={activityAt}
                  >
                    {formatActivity(activityAt)}
                  </time>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
