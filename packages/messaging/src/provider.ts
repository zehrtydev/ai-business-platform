import type {
  MessagingWebhookInput,
  NormalizedMessagingEvent,
  SendMessageInput,
  SendMessageResult,
} from './types.js';

export interface MessagingProvider {
  readonly provider: string;

  validateWebhook(input: MessagingWebhookInput): Promise<void>;

  normalizeWebhook(
    input: MessagingWebhookInput,
  ): Promise<readonly NormalizedMessagingEvent[]>;

  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
