export type MessagingProviderId = string;

export type MessagingChannel = 'whatsapp';

export type MessagingDirection = 'inbound' | 'outbound';

export type MessagingMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'unknown';

export type MessagingDeliveryStatus =
  'pending' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessagingConnectionIdentity {
  externalId: string;
  accountId?: string;
}

export interface MessagingIdentity {
  externalId?: string;
  phoneNumberE164?: string;
  displayName?: string;
}

export interface MessagingMedia {
  externalId?: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
}

export interface MessagingContent {
  type: MessagingMessageType;
  text?: string;
  media?: MessagingMedia;
}

export interface MessagingWebhookInput {
  payload: unknown;
  rawBody?: Uint8Array;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  connectionHint?: MessagingConnectionIdentity;
}

export interface NormalizedInboundMessageEvent {
  type: 'message.received';

  provider: MessagingProviderId;
  connection: MessagingConnectionIdentity;

  externalMessageId: string;

  channel: MessagingChannel;
  direction: 'inbound';

  sender: MessagingIdentity;
  recipient: MessagingIdentity;

  content: MessagingContent;

  providerTimestamp: string;
}

export interface NormalizedMessageStatusEvent {
  type: 'message.status';

  provider: MessagingProviderId;
  connection: MessagingConnectionIdentity;

  externalMessageId: string;

  channel: MessagingChannel;
  direction: 'outbound';
  status: MessagingDeliveryStatus;

  providerTimestamp: string;
}

export type NormalizedMessagingEvent =
  NormalizedInboundMessageEvent | NormalizedMessageStatusEvent;

export interface SendMessageInput {
  connection: MessagingConnectionIdentity;

  channel: MessagingChannel;

  recipient: MessagingIdentity;

  content: MessagingContent;

  idempotencyKey?: string;
}

export interface SendMessageResult {
  provider: MessagingProviderId;
  connection: MessagingConnectionIdentity;

  externalMessageId: string;

  channel: MessagingChannel;
  status: MessagingDeliveryStatus;

  providerTimestamp?: string;
}
