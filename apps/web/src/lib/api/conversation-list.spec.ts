import { afterEach, describe, expect, it, vi } from 'vitest';

import { getConversationList } from './conversation-list';
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
  latestMessage: {
    id: 'message-a',
    direction: 'INBOUND',
    sender: 'CONTACT',
    content: 'I need help with my appointment.',
    createdAt: '2026-09-20T01:29:00.000Z',
  },
};

describe('getConversationList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(getConversationList('access-token')).rejects.toBeInstanceOf(
      ApiConfigurationError,
    );
  });

  it('forwards authentication and returns conversations', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [validConversation],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getConversationList('access-token')).resolves.toEqual({
      items: [validConversation],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/inbox/conversations',
      expect.objectContaining({
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('maps authentication failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(getConversationList('access-token')).rejects.toBeInstanceOf(
      ApiAuthenticationError,
    );
  });

  it('maps tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(getConversationList('access-token')).rejects.toBeInstanceOf(
      ApiTenantResolutionError,
    );
  });

  it('accepts conversations without messages', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...validConversation,
                latestMessage: null,
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

    const response = await getConversationList('access-token');
    const conversation = response.items[0];

    if (!conversation) {
      throw new Error('Expected one conversation.');
    }

    expect(conversation.latestMessage).toBeNull();
  });

  it('rejects malformed conversations', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                ...validConversation,
                status: 'INVALID',
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

    await expect(getConversationList('access-token')).rejects.toBeInstanceOf(
      ApiUpstreamError,
    );
  });
});
