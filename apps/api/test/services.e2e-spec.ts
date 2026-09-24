import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { AUTH_ACCESS_TOKEN_VERIFIER } from '../src/auth/auth.tokens.js';
import type { AccessTokenVerifier } from '../src/auth/auth.types.js';
import { DatabaseService } from '../src/database/database.service.js';
import {
  SERVICE_READER,
  SERVICE_WRITER,
} from '../src/services/services.tokens.js';
import type {
  ServiceItem,
  ServiceReader,
  ServiceWriter,
} from '../src/services/services.types.js';
import { TENANT_MEMBERSHIP_READER } from '../src/tenancy/tenancy.tokens.js';
import type {
  TenantMembership,
  TenantMembershipReader,
} from '../src/tenancy/tenant-resolver.js';

describe('Services API (e2e)', () => {
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

  let services = new Map<string, ServiceItem>();

  function serviceKey(businessId: string, serviceId: string): string {
    return `${businessId}:${serviceId}`;
  }

  function resetServices(): void {
    services = new Map([
      [
        serviceKey('business-a', 'service-a'),
        {
          id: 'service-a',
          name: 'Evaluation',
          description: 'Initial evaluation',
          durationMinutes: 30,
          price: {
            minorUnits: 12_000_000,
            currencyCode: 'COP',
          },
          isActive: true,
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-20T00:00:00.000Z',
        },
      ],
      [
        serviceKey('business-c', 'service-c'),
        {
          id: 'service-c',
          name: 'Consultation',
          description: null,
          durationMinutes: 60,
          price: null,
          isActive: true,
          createdAt: '2026-09-20T01:00:00.000Z',
          updatedAt: '2026-09-20T01:00:00.000Z',
        },
      ],
    ]);
  }

  const serviceReader: ServiceReader = {
    async listServices(businessId) {
      return [...services.entries()]
        .filter(([key]) => key.startsWith(`${businessId}:`))
        .map(([, service]) => service);
    },
  };

  const serviceWriter: ServiceWriter = {
    async createService(businessId, input) {
      const serviceId =
        businessId === 'business-c' ? 'service-created-c' : 'service-created-a';

      const service: ServiceItem = {
        id: serviceId,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        price: input.price,
        isActive: true,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      };

      services.set(serviceKey(businessId, serviceId), service);

      return service;
    },

    async updateService(businessId, serviceId, input) {
      const key = serviceKey(businessId, serviceId);
      const current = services.get(key);

      if (!current) {
        return null;
      }

      const updated: ServiceItem = {
        ...current,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        price: input.price,
        updatedAt: '2026-09-24T01:00:00.000Z',
      };

      services.set(key, updated);

      return updated;
    },

    async setServiceActive(businessId, serviceId, isActive) {
      const key = serviceKey(businessId, serviceId);
      const current = services.get(key);

      if (!current) {
        return null;
      }

      const updated: ServiceItem = {
        ...current,
        isActive,
        updatedAt: '2026-09-24T02:00:00.000Z',
      };

      services.set(key, updated);

      return updated;
    },
  };

  beforeEach(async () => {
    resetServices();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_ACCESS_TOKEN_VERIFIER)
      .useValue(accessTokenVerifier)
      .overrideProvider(TENANT_MEMBERSHIP_READER)
      .useValue(tenantMembershipReader)
      .overrideProvider(SERVICE_READER)
      .useValue(serviceReader)
      .overrideProvider(SERVICE_WRITER)
      .useValue(serviceWriter)
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

  it('GET /services rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/services').expect(401);
  });

  it('GET /services returns only services from the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
            id: 'service-a',
            name: 'Evaluation',
            description: 'Initial evaluation',
            durationMinutes: 30,
            price: {
              minorUnits: 12_000_000,
              currencyCode: 'COP',
            },
            isActive: true,
            createdAt: '2026-09-20T00:00:00.000Z',
            updatedAt: '2026-09-20T00:00:00.000Z',
          },
        ],
      });
  });

  it('GET /services follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'service-c',
            name: 'Consultation',
            description: null,
            durationMinutes: 60,
            price: null,
            isActive: true,
            createdAt: '2026-09-20T01:00:00.000Z',
            updatedAt: '2026-09-20T01:00:00.000Z',
          },
        ],
      });
  });

  it('POST /services creates and normalizes a service', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '  Cleaning  ',
        description: '  Professional cleaning  ',
        durationMinutes: 45,
        price: {
          minorUnits: 9_000_000,
          currencyCode: 'cop',
        },
      })
      .expect(201)
      .expect({
        service: {
          id: 'service-created-a',
          name: 'Cleaning',
          description: 'Professional cleaning',
          durationMinutes: 45,
          price: {
            minorUnits: 9_000_000,
            currencyCode: 'COP',
          },
          isActive: true,
          createdAt: '2026-09-24T00:00:00.000Z',
          updatedAt: '2026-09-24T00:00:00.000Z',
        },
      });
  });

  it('POST /services accepts a service without price', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Follow-up',
        description: null,
        durationMinutes: 20,
        price: null,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.service.price).toBeNull();
      });
  });

  it('POST /services rejects invalid service data', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '   ',
        durationMinutes: 0,
      })
      .expect(400);
  });

  it('POST /services rejects invalid prices', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Evaluation',
        durationMinutes: 30,
        price: {
          minorUnits: -1,
          currencyCode: 'COP',
        },
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Evaluation',
        durationMinutes: 30,
        price: {
          minorUnits: 1000,
          currencyCode: 'CO',
        },
      })
      .expect(400);
  });

  it('PATCH /services/:id updates a service', async () => {
    await request(app.getHttpServer())
      .patch('/services/service-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '  Complete evaluation  ',
        description: '   ',
        durationMinutes: 60,
        price: null,
      })
      .expect(200)
      .expect({
        service: {
          id: 'service-a',
          name: 'Complete evaluation',
          description: null,
          durationMinutes: 60,
          price: null,
          isActive: true,
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-24T01:00:00.000Z',
        },
      });
  });

  it('PATCH /services/:id hides services from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/services/service-c')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Cross tenant attempt',
        description: null,
        durationMinutes: 15,
        price: null,
      })
      .expect(404);
  });

  it('PATCH /services/:id/status deactivates a service', async () => {
    await request(app.getHttpServer())
      .patch('/services/service-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.service.id).toBe('service-a');
        expect(response.body.service.isActive).toBe(false);
      });
  });

  it('PATCH /services/:id/status rejects invalid status data', async () => {
    await request(app.getHttpServer())
      .patch('/services/service-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: 'false',
      })
      .expect(400);
  });

  it('PATCH /services/:id/status hides services from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/services/service-c/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(404);
  });
});
