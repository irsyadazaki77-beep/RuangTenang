import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import counselorsRouter from '../../routes/counselors.js';
import { prisma } from '../../database.js';
import { redisService } from '../../services/redisService.js';

const app = express();
app.use(counselorsRouter);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Counselor server demo-data isolation', () => {
  it('serves real database results by default even when a frontend VITE demo flag is set', async () => {
    vi.stubEnv('SERVER_DEMO_MODE', 'false');
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    vi.spyOn(redisService, 'get').mockResolvedValue(null);
    vi.spyOn(redisService, 'set').mockResolvedValue(undefined);
    vi.spyOn(prisma.counselors, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.counselors, 'findMany').mockResolvedValue([]);

    const response = await request(app).get('/api/v1/counselors');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(prisma.counselors.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isDemoData: false } }));
  });

  it('serves counselor fixtures only when the server-side demo flag is explicitly enabled', async () => {
    vi.stubEnv('SERVER_DEMO_MODE', 'true');
    const findMany = vi.spyOn(prisma.counselors, 'findMany');

    const response = await request(app).get('/api/v1/counselors');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.every((counselor: { isDemoData: boolean }) => counselor.isDemoData)).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });
});
