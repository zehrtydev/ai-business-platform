import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import {
  AVAILABILITY_RULE_READER,
  AVAILABILITY_RULE_WRITER,
} from '../src/availability-rules/availability-rules.tokens.js';
import type {
  AvailabilityRuleItem,
  AvailabilityRuleReader,
  AvailabilityRuleWriter,
} from '../src/availability-rules/availability-rules.types.js';
import { AUTH_ACCESS_TOKEN_VERIFIER } from '../src/auth/auth.tokens.js';
import type { AccessTokenVerifier } from '../src/auth/auth.types.js';
import { DatabaseService } from '../src/database/database.service.js';
import { TENANT_MEMBERSHIP_READER } from '../src/tenancy/tenancy.tokens.js';
import type {
  TenantMembership,
  TenantMembershipReader,
} from '../src/tenancy/tenant-resolver.js';

describe('Availability Rules API (e2e)', () => {
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

  const staffByBusiness = new Map<string, Set<string>>([
    ['business-a', new Set(['staff-a'])],
    ['business-c', new Set(['staff-c'])],
  ]);

  let availabilityRules = new Map<string, AvailabilityRuleItem>();

  function ruleKey(businessId: string, availabilityRuleId: string): string {
    return `${businessId}:${availabilityRuleId}`;
  }

  function resetAvailabilityRules(): void {
    availabilityRules = new Map([
      [
        ruleKey('business-a', 'rule-a'),
        {
          id: 'rule-a',
          staffMemberId: 'staff-a',
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '12:00:00',
          isActive: true,
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-20T00:00:00.000Z',
        },
      ],
      [
        ruleKey('business-c', 'rule-c'),
        {
          id: 'rule-c',
          staffMemberId: 'staff-c',
          dayOfWeek: 2,
          startTime: '14:00:00',
          endTime: '18:00:00',
          isActive: true,
          createdAt: '2026-09-20T01:00:00.000Z',
          updatedAt: '2026-09-20T01:00:00.000Z',
        },
      ],
    ]);
  }

  function staffExists(businessId: string, staffMemberId: string): boolean {
    return staffByBusiness.get(businessId)?.has(staffMemberId) ?? false;
  }

  const availabilityRuleReader: AvailabilityRuleReader = {
    async listAvailabilityRules(businessId) {
      return [...availabilityRules.entries()]
        .filter(([key]) => key.startsWith(`${businessId}:`))
        .map(([, rule]) => rule);
    },
  };

  const availabilityRuleWriter: AvailabilityRuleWriter = {
    async createAvailabilityRule(businessId, input) {
      if (!staffExists(businessId, input.staffMemberId)) {
        return {
          kind: 'staff_not_found',
        };
      }

      const availabilityRuleId =
        businessId === 'business-c' ? 'rule-created-c' : 'rule-created-a';

      const availabilityRule: AvailabilityRuleItem = {
        id: availabilityRuleId,
        staffMemberId: input.staffMemberId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: true,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      };

      availabilityRules.set(
        ruleKey(businessId, availabilityRuleId),
        availabilityRule,
      );

      return {
        kind: 'created',
        availabilityRule,
      };
    },

    async updateAvailabilityRule(businessId, availabilityRuleId, input) {
      const key = ruleKey(businessId, availabilityRuleId);
      const current = availabilityRules.get(key);

      if (!current) {
        return {
          kind: 'not_found',
        };
      }

      if (!staffExists(businessId, input.staffMemberId)) {
        return {
          kind: 'staff_not_found',
        };
      }

      const updated: AvailabilityRuleItem = {
        ...current,
        staffMemberId: input.staffMemberId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        updatedAt: '2026-09-24T01:00:00.000Z',
      };

      availabilityRules.set(key, updated);

      return {
        kind: 'updated',
        availabilityRule: updated,
      };
    },

    async setAvailabilityRuleActive(businessId, availabilityRuleId, isActive) {
      const key = ruleKey(businessId, availabilityRuleId);
      const current = availabilityRules.get(key);

      if (!current) {
        return null;
      }

      const updated: AvailabilityRuleItem = {
        ...current,
        isActive,
        updatedAt: '2026-09-24T02:00:00.000Z',
      };

      availabilityRules.set(key, updated);

      return updated;
    },
  };

  beforeEach(async () => {
    resetAvailabilityRules();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_ACCESS_TOKEN_VERIFIER)
      .useValue(accessTokenVerifier)
      .overrideProvider(TENANT_MEMBERSHIP_READER)
      .useValue(tenantMembershipReader)
      .overrideProvider(AVAILABILITY_RULE_READER)
      .useValue(availabilityRuleReader)
      .overrideProvider(AVAILABILITY_RULE_WRITER)
      .useValue(availabilityRuleWriter)
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

  it('GET /availability-rules rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/availability-rules').expect(401);
  });

  it('GET /availability-rules returns only rules from the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
            id: 'rule-a',
            staffMemberId: 'staff-a',
            dayOfWeek: 1,
            startTime: '08:00:00',
            endTime: '12:00:00',
            isActive: true,
            createdAt: '2026-09-20T00:00:00.000Z',
            updatedAt: '2026-09-20T00:00:00.000Z',
          },
        ],
      });
  });

  it('GET /availability-rules follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/availability-rules')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'rule-c',
            staffMemberId: 'staff-c',
            dayOfWeek: 2,
            startTime: '14:00:00',
            endTime: '18:00:00',
            isActive: true,
            createdAt: '2026-09-20T01:00:00.000Z',
            updatedAt: '2026-09-20T01:00:00.000Z',
          },
        ],
      });
  });

  it('POST /availability-rules creates and normalizes a rule', async () => {
    await request(app.getHttpServer())
      .post('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '13:30',
      })
      .expect(201)
      .expect({
        availabilityRule: {
          id: 'rule-created-a',
          staffMemberId: 'staff-a',
          dayOfWeek: 3,
          startTime: '09:00:00',
          endTime: '13:30:00',
          isActive: true,
          createdAt: '2026-09-24T00:00:00.000Z',
          updatedAt: '2026-09-24T00:00:00.000Z',
        },
      });
  });

  it('POST /availability-rules rejects invalid rule data', async () => {
    await request(app.getHttpServer())
      .post('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '13:00',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 1,
        startTime: '13:00',
        endTime: '09:00',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 1,
        startTime: 'invalid',
        endTime: '13:00',
      })
      .expect(400);
  });

  it('POST /availability-rules hides staff from another tenant', async () => {
    await request(app.getHttpServer())
      .post('/availability-rules')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-c',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '13:00',
      })
      .expect(404);
  });

  it('PATCH /availability-rules/:id updates a rule', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 5,
        startTime: '10:00',
        endTime: '16:30',
      })
      .expect(200)
      .expect({
        availabilityRule: {
          id: 'rule-a',
          staffMemberId: 'staff-a',
          dayOfWeek: 5,
          startTime: '10:00:00',
          endTime: '16:30:00',
          isActive: true,
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-24T01:00:00.000Z',
        },
      });
  });

  it('PATCH /availability-rules/:id hides rules from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-c')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-a',
        dayOfWeek: 5,
        startTime: '10:00',
        endTime: '16:00',
      })
      .expect(404);
  });

  it('PATCH /availability-rules/:id rejects unavailable staff', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        staffMemberId: 'staff-c',
        dayOfWeek: 5,
        startTime: '10:00',
        endTime: '16:00',
      })
      .expect(404);
  });

  it('PATCH /availability-rules/:id/status deactivates a rule', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.availabilityRule.id).toBe('rule-a');
        expect(response.body.availabilityRule.isActive).toBe(false);
      });
  });

  it('PATCH /availability-rules/:id/status rejects invalid status data', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: 'false',
      })
      .expect(400);
  });

  it('PATCH /availability-rules/:id/status hides rules from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/availability-rules/rule-c/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(404);
  });
});
