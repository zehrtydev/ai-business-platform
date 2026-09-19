import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports liveness', () => {
    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'api',
    });
  });

  it('reports readiness', () => {
    expect(controller.ready()).toEqual({
      status: 'ready',
      service: 'api',
    });
  });
});
