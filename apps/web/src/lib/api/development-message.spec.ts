import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createDevelopmentInboundMessage,
  DevelopmentConversationUnavailableError,
} from './development-message';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const validMessage = {
  id: 'message-a',
  direction: 'INBOUND',
  sender: 'CONTACT',
  senderUserId: null,
  content: 'Simulated customer reply.',
  messageType: 'TEXT',
  providerMessageId: null,
  createdAt: '2026-09-20T02:20:00.000Z',
};

describe('createDevelopmentInboundMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Hello',
      ),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('posts an authenticated inbound development message', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: validMessage,
        }),
        {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Simulated customer reply.',
      ),
    ).resolves.toEqual(validMessage);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/inbox/conversations/conversation-a/development/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Simulated customer reply.',
        }),
        cache: 'no-store',
      }),
    );
  });

  it('maps unavailable development conversations', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Hello',
      ),
    ).rejects.toBeInstanceOf(DevelopmentConversationUnavailableError);
  });

  it('maps authentication failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Hello',
      ),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);
  });

  it('maps tenant failures', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Hello',
      ),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed development message responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: {
              ...validMessage,
              sender: 'AI',
            },
          }),
          {
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(
      createDevelopmentInboundMessage(
        'access-token',
        'conversation-a',
        'Hello',
      ),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
