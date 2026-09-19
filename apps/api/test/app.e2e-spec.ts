import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('API (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'api',
      });
  });

  it('/health/ready (GET)', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({
        status: 'ready',
        service: 'api',
      });
  });
});
