/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  canUseTelemetry: vi.fn(),
  recordClientPerformanceSample: vi.fn()
}));

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-123', role: 'mahasiswa', name: 'Test', email: 'test@example.test' };
    next();
  }
}));
vi.mock('../../services/consentService.js', () => ({
  consentService: { canUseTelemetry: mocks.canUseTelemetry }
}));
vi.mock('../../services/metricsService.js', () => ({
  metricsService: { recordClientPerformanceSample: mocks.recordClientPerformanceSample }
}));

import performanceTelemetryRouter from '../../routes/performanceTelemetry.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/telemetry/performance', performanceTelemetryRouter);
  return app;
};

describe('performance telemetry route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canUseTelemetry.mockResolvedValue(true);
  });

  it('accepts bounded timing samples only after checking opt-in consent', async () => {
    const sample = {
      name: 'LCP', value: 1_800, route: 'workspace', device: 'mobile', navigationType: 'soft-navigation'
    };
    const response = await request(createApp()).post('/telemetry/performance').send({ samples: [sample] });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(1);
    expect(mocks.canUseTelemetry).toHaveBeenCalledWith('user-123');
    expect(mocks.recordClientPerformanceSample).toHaveBeenCalledWith(sample);
  });

  it('does not store data when telemetry consent is absent', async () => {
    mocks.canUseTelemetry.mockResolvedValue(false);
    const response = await request(createApp()).post('/telemetry/performance').send({
      samples: [{ name: 'LCP', value: 1_800, route: 'workspace', device: 'mobile', navigationType: 'navigate' }]
    });

    expect(response.status).toBe(204);
    expect(mocks.recordClientPerformanceSample).not.toHaveBeenCalled();
  });

  it('rejects unbounded or identifying payload fields before persistence', async () => {
    const response = await request(createApp()).post('/telemetry/performance').send({
      samples: [{
        name: 'LCP', value: 1_800, route: 'workspace', device: 'mobile', navigationType: 'navigate',
        userId: 'user-123', pathname: '/workspace/private-123'
      }]
    });

    expect(response.status).toBe(400);
    expect(mocks.canUseTelemetry).not.toHaveBeenCalled();
    expect(mocks.recordClientPerformanceSample).not.toHaveBeenCalled();
  });
});
