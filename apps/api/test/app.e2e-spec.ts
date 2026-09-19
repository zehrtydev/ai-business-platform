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

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_ACCESS_TOKEN_VERIFIER)
      .useValue(accessTokenVerifier)
      .overrideProvider(TENANT_MEMBERSHIP_READER)
      .useValue(tenantMembershipReader)
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
});
