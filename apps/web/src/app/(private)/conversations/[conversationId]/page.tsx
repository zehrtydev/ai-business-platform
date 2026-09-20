import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  type ConversationDetail,
  ConversationNotFoundError,
  getConversationDetail,
} from '../../../../lib/api/conversation-detail';
import { ApiAuthenticationError } from '../../../../lib/api/tenant-context';
import { createClient } from '../../../../lib/supabase/server';
import { simulateInboundMessage } from './actions';

function contactName(contact: ConversationDetail['contact']): string {
  return contact.name ?? contact.phone ?? contact.email ?? 'Unnamed contact';
}

function contactIdentity(contact: ConversationDetail['contact']): string {
  return contact.phone ?? contact.email ?? 'No contact detail';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(status: ConversationDetail['status']): string {
  switch (status) {
    case 'HUMAN_REQUIRED':
      return 'Human required';
    case 'CLOSED':
      return 'Closed';
    case 'OPEN':
      return 'Open';
  }
}

function senderLabel(
  sender: ConversationDetail['messages'][number]['sender'],
): string {
  switch (sender) {
    case 'CONTACT':
      return 'Customer';
    case 'AI':
      return 'AI';
    case 'HUMAN':
      return 'Human';
  }
}

export default async function ConversationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ simulation?: string }>;
}) {
  const { conversationId } = await params;
  const { simulation } = await searchParams;
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    redirect('/login');
  }

  let conversation;

  try {
    conversation = await getConversationDetail(accessToken, conversationId);
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      redirect('/login');
    }

    if (error instanceof ConversationNotFoundError) {
      notFound();
    }

    throw error;
  }

  const name = contactName(conversation.contact);
  const canSimulateInboundMessage =
    process.env.NODE_ENV !== 'production' &&
    conversation.channel.startsWith('development') &&
    conversation.status !== 'CLOSED';

  return (
    <div className="page-stack">
      <Link className="back-link" href="/conversations">
        ← Back to inbox
      </Link>

      <header className="conversation-detail-header">
        <div className="conversation-detail-header__identity">
          <span className="contact-detail-header__avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>

          <div>
            <p className="eyebrow">Inbox conversation</p>
            <h1>{name}</h1>
            <p className="page-header__description">
              {contactIdentity(conversation.contact)}
            </p>
          </div>
        </div>

        <div className="conversation-detail-header__state">
          <span className="neutral-pill">{conversation.channel}</span>

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
      </header>

      <div className="conversation-detail-layout">
        <section
          className="conversation-thread"
          aria-labelledby="message-history-heading"
        >
          <div className="conversation-thread__heading">
            <div>
              <p className="eyebrow">Persisted history</p>
              <h2 id="message-history-heading">Messages</h2>
            </div>

            <span>
              {conversation.messages.length}{' '}
              {conversation.messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          {conversation.messages.length === 0 ? (
            <div className="conversation-thread__empty">
              <strong>No messages recorded yet</strong>
              <p>
                This conversation exists, but its message history is currently
                empty.
              </p>
            </div>
          ) : (
            <div className="message-thread">
              {conversation.messages.map((message) => (
                <article
                  className={`message-bubble message-bubble--${message.direction.toLowerCase()}`}
                  key={message.id}
                >
                  <div className="message-bubble__meta">
                    <strong>{senderLabel(message.sender)}</strong>
                    <time dateTime={message.createdAt}>
                      {formatDate(message.createdAt)}
                    </time>
                  </div>

                  <p>{message.content}</p>
                </article>
              ))}
            </div>
          )}

          {canSimulateInboundMessage ? (
            <div className="development-simulator">
              <div>
                <p className="eyebrow">Development tool</p>
                <h3>Simulate inbound message</h3>
                <p>
                  Persist a customer message through the authenticated backend
                  without using a real messaging provider.
                </p>
              </div>

              {simulation === 'created' ? (
                <p className="development-simulator__notice" role="status">
                  Development message persisted.
                </p>
              ) : null}

              {simulation === 'invalid' ? (
                <p className="development-simulator__notice" role="alert">
                  Enter a message between 1 and 4000 characters.
                </p>
              ) : null}

              {simulation === 'unavailable' ? (
                <p className="development-simulator__notice" role="alert">
                  This conversation is not available for development simulation.
                </p>
              ) : null}

              <form
                action={simulateInboundMessage}
                className="development-simulator__form"
              >
                <input
                  name="conversationId"
                  type="hidden"
                  value={conversation.id}
                />

                <label htmlFor="development-message-content">
                  Customer message
                </label>

                <textarea
                  id="development-message-content"
                  maxLength={4000}
                  name="content"
                  placeholder="Type a simulated inbound customer message..."
                  required
                  rows={3}
                />

                <div className="development-simulator__actions">
                  <span>Development channels only.</span>
                  <button type="submit">Simulate inbound</button>
                </div>
              </form>
            </div>
          ) : null}
        </section>

        <aside
          className="conversation-context"
          aria-labelledby="conversation-context-heading"
        >
          <div className="detail-card__heading">
            <p className="eyebrow">Conversation</p>
            <h2 id="conversation-context-heading">Context</h2>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Contact</dt>
              <dd>{name}</dd>
            </div>

            <div>
              <dt>Channel</dt>
              <dd>{conversation.channel}</dd>
            </div>

            <div>
              <dt>Status</dt>
              <dd>{statusLabel(conversation.status)}</dd>
            </div>

            <div>
              <dt>Control</dt>
              <dd>{conversation.aiEnabled ? 'AI active' : 'Human control'}</dd>
            </div>

            <div>
              <dt>Created</dt>
              <dd>
                <time dateTime={conversation.createdAt}>
                  {formatDate(conversation.createdAt)}
                </time>
              </dd>
            </div>

            <div>
              <dt>Updated</dt>
              <dd>
                <time dateTime={conversation.updatedAt}>
                  {formatDate(conversation.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
