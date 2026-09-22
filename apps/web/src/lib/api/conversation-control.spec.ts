import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConversationControlConflictError,
  requestConversationHandoff,
  resumeConversationAi,
  takeOverConversation,
} from './conversation-control';
import { ConversationNotFoundError } from './conversation-detail';
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiTenantResolutionError,
  ApiUpstreamError,
} from './tenant-context';

const validControlState = {
  id: 'conversation-a',
  status: 'HUMAN_REQUIRED',
  assignedToUserId: null,
  aiEnabled: false,
  updatedAt: '2026-09-20T03:00:00.000Z',
};

describe('conversation control', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_BASE_URL;
  });

  it('requires API_BASE_URL', async () => {
    await expect(
      requestConversationHandoff('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiConfigurationError);
  });

  it('requests human handoff', async () => {
    process.env.API_BASE_URL = 'http://api.example.test/';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          conversation: validControlState,
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
      requestConversationHandoff('access-token', 'conversation-a'),
    ).resolves.toEqual(validControlState);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.test/inbox/conversations/conversation-a/request-handoff',
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
        },
        cache: 'no-store',
      }),
    );
  });

  it('uses the take-over and resume-ai endpoints', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            conversation: {
              ...validControlState,
              status: 'OPEN',
              assignedToUserId: 'user-a',
              aiEnabled: false,
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            conversation: {
              ...validControlState,
              status: 'OPEN',
              assignedToUserId: null,
              aiEnabled: true,
            },
          }),
          { status: 201 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    await takeOverConversation('access-token', 'conversation-a');
    await resumeConversationAi('access-token', 'conversation-a');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.example.test/inbox/conversations/conversation-a/take-over',
    );

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://api.example.test/inbox/conversations/conversation-a/resume-ai',
    );
  });

  it('maps conflicts and missing conversations', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestConversationHandoff('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ConversationControlConflictError);

    await expect(
      requestConversationHandoff('access-token', 'conversation-a'),
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
      requestConversationHandoff('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiAuthenticationError);

    await expect(
      requestConversationHandoff('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiTenantResolutionError);
  });

  it('rejects malformed control responses', async () => {
    process.env.API_BASE_URL = 'http://api.example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            conversation: {
              ...validControlState,
              aiEnabled: 'false',
            },
          }),
          { status: 201 },
        ),
      ),
    );

    await expect(
      requestConversationHandoff('access-token', 'conversation-a'),
    ).rejects.toBeInstanceOf(ApiUpstreamError);
  });
});
