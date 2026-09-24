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
import { STAFF_READER, STAFF_WRITER } from '../src/staff/staff.tokens.js';
import type {
  StaffAssignedService,
  StaffMemberItem,
  StaffReader,
  StaffWriter,
} from '../src/staff/staff.types.js';
import { TENANT_MEMBERSHIP_READER } from '../src/tenancy/tenancy.tokens.js';
import type {
  TenantMembership,
  TenantMembershipReader,
} from '../src/tenancy/tenant-resolver.js';

describe('Staff API (e2e)', () => {
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

  const servicesByBusiness = new Map<string, Map<string, StaffAssignedService>>(
    [
      [
        'business-a',
        new Map([
          [
            'service-a',
            {
              id: 'service-a',
              name: 'Evaluation',
              isActive: true,
            },
          ],
          [
            'service-a-2',
            {
              id: 'service-a-2',
              name: 'Cleaning',
              isActive: true,
            },
          ],
        ]),
      ],
      [
        'business-c',
        new Map([
          [
            'service-c',
            {
              id: 'service-c',
              name: 'Consultation',
              isActive: true,
            },
          ],
        ]),
      ],
    ],
  );

  let staffMembers = new Map<string, StaffMemberItem>();

  function staffKey(businessId: string, staffMemberId: string): string {
    return `${businessId}:${staffMemberId}`;
  }

  function resolveServices(
    businessId: string,
    serviceIds: readonly string[],
  ): StaffAssignedService[] | null {
    const catalog = servicesByBusiness.get(businessId);

    if (!catalog) {
      return serviceIds.length === 0 ? [] : null;
    }

    const normalizedIds = [...new Set(serviceIds)];
    const resolved: StaffAssignedService[] = [];

    for (const serviceId of normalizedIds) {
      const service = catalog.get(serviceId);

      if (!service) {
        return null;
      }

      resolved.push(service);
    }

    return resolved.sort((left, right) => left.name.localeCompare(right.name));
  }

  function resetStaffMembers(): void {
    staffMembers = new Map([
      [
        staffKey('business-a', 'staff-a'),
        {
          id: 'staff-a',
          name: 'Doctor A',
          isActive: true,
          services: [
            {
              id: 'service-a',
              name: 'Evaluation',
              isActive: true,
            },
          ],
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-20T00:00:00.000Z',
        },
      ],
      [
        staffKey('business-c', 'staff-c'),
        {
          id: 'staff-c',
          name: 'Doctor C',
          isActive: true,
          services: [
            {
              id: 'service-c',
              name: 'Consultation',
              isActive: true,
            },
          ],
          createdAt: '2026-09-20T01:00:00.000Z',
          updatedAt: '2026-09-20T01:00:00.000Z',
        },
      ],
    ]);
  }

  const staffReader: StaffReader = {
    async listStaffMembers(businessId) {
      return [...staffMembers.entries()]
        .filter(([key]) => key.startsWith(`${businessId}:`))
        .map(([, staffMember]) => staffMember);
    },
  };

  const staffWriter: StaffWriter = {
    async createStaffMember(businessId, input) {
      const assignedServices = resolveServices(businessId, input.serviceIds);

      if (!assignedServices) {
        return {
          kind: 'service_not_found',
        };
      }

      const staffMemberId =
        businessId === 'business-c' ? 'staff-created-c' : 'staff-created-a';

      const staffMember: StaffMemberItem = {
        id: staffMemberId,
        name: input.name,
        isActive: true,
        services: assignedServices,
        createdAt: '2026-09-24T00:00:00.000Z',
        updatedAt: '2026-09-24T00:00:00.000Z',
      };

      staffMembers.set(staffKey(businessId, staffMemberId), staffMember);

      return {
        kind: 'created',
        staffMember,
      };
    },

    async updateStaffMember(businessId, staffMemberId, input) {
      const key = staffKey(businessId, staffMemberId);
      const current = staffMembers.get(key);

      if (!current) {
        return {
          kind: 'not_found',
        };
      }

      const assignedServices = resolveServices(businessId, input.serviceIds);

      if (!assignedServices) {
        return {
          kind: 'service_not_found',
        };
      }

      const updated: StaffMemberItem = {
        ...current,
        name: input.name,
        services: assignedServices,
        updatedAt: '2026-09-24T01:00:00.000Z',
      };

      staffMembers.set(key, updated);

      return {
        kind: 'updated',
        staffMember: updated,
      };
    },

    async setStaffMemberActive(businessId, staffMemberId, isActive) {
      const key = staffKey(businessId, staffMemberId);
      const current = staffMembers.get(key);

      if (!current) {
        return null;
      }

      const updated: StaffMemberItem = {
        ...current,
        isActive,
        updatedAt: '2026-09-24T02:00:00.000Z',
      };

      staffMembers.set(key, updated);

      return updated;
    },
  };

  beforeEach(async () => {
    resetStaffMembers();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_ACCESS_TOKEN_VERIFIER)
      .useValue(accessTokenVerifier)
      .overrideProvider(TENANT_MEMBERSHIP_READER)
      .useValue(tenantMembershipReader)
      .overrideProvider(STAFF_READER)
      .useValue(staffReader)
      .overrideProvider(STAFF_WRITER)
      .useValue(staffWriter)
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

  it('GET /staff rejects missing authentication', async () => {
    await request(app.getHttpServer()).get('/staff').expect(401);
  });

  it('GET /staff returns only staff from the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .expect(200)
      .expect({
        items: [
          {
            id: 'staff-a',
            name: 'Doctor A',
            isActive: true,
            services: [
              {
                id: 'service-a',
                name: 'Evaluation',
                isActive: true,
              },
            ],
            createdAt: '2026-09-20T00:00:00.000Z',
            updatedAt: '2026-09-20T00:00:00.000Z',
          },
        ],
      });
  });

  it('GET /staff follows explicit authorized tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/staff')
      .set('Authorization', 'Bearer multi-tenant-token')
      .set('x-business-id', 'business-c')
      .expect(200)
      .expect({
        items: [
          {
            id: 'staff-c',
            name: 'Doctor C',
            isActive: true,
            services: [
              {
                id: 'service-c',
                name: 'Consultation',
                isActive: true,
              },
            ],
            createdAt: '2026-09-20T01:00:00.000Z',
            updatedAt: '2026-09-20T01:00:00.000Z',
          },
        ],
      });
  });

  it('POST /staff creates staff and assigns services', async () => {
    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '  Doctor New  ',
        serviceIds: ['service-a-2', 'service-a', 'service-a'],
      })
      .expect(201)
      .expect({
        staffMember: {
          id: 'staff-created-a',
          name: 'Doctor New',
          isActive: true,
          services: [
            {
              id: 'service-a-2',
              name: 'Cleaning',
              isActive: true,
            },
            {
              id: 'service-a',
              name: 'Evaluation',
              isActive: true,
            },
          ],
          createdAt: '2026-09-24T00:00:00.000Z',
          updatedAt: '2026-09-24T00:00:00.000Z',
        },
      });
  });

  it('POST /staff accepts staff without service assignments', async () => {
    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Assistant',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.staffMember.services).toEqual([]);
      });
  });

  it('POST /staff rejects invalid staff data', async () => {
    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '   ',
        serviceIds: 'service-a',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Doctor',
        serviceIds: [''],
      })
      .expect(400);
  });

  it('POST /staff hides unavailable or cross-tenant services', async () => {
    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Cross tenant attempt',
        serviceIds: ['service-c'],
      })
      .expect(404);
  });

  it('PATCH /staff/:id updates staff and replaces service assignments', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: '  Doctor A Updated  ',
        serviceIds: ['service-a-2'],
      })
      .expect(200)
      .expect({
        staffMember: {
          id: 'staff-a',
          name: 'Doctor A Updated',
          isActive: true,
          services: [
            {
              id: 'service-a-2',
              name: 'Cleaning',
              isActive: true,
            },
          ],
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-24T01:00:00.000Z',
        },
      });
  });

  it('PATCH /staff/:id hides staff from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-c')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Cross tenant mutation',
        serviceIds: [],
      })
      .expect(404);
  });

  it('PATCH /staff/:id rejects unavailable or cross-tenant services', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-a')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        name: 'Doctor A',
        serviceIds: ['service-c'],
      })
      .expect(404);
  });

  it('PATCH /staff/:id/status deactivates staff', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.staffMember.id).toBe('staff-a');
        expect(response.body.staffMember.isActive).toBe(false);
      });
  });

  it('PATCH /staff/:id/status rejects invalid status data', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-a/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: 'false',
      })
      .expect(400);
  });

  it('PATCH /staff/:id/status hides staff from another tenant', async () => {
    await request(app.getHttpServer())
      .patch('/staff/staff-c/status')
      .set('Authorization', 'Bearer single-tenant-token')
      .send({
        isActive: false,
      })
      .expect(404);
  });
});
