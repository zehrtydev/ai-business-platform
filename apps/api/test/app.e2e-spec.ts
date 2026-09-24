import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import {
  APPOINTMENT_AVAILABLE_SLOTS_READER,
  APPOINTMENT_READER,
  APPOINTMENT_SCHEDULING_OPTIONS_READER,
  APPOINTMENT_WRITER,
} from '../src/appointments/appointments.tokens.js';
import type {
  AppointmentAvailableSlotsReader,
  AppointmentReader,
  AppointmentSchedulingOptionsReader,
  AppointmentWriter,
} from '../src/appointments/appointments.types.js';
import { AUTH_ACCESS_TOKEN_VERIFIER } from '../src/auth/auth.tokens.js';
import type { AccessTokenVerifier } from '../src/auth/auth.types.js';
import { CRM_CONTACT_READER } from '../src/crm/crm.tokens.js';
import type { CrmContactReader } from '../src/crm/crm.types.js';
import { DatabaseService } from '../src/database/database.service.js';
import { DASHBOARD_SUMMARY_READER } from '../src/dashboard/dashboard.tokens.js';
import type { DashboardSummaryReader } from '../src/dashboard/dashboard.types.js';
import {
  INBOX_CONVERSATION_CONTROL_WRITER,
  INBOX_CONVERSATION_READER,
  INBOX_DEVELOPMENT_MESSAGE_WRITER,
} from '../src/inbox/inbox.tokens.js';
import type {
  InboxConversationControlState,
  InboxConversationControlWriter,
  InboxConversationReader,
  InboxDevelopmentMessageWriter,
} from '../src/inbox/inbox.types.js';
import { TENANT_MEMBERSHIP_READER } from '../src/tenancy/tenancy.tokens.js';
import type {
  TenantMembership,
  TenantMembershipReader,
} from '../src/tenancy/tenant-resolver.js';

describe('API (e2e)', () => {
  let app: NestFastifyApplication;

  const accessTokenVerifier: AccessTokenVerifier = {
    async verifyAccessToken(accessToken) {
      if (accessToken === 'single-tenant-token') {
        return {
          userId: 'user-a',
          email: 'user-a@example.com',
        };
      }

      if (accessToken === 'multi-tenant-token') {
        return {
          userId: 'user-b',
          email: 'user-b@example.com',
        };
      }

      if (accessToken === 'no-membership-token') {
        return {
          userId: 'user-c',
          email: 'user-c@example.com',
        };
      }

      return null;
    },
  };

  const membershipA: TenantMembership = {
    membershipId: 'membership-a',
    businessId: 'business-a',
    role: 'owner',
  };

  const membershipB: TenantMembership = {
    membershipId: 'membership-b',
    businessId: 'business-b',
    role: 'admin',
  };

  const membershipC: TenantMembership = {
    membershipId: 'membership-c',
    businessId: 'business-c',
    role: 'member',
  };

  const tenantMembershipReader: TenantMembershipReader = {
    async listForUser(userId) {
      if (userId === 'user-a') {
        return [membershipA];
      }

      if (userId === 'user-b') {
        return [membershipB, membershipC];
      }

      return [];
    },
  };

  const crmContactReader: CrmContactReader = {
    async listContacts(businessId) {
      if (businessId === 'business-a') {
        return [
          {
            id: 'contact-a',
            name: 'Contact A',
            phone: '+10000000001',
            email: 'contact-a@example.com',
            source: 'development',
            lastInteractionAt: '2026-09-20T01:00:00.000Z',
            createdAt: '2026-09-19T20:00:00.000Z',
            lead: {
              id: 'lead-a',
              pipelineStage: {
                id: 'stage-a',
                name: 'New',
              },
              service: {
                id: 'service-a',
                name: 'Evaluation',
              },
            },
          },
        ];
      }

      if (businessId === 'business-c') {
        return [
          {
            id: 'contact-c',
            name: 'Contact C',
            phone: null,
            email: 'contact-c@example.com',
            source: 'development',
            lastInteractionAt: null,
            createdAt: '2026-09-19T21:00:00.000Z',
            lead: null,
          },
        ];
      }

      return [];
    },

    async getContact(businessId, contactId) {
      if (businessId === 'business-a' && contactId === 'contact-a') {
        return {
          id: 'contact-a',
          name: 'Contact A',
          phone: '+10000000001',
          email: 'contact-a@example.com',
          source: 'development',
          lastInteractionAt: '2026-09-20T01:00:00.000Z',
          createdAt: '2026-09-19T20:00:00.000Z',
          updatedAt: '2026-09-20T01:05:00.000Z',
          lead: {
            id: 'lead-a',
            pipelineStage: {
              id: 'stage-a',
              name: 'Qualified',
            },
            service: {
              id: 'service-a',
              name: 'Evaluation',
            },
            createdAt: '2026-09-19T20:05:00.000Z',
            updatedAt: '2026-09-20T00:45:00.000Z',
          },
        };
      }

      if (businessId === 'business-c' && contactId === 'contact-c') {
        return {
          id: 'contact-c',
          name: 'Contact C',
          phone: null,
          email: 'contact-c@example.com',
          source: 'development',
          lastInteractionAt: null,
          createdAt: '2026-09-19T21:00:00.000Z',
          updatedAt: '2026-09-19T21:00:00.000Z',
          lead: null,
        };
      }

      return null;
    },
  };

  const inboxConversationReader: InboxConversationReader = {
    async listConversations(businessId) {
      if (businessId === 'business-a') {
        return [
          {
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
          },
        ];
      }

      if (businessId === 'business-c') {
        return [
          {
            id: 'conversation-c',
            contact: {
              id: 'contact-c',
              name: 'Contact C',
              phone: null,
              email: 'contact-c@example.com',
            },
            channel: 'development',
            status: 'OPEN',
            assignedToUserId: null,
            aiEnabled: true,
            createdAt: '2026-09-19T23:00:00.000Z',
            updatedAt: '2026-09-20T00:30:00.000Z',
            latestMessage: null,
          },
        ];
      }

      return [];
    },

    async getConversation(businessId, conversationId) {
      if (businessId === 'business-a' && conversationId === 'conversation-a') {
        return {
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
            {
              id: 'message-a-3',
              direction: 'INBOUND',
              sender: 'CONTACT',
              senderUserId: null,
              content: 'Tomorrow afternoon would work.',
              messageType: 'TEXT',
              providerMessageId: null,
              createdAt: '2026-09-20T01:29:00.000Z',
            },
          ],
        };
      }

      if (businessId === 'business-c' && conversationId === 'conversation-c') {
        return {
          id: 'conversation-c',
          contact: {
            id: 'contact-c',
            name: 'Contact C',
            phone: null,
            email: 'contact-c@example.com',
          },
          channel: 'development',
          status: 'OPEN',
          assignedToUserId: null,
          aiEnabled: true,
          createdAt: '2026-09-19T23:00:00.000Z',
          updatedAt: '2026-09-20T00:30:00.000Z',
          messages: [],
        };
      }

      return null;
    },
  };

  let inboxConversationControlStates = new Map<
    string,
    InboxConversationControlState
  >();

  function conversationControlKey(
    businessId: string,
    conversationId: string,
  ): string {
    return `${businessId}:${conversationId}`;
  }

  function resetInboxConversationControlStates(): void {
    inboxConversationControlStates = new Map([
      [
        conversationControlKey('business-a', 'conversation-a'),
        {
          id: 'conversation-a',
          status: 'HUMAN_REQUIRED',
          assignedToUserId: null,
          aiEnabled: false,
          updatedAt: '2026-09-20T01:30:00.000Z',
        },
      ],
      [
        conversationControlKey('business-c', 'conversation-c'),
        {
          id: 'conversation-c',
          status: 'OPEN',
          assignedToUserId: null,
          aiEnabled: true,
          updatedAt: '2026-09-20T00:30:00.000Z',
        },
      ],
    ]);
  }

  const inboxConversationControlWriter: InboxConversationControlWriter = {
    async requestHandoff(businessId, conversationId) {
      const key = conversationControlKey(businessId, conversationId);
      const current = inboxConversationControlStates.get(key);

      if (!current) {
        return { kind: 'not_found' };
      }

      if (
        current.status !== 'OPEN' ||
        !current.aiEnabled ||
        current.assignedToUserId !== null
      ) {
        return { kind: 'conflict' };
      }

      const conversation: InboxConversationControlState = {
        ...current,
        status: 'HUMAN_REQUIRED',
        aiEnabled: false,
        assignedToUserId: null,
        updatedAt: '2026-09-20T03:00:00.000Z',
      };

      inboxConversationControlStates.set(key, conversation);

      return {
        kind: 'updated',
        conversation,
      };
    },

    async takeOver(businessId, conversationId, userId) {
      const key = conversationControlKey(businessId, conversationId);
      const current = inboxConversationControlStates.get(key);

      if (!current) {
        return { kind: 'not_found' };
      }

      if (
        current.status !== 'HUMAN_REQUIRED' ||
        current.aiEnabled ||
        current.assignedToUserId !== null
      ) {
        return { kind: 'conflict' };
      }

      const conversation: InboxConversationControlState = {
        ...current,
        status: 'OPEN',
        aiEnabled: false,
        assignedToUserId: userId,
        updatedAt: '2026-09-20T03:01:00.000Z',
      };

      inboxConversationControlStates.set(key, conversation);

      return {
        kind: 'updated',
        conversation,
      };
    },

    async resumeAi(businessId, conversationId) {
      const key = conversationControlKey(businessId, conversationId);
      const current = inboxConversationControlStates.get(key);

      if (!current) {
        return { kind: 'not_found' };
      }

      if (
        current.status !== 'OPEN' ||
        current.aiEnabled ||
        current.assignedToUserId === null
      ) {
        return { kind: 'conflict' };
      }

      const conversation: InboxConversationControlState = {
        ...current,
        status: 'OPEN',
        aiEnabled: true,
        assignedToUserId: null,
        updatedAt: '2026-09-20T03:02:00.000Z',
      };

      inboxConversationControlStates.set(key, conversation);

      return {
        kind: 'updated',
        conversation,
      };
    },
  };

  const inboxDevelopmentMessageWriter: InboxDevelopmentMessageWriter = {
    async createInboundMessage(businessId, conversationId, content) {
      if (businessId === 'business-a' && conversationId === 'conversation-a') {
        return {
          id: 'development-message-a',
          direction: 'INBOUND',
          sender: 'CONTACT',
          senderUserId: null,
          content,
          messageType: 'TEXT',
          providerMessageId: null,
          createdAt: '2026-09-20T02:20:00.000Z',
        };
      }

      if (businessId === 'business-c' && conversationId === 'conversation-c') {
        return {
          id: 'development-message-c',
          direction: 'INBOUND',
          sender: 'CONTACT',
          senderUserId: null,
          content,
          messageType: 'TEXT',
          providerMessageId: null,
          createdAt: '2026-09-20T02:21:00.000Z',
        };
      }

      return null;
    },
  };

  const appointmentReader: AppointmentReader = {
    async listAppointments(businessId) {
      if (businessId === 'business-a') {
        return [
          {
            id: 'appointment-a',
            status: 'SCHEDULED',
            startsAt: '2026-09-21T14:00:00.000Z',
            endsAt: '2026-09-21T14:30:00.000Z',
            createdAt: '2026-09-20T02:00:00.000Z',
            updatedAt: '2026-09-20T02:00:00.000Z',
            contact: {
              id: 'contact-a',
              name: 'Contact A',
              phone: '+10000000001',
              email: 'contact-a@example.com',
            },
            service: {
              id: 'service-a',
              name: 'Evaluation',
              durationMinutes: 30,
            },
            staffMember: {
              id: 'staff-a',
              name: 'Staff A',
            },
          },
        ];
      }

      if (businessId === 'business-c') {
        return [
          {
            id: 'appointment-c',
            status: 'COMPLETED',
            startsAt: '2026-09-22T15:00:00.000Z',
            endsAt: '2026-09-22T16:00:00.000Z',
            createdAt: '2026-09-20T02:10:00.000Z',
            updatedAt: '2026-09-22T16:05:00.000Z',
            contact: {
              id: 'contact-c',
              name: 'Contact C',
              phone: null,
              email: 'contact-c@example.com',
            },
            service: {
              id: 'service-c',
              name: 'Consultation',
              durationMinutes: 60,
            },
            staffMember: {
              id: 'staff-c',
              name: 'Staff C',
            },
          },
        ];
      }

      return [];
    },
  };

  const appointmentSchedulingOptionsReader: AppointmentSchedulingOptionsReader =
    {
      async getOptions(businessId) {
        if (businessId === 'business-a') {
          return {
            timezone: 'America/Bogota',
            services: [
              {
                id: 'service-a',
                name: 'Evaluation',
                durationMinutes: 30,
                staffMembers: [
                  {
                    id: 'staff-a',
                    name: 'Staff A',
                    availability: [
                      {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                      },
                    ],
                  },
                ],
              },
            ],
          };
        }

        if (businessId === 'business-c') {
          return {
            timezone: 'America/New_York',
            services: [
              {
                id: 'service-c',
                name: 'Consultation',
                durationMinutes: 60,
                staffMembers: [
                  {
                    id: 'staff-c',
                    name: 'Staff C',
                    availability: [
                      {
                        dayOfWeek: 2,
                        startTime: '10:00:00',
                        endTime: '18:00:00',
                      },
                    ],
                  },
                ],
              },
            ],
          };
        }

        return null;
      },
    };

  const appointmentAvailableSlotsReader: AppointmentAvailableSlotsReader = {
    async getAvailableSlots(businessId, input) {
      if (
        businessId === 'business-a' &&
        input.serviceId === 'service-a' &&
        input.staffMemberId === 'staff-unconfigured'
      ) {
        return {
          kind: 'configuration',
        };
      }

      if (
        businessId === 'business-a' &&
        input.serviceId === 'service-a' &&
        input.staffMemberId === 'staff-a'
      ) {
        return {
          kind: 'available',
          availability: {
            timezone: 'America/Bogota',
            date: input.date,
            serviceId: input.serviceId,
            staffMemberId: input.staffMemberId,
            serviceDurationMinutes: 30,
            slotIntervalMinutes: 30,
            slots:
              input.date === '2026-09-21'
                ? [
                    {
                      startsAt: '2026-09-21T14:00:00.000Z',
                      endsAt: '2026-09-21T14:30:00.000Z',
                    },
                    {
                      startsAt: '2026-09-21T14:15:00.000Z',
                      endsAt: '2026-09-21T14:45:00.000Z',
                    },
                  ]
                : [],
          },
        };
      }

      if (
        businessId === 'business-c' &&
        input.serviceId === 'service-c' &&
        input.staffMemberId === 'staff-c'
      ) {
        return {
          kind: 'available',
          availability: {
            timezone: 'America/New_York',
            date: input.date,
            serviceId: input.serviceId,
            staffMemberId: input.staffMemberId,
            serviceDurationMinutes: 60,
            slotIntervalMinutes: 60,
            slots: [
              {
                startsAt: '2026-09-22T14:00:00.000Z',
                endsAt: '2026-09-22T15:00:00.000Z',
              },
            ],
          },
        };
      }

      return {
        kind: 'not_found',
      };
    },
  };

  const appointmentWriter: AppointmentWriter = {
    async createAppointment(businessId, input) {
      if (
        businessId === 'business-a' &&
        input.contactId === 'contact-a' &&
        input.serviceId === 'service-a' &&
        input.staffMemberId === 'staff-a'
      ) {
        if (input.startsAt === '2026-09-21T14:30:00.000Z') {
          return {
            kind: 'conflict',
            reason: 'overlap',
          };
        }

        if (input.startsAt === '2026-09-27T20:00:00.000Z') {
          return {
            kind: 'conflict',
            reason: 'unavailable_day',
          };
        }

        if (input.startsAt === '2026-09-21T22:00:00.000Z') {
          return {
            kind: 'conflict',
            reason: 'outside_hours',
          };
        }

        return {
          kind: 'created',
          appointment: {
            id: 'appointment-created-a',
            contactId: input.contactId,
            serviceId: input.serviceId,
            staffMemberId: input.staffMemberId,
            startsAt: input.startsAt,
            endsAt: '2026-09-21T14:30:00.000Z',
            status: 'SCHEDULED',
            createdAt: '2026-09-20T03:00:00.000Z',
            updatedAt: '2026-09-20T03:00:00.000Z',
          },
        };
      }

      if (
        businessId === 'business-c' &&
        input.contactId === 'contact-c' &&
        input.serviceId === 'service-c' &&
        input.staffMemberId === 'staff-c'
      ) {
        return {
          kind: 'created',
          appointment: {
            id: 'appointment-created-c',
            contactId: input.contactId,
            serviceId: input.serviceId,
            staffMemberId: input.staffMemberId,
            startsAt: input.startsAt,
            endsAt: '2026-09-22T16:00:00.000Z',
            status: 'SCHEDULED',
            createdAt: '2026-09-20T03:10:00.000Z',
            updatedAt: '2026-09-20T03:10:00.000Z',
          },
        };
      }

      return {
        kind: 'not_found',
      };
    },

    async updateAppointmentStatus(businessId, input) {
      if (
        businessId === 'business-a' &&
        input.appointmentId === 'appointment-a'
      ) {
        return {
          kind: 'updated',
          appointment: {
            id: input.appointmentId,
            status: input.status,
            updatedAt: '2026-09-22T01:30:00.000Z',
          },
        };
      }

      if (
        businessId === 'business-a' &&
        input.appointmentId === 'appointment-terminal'
      ) {
        return {
          kind: 'conflict',
          currentStatus: 'COMPLETED',
        };
      }

      return {
        kind: 'not_found',
      };
    },
  };

  const dashboardSummaryReader: DashboardSummaryReader = {
    async getSummary(businessId) {
      if (businessId === 'business-a') {
        return {
          leadsReceived: 3,
          openConversations: 2,
          scheduledAppointments: 1,
          humanHandoffs: 1,
        };
      }

      if (businessId === 'business-c') {
        return {
          leadsReceived: 30,
          openConversations: 20,
          scheduledAppointments: 10,
          humanHandoffs: 4,
        };
      }

      return {
        leadsReceived: 0,
        openConversations: 0,
        scheduledAppointments: 0,
        humanHandoffs: 0,
      };
    },
  };

  beforeEach(async () => {
    resetInboxConversationControlStates();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_ACCESS_TOKEN_VERIFIER)
      .useValue(accessTokenVerifier)
      .overrideProvider(TENANT_MEMBERSHIP_READER)
      .useValue(tenantMembershipReader)
      .overrideProvider(CRM_CONTACT_READER)
      .useValue(crmContactReader)
      .overrideProvider(APPOINTMENT_READER)
      .useValue(appointmentReader)
      .overrideProvider(APPOINTMENT_SCHEDULING_OPTIONS_READER)
      .useValue(appointmentSchedulingOptionsReader)
      .overrideProvider(APPOINTMENT_AVAILABLE_SLOTS_READER)
      .useValue(appointmentAvailableSlotsReader)
      .overrideProvider(APPOINTMENT_WRITER)
      .useValue(appointmentWriter)
      .overrideProvider(DASHBOARD_SUMMARY_READER)
      .useValue(dashboardSummaryReader)
      .overrideProvider(INBOX_CONVERSATION_READER)
      .useValue(inboxConversationReader)
      .overrideProvider(INBOX_CONVERSATION_CONTROL_WRITER)
      .useValue(inboxConversationControlWriter)
      .overrideProvider(INBOX_DEVELOPMENT_MESSAGE_WRITER)
      .useValue(inboxDevelopmentMessageWriter)
      .overrideProvider(DatabaseService)
      .useValue({
        db: {},
        async onApplicationShutdown() {},
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health/live (GET)', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200).expect({
      status: 'ok',
      service: 'api',
    });
  });

  it('/health/ready (GET)', async () => {
    await request(app.getHttpServer()).get('/health/ready').expect(200).expect({
      status: 'ready',
      service: 'api',
    });
  });

  it('/auth/me rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/auth/me rejects an invalid access token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('/auth/me exposes only verified identity', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        userId: 'user-a',
        email: 'user-a@example.com',
      });
  });

  it('/tenant/context rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/tenant/context').expect(401);
  });

  it('/tenant/context resolves the only membership from verified identity', async () => {
    await request(app.getHttpServer())
      .get('/tenant/context')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        userId: 'user-a',
        membershipId: 'membership-a',
        businessId: 'business-a',
        role: 'owner',
      });
  });

  it('/tenant/context denies an authenticated user without membership', async () => {
    await request(app.getHttpServer())
      .get('/tenant/context')
      .set('Authorization', 'Bearer no-membership-token')
      .expect(403);
  });

  it('/tenant/context requires selection for multiple memberships', async () => {
    await request(app.getHttpServer())
      .get('/tenant/context')
      .set('Authorization', 'Bearer multi-tenant-token')
      .expect(400);
  });

  it('/tenant/context resolves a selected membership', async () => {
    await request(app.getHttpServer())
      .get('/tenant/context')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        userId: 'user-b',
        membershipId: 'membership-c',
        businessId: 'business-c',
        role: 'member',
      });
  });

  it('/tenant/context rejects a business without membership', async () => {
    await request(app.getHttpServer())
      .get('/tenant/context')
      .set('Authorization', 'Bearer single-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(403);
  });

  it('/crm/contacts rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/crm/contacts').expect(401);
  });

  it('/crm/contacts returns contacts for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
            id: 'contact-a',
            name: 'Contact A',
            phone: '+10000000001',
            email: 'contact-a@example.com',
            source: 'development',
            lastInteractionAt: '2026-09-20T01:00:00.000Z',
            createdAt: '2026-09-19T20:00:00.000Z',
            lead: {
              id: 'lead-a',
              pipelineStage: {
                id: 'stage-a',
                name: 'New',
              },
              service: {
                id: 'service-a',
                name: 'Evaluation',
              },
            },
          },
        ],
      });
  });

  it('/crm/contacts follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'contact-c',
            name: 'Contact C',
            phone: null,
            email: 'contact-c@example.com',
            source: 'development',
            lastInteractionAt: null,
            createdAt: '2026-09-19T21:00:00.000Z',
            lead: null,
          },
        ],
      });
  });

  it('/crm/contacts/:contactId rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts/contact-a')
      .expect(401);
  });

  it('/crm/contacts/:contactId returns contact detail for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts/contact-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        id: 'contact-a',
        name: 'Contact A',
        phone: '+10000000001',
        email: 'contact-a@example.com',
        source: 'development',
        lastInteractionAt: '2026-09-20T01:00:00.000Z',
        createdAt: '2026-09-19T20:00:00.000Z',
        updatedAt: '2026-09-20T01:05:00.000Z',
        lead: {
          id: 'lead-a',
          pipelineStage: {
            id: 'stage-a',
            name: 'Qualified',
          },
          service: {
            id: 'service-a',
            name: 'Evaluation',
          },
          createdAt: '2026-09-19T20:05:00.000Z',
          updatedAt: '2026-09-20T00:45:00.000Z',
        },
      });
  });

  it('/crm/contacts/:contactId hides contacts from another tenant', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts/contact-c')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(404);
  });

  it('/crm/contacts/:contactId follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/crm/contacts/contact-c')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        id: 'contact-c',
        name: 'Contact C',
        phone: null,
        email: 'contact-c@example.com',
        source: 'development',
        lastInteractionAt: null,
        createdAt: '2026-09-19T21:00:00.000Z',
        updatedAt: '2026-09-19T21:00:00.000Z',
        lead: null,
      });
  });

  it('/inbox/conversations rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/inbox/conversations').expect(401);
  });

  it('/inbox/conversations returns conversations for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
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
          },
        ],
      });
  });

  it('/inbox/conversations follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'conversation-c',
            contact: {
              id: 'contact-c',
              name: 'Contact C',
              phone: null,
              email: 'contact-c@example.com',
            },
            channel: 'development',
            status: 'OPEN',
            assignedToUserId: null,
            aiEnabled: true,
            createdAt: '2026-09-19T23:00:00.000Z',
            updatedAt: '2026-09-20T00:30:00.000Z',
            latestMessage: null,
          },
        ],
      });
  });

  it('/inbox/conversations/:conversationId rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations/conversation-a')
      .expect(401);
  });

  it('/inbox/conversations/:conversationId returns persisted message history', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations/conversation-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
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
          {
            id: 'message-a-3',
            direction: 'INBOUND',
            sender: 'CONTACT',
            senderUserId: null,
            content: 'Tomorrow afternoon would work.',
            messageType: 'TEXT',
            providerMessageId: null,
            createdAt: '2026-09-20T01:29:00.000Z',
          },
        ],
      });
  });

  it('/inbox/conversations/:conversationId hides conversations from another tenant', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations/conversation-c')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(404);
  });

  it('/inbox/conversations/:conversationId follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/inbox/conversations/conversation-c')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        id: 'conversation-c',
        contact: {
          id: 'contact-c',
          name: 'Contact C',
          phone: null,
          email: 'contact-c@example.com',
        },
        channel: 'development',
        status: 'OPEN',
        assignedToUserId: null,
        aiEnabled: true,
        createdAt: '2026-09-19T23:00:00.000Z',
        updatedAt: '2026-09-20T00:30:00.000Z',
        messages: [],
      });
  });

  it('conversation control rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/request-handoff')
      .expect(401);
  });

  it('conversation control completes the human handoff workflow', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/request-handoff')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(201)
      .expect({
        conversation: {
          id: 'conversation-c',
          status: 'HUMAN_REQUIRED',
          assignedToUserId: null,
          aiEnabled: false,
          updatedAt: '2026-09-20T03:00:00.000Z',
        },
      });

    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/take-over')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(201)
      .expect({
        conversation: {
          id: 'conversation-c',
          status: 'OPEN',
          assignedToUserId: 'user-b',
          aiEnabled: false,
          updatedAt: '2026-09-20T03:01:00.000Z',
        },
      });

    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/resume-ai')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(201)
      .expect({
        conversation: {
          id: 'conversation-c',
          status: 'OPEN',
          assignedToUserId: null,
          aiEnabled: true,
          updatedAt: '2026-09-20T03:02:00.000Z',
        },
      });
  });

  it('conversation control hides conversations from another tenant', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/request-handoff')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(404);
  });

  it('request-handoff rejects an invalid conversation transition', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/request-handoff')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(409);
  });

  it('take-over rejects a second takeover after ownership is claimed', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/take-over')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(201)
      .expect({
        conversation: {
          id: 'conversation-a',
          status: 'OPEN',
          assignedToUserId: 'user-a',
          aiEnabled: false,
          updatedAt: '2026-09-20T03:01:00.000Z',
        },
      });

    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/take-over')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(409);
  });

  it('development/messages rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/development/messages')
      .send({
        content: 'Development inbound message',
      })
      .expect(401);
  });

  it('development/messages rejects blank content', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/development/messages')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        content: '   ',
      })
      .expect(400);
  });

  it('development/messages persists an inbound contact message', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-a/development/messages')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        content: '  Simulated customer reply.  ',
      })
      .expect(201)
      .expect({
        message: {
          id: 'development-message-a',
          direction: 'INBOUND',
          sender: 'CONTACT',
          senderUserId: null,
          content: 'Simulated customer reply.',
          messageType: 'TEXT',
          providerMessageId: null,
          createdAt: '2026-09-20T02:20:00.000Z',
        },
      });
  });

  it('development/messages hides conversations from another tenant', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/development/messages')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        content: 'Cross tenant attempt',
      })
      .expect(404);
  });

  it('development/messages follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .post('/inbox/conversations/conversation-c/development/messages')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .send({
        content: 'Selected tenant message',
      })
      .expect(201)
      .expect({
        message: {
          id: 'development-message-c',
          direction: 'INBOUND',
          sender: 'CONTACT',
          senderUserId: null,
          content: 'Selected tenant message',
          messageType: 'TEXT',
          providerMessageId: null,
          createdAt: '2026-09-20T02:21:00.000Z',
        },
      });
  });

  it('/appointments rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/appointments').expect(401);
  });

  it('/appointments returns appointments for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
            id: 'appointment-a',
            status: 'SCHEDULED',
            startsAt: '2026-09-21T14:00:00.000Z',
            endsAt: '2026-09-21T14:30:00.000Z',
            createdAt: '2026-09-20T02:00:00.000Z',
            updatedAt: '2026-09-20T02:00:00.000Z',
            contact: {
              id: 'contact-a',
              name: 'Contact A',
              phone: '+10000000001',
              email: 'contact-a@example.com',
            },
            service: {
              id: 'service-a',
              name: 'Evaluation',
              durationMinutes: 30,
            },
            staffMember: {
              id: 'staff-a',
              name: 'Staff A',
            },
          },
        ],
      });
  });

  it('/appointments follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'appointment-c',
            status: 'COMPLETED',
            startsAt: '2026-09-22T15:00:00.000Z',
            endsAt: '2026-09-22T16:00:00.000Z',
            createdAt: '2026-09-20T02:10:00.000Z',
            updatedAt: '2026-09-22T16:05:00.000Z',
            contact: {
              id: 'contact-c',
              name: 'Contact C',
              phone: null,
              email: 'contact-c@example.com',
            },
            service: {
              id: 'service-c',
              name: 'Consultation',
              durationMinutes: 60,
            },
            staffMember: {
              id: 'staff-c',
              name: 'Staff C',
            },
          },
        ],
      });
  });

  it('/appointments/options rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/appointments/options').expect(401);
  });

  it('/appointments/options returns scheduling configuration for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/appointments/options')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        timezone: 'America/Bogota',
        services: [
          {
            id: 'service-a',
            name: 'Evaluation',
            durationMinutes: 30,
            staffMembers: [
              {
                id: 'staff-a',
                name: 'Staff A',
                availability: [
                  {
                    dayOfWeek: 1,
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                  },
                ],
              },
            ],
          },
        ],
      });
  });

  it('/appointments/options follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/appointments/options')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        timezone: 'America/New_York',
        services: [
          {
            id: 'service-c',
            name: 'Consultation',
            durationMinutes: 60,
            staffMembers: [
              {
                id: 'staff-c',
                name: 'Staff C',
                availability: [
                  {
                    dayOfWeek: 2,
                    startTime: '10:00:00',
                    endTime: '18:00:00',
                  },
                ],
              },
            ],
          },
        ],
      });
  });

  it('/appointments/available-slots rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .query({
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        date: '2026-09-21',
      })
      .expect(401);
  });

  it('/appointments/available-slots rejects invalid dates', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .set('Authorization', 'Bearer single-tenant-token')
      .query({
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        date: '2026-02-30',
      })
      .expect(400);
  });

  it('/appointments/available-slots hides missing resources', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .set('Authorization', 'Bearer single-tenant-token')
      .query({
        serviceId: 'service-missing',
        staffMemberId: 'staff-a',
        date: '2026-09-21',
      })
      .expect(404);
  });

  it('/appointments/available-slots rejects invalid staff service configuration', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .set('Authorization', 'Bearer single-tenant-token')
      .query({
        serviceId: 'service-a',
        staffMemberId: 'staff-unconfigured',
        date: '2026-09-21',
      })
      .expect(409);
  });

  it('/appointments/available-slots returns slots for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .set('Authorization', 'Bearer single-tenant-token')
      .query({
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        date: '2026-09-21',
      })
      .expect(200)
      .expect({
        timezone: 'America/Bogota',
        date: '2026-09-21',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        serviceDurationMinutes: 30,
        slotIntervalMinutes: 30,
        slots: [
          {
            startsAt: '2026-09-21T14:00:00.000Z',
            endsAt: '2026-09-21T14:30:00.000Z',
          },
          {
            startsAt: '2026-09-21T14:15:00.000Z',
            endsAt: '2026-09-21T14:45:00.000Z',
          },
        ],
      });
  });

  it('/appointments/available-slots follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/appointments/available-slots')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .query({
        serviceId: 'service-c',
        staffMemberId: 'staff-c',
        date: '2026-09-22',
      })
      .expect(200)
      .expect({
        timezone: 'America/New_York',
        date: '2026-09-22',
        serviceId: 'service-c',
        staffMemberId: 'staff-c',
        serviceDurationMinutes: 60,
        slotIntervalMinutes: 60,
        slots: [
          {
            startsAt: '2026-09-22T14:00:00.000Z',
            endsAt: '2026-09-22T15:00:00.000Z',
          },
        ],
      });
  });

  it('POST /appointments rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: '2026-09-21T14:00:00.000Z',
      })
      .expect(401);
  });

  it('POST /appointments rejects invalid appointment data', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: 'not-a-date',
      })
      .expect(400);
  });

  it('POST /appointments creates an appointment for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: '2026-09-21T14:00:00.000Z',
      })
      .expect(201)
      .expect({
        appointment: {
          id: 'appointment-created-a',
          contactId: 'contact-a',
          serviceId: 'service-a',
          staffMemberId: 'staff-a',
          startsAt: '2026-09-21T14:00:00.000Z',
          endsAt: '2026-09-21T14:30:00.000Z',
          status: 'SCHEDULED',
          createdAt: '2026-09-20T03:00:00.000Z',
          updatedAt: '2026-09-20T03:00:00.000Z',
        },
      });
  });

  it('POST /appointments hides resources from another tenant', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-c',
        serviceId: 'service-c',
        staffMemberId: 'staff-c',
        startsAt: '2026-09-22T15:00:00.000Z',
      })
      .expect(404);
  });

  it('POST /appointments exposes overlap conflict reason', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: '2026-09-21T14:30:00.000Z',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.reason).toBe('overlap');
      });
  });

  it('POST /appointments exposes unavailable day conflict reason', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: '2026-09-27T20:00:00.000Z',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.reason).toBe('unavailable_day');
      });
  });

  it('POST /appointments exposes outside hours conflict reason', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        contactId: 'contact-a',
        serviceId: 'service-a',
        staffMemberId: 'staff-a',
        startsAt: '2026-09-21T22:00:00.000Z',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.reason).toBe('outside_hours');
      });
  });

  it('POST /appointments follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .send({
        contactId: 'contact-c',
        serviceId: 'service-c',
        staffMemberId: 'staff-c',
        startsAt: '2026-09-22T15:00:00.000Z',
      })
      .expect(201)
      .expect({
        appointment: {
          id: 'appointment-created-c',
          contactId: 'contact-c',
          serviceId: 'service-c',
          staffMemberId: 'staff-c',
          startsAt: '2026-09-22T15:00:00.000Z',
          endsAt: '2026-09-22T16:00:00.000Z',
          status: 'SCHEDULED',
          createdAt: '2026-09-20T03:10:00.000Z',
          updatedAt: '2026-09-20T03:10:00.000Z',
        },
      });
  });

  it('/dashboard/summary rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/dashboard/summary').expect(401);
  });

  it('/dashboard/summary returns metrics for the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        leadsReceived: 3,
        openConversations: 2,
        scheduledAppointments: 1,
        humanHandoffs: 1,
      });
  });

  it('/dashboard/summary follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        leadsReceived: 30,
        openConversations: 20,
        scheduledAppointments: 10,
        humanHandoffs: 4,
      });
  });

  it('PATCH /appointments/:id/status rejects missing authentication', async () => {
    await request(app.getHttpServer())
      .patch('/appointments/appointment-a/status')
      .send({ status: 'CANCELLED' })
      .expect(401);
  });

  it('PATCH /appointments/:id/status updates a scheduled appointment', async () => {
    await request(app.getHttpServer())
      .patch('/appointments/appointment-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({ status: 'COMPLETED' })
      .expect(200)
      .expect({
        appointment: {
          id: 'appointment-a',
          status: 'COMPLETED',
          updatedAt: '2026-09-22T01:30:00.000Z',
        },
      });
  });

  it('PATCH /appointments/:id/status rejects SCHEDULED as a target state', async () => {
    await request(app.getHttpServer())
      .patch('/appointments/appointment-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({ status: 'SCHEDULED' })
      .expect(400);
  });

  it('PATCH /appointments/:id/status returns 404 outside the resolved tenant', async () => {
    await request(app.getHttpServer())
      .patch('/appointments/appointment-a/status')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .send({ status: 'CANCELLED' })
      .expect(404);
  });

  it('PATCH /appointments/:id/status rejects transitions from terminal states', async () => {
    await request(app.getHttpServer())
      .patch('/appointments/appointment-terminal/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({ status: 'NO_SHOW' })
      .expect(409);
  });
});
