import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConversationNotFoundError,
  getConversationDetail,
} from './conversation-detail';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const validConversation = {
  id: 'conversation-a',
  contact: {
    id: 'contact-a',
    name: 'Contact A',
    phone: '+10000000001',
    email: 'contact-a@example.com',
  },
  channel: 'development',
  status: 'HUMAN_REQUIRED',
  assignedToUserId: null,
  aiEnabled: false,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T01:30:00.000Z',
  messages: [
    {
      id: 'message-a-1',
      direction: 'INBOUND',
      sender: 'CONTACT',
      senderUserId: null,
      content: 'I need to move my appointment.',
      messageType: 'TEXT',
      providerMessageId: null,
      createdAt: '2026-09-20T01:00:00.000Z',
    },
    {
      id: 'message-a-2',
      direction: 'OUTBOUND',
      sender: 'AI',
      senderUserId: null,
      content: 'I can help you with that.',
      messageType: 'TEXT',
      providerMessageId: null,
      createdAt: '2026-09-20T01:15:00.000Z',
    },
  ],
};

describe('getConversationDetail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      getConversationDetail('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('forwards authentication and returns persisted messages', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validConversation), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getConversationDetail('access-token', 'conversation-a'),
    ).resolves.toEqual(validConversation);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/inbox/conversations/conversation-a',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('accepts an empty message history', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...validConversation,
            messages: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    const conversation = await getConversationDetail(
      'access-token',
      'conversation-a',
    );

    expect(conversation.messages).toEqual([]);
  });

  it('maps missing conversations', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      getConversationDetail('access-token', 'missing-conversation'),
    ).rejects.toBeInstanceOf(ConversationNotFoundError);
  });

  it('maps authentication and tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getConversationDetail('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);

    await expect(
      getConversationDetail('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed messages', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...validConversation,
            messages: [
              {
                ...validConversation.messages[0],
                sender: 'INVALID',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(
      getConversationDetail('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
