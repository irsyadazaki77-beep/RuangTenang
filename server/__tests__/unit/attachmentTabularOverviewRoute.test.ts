/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  getAttachmentForUser: vi.fn(),
  parseTabularWorkbook: vi.fn()
}));

vi.mock('../../database.js', () => ({ prisma: {} }));
vi.mock('../../middleware/auth.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => { req.attachmentOwnerId = 'owner-1'; next(); },
  requireAuth: (_req: any, _res: any, next: any) => next()
}));
vi.mock('../../middleware/guestAttachmentSession.js', () => ({
  guestAttachmentSession: () => (_req: any, _res: any, next: any) => next()
}));
vi.mock('../../middleware/rateLimiters.js', () => ({ attachmentUploadLimiter: (_req: any, _res: any, next: any) => next() }));
vi.mock('../../services/attachmentStorageService.js', () => ({
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  attachmentStorageService: { getAttachmentForUser: mocks.getAttachmentForUser }
}));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: {} }));
vi.mock('../../services/file-intelligence/documentIngestionService.js', () => ({ documentIngestionService: {} }));
vi.mock('../../services/tabularDatasetService.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/tabularDatasetService.js')>();
  return { ...actual, parseTabularWorkbook: mocks.parseTabularWorkbook };
});

import attachmentsRouter from '../../routes/attachments.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', attachmentsRouter);
  return app;
};

describe('tabular dataset overview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the complete profile and a bounded first page after one owned-file load and parse', async () => {
    const buffer = Buffer.from('category,revenue');
    const rows = Array.from({ length: 30 }, (_, index) => ({ category: `category-${index}`, revenue: index }));
    mocks.getAttachmentForUser.mockResolvedValue({
      attachment: {
        id: 'att-1', filename: 'sales.csv', status: 'ready', chatId: null,
        checksum: 'checksum-1', createdAt: new Date('2026-10-17T00:00:00.000Z')
      },
      buffer
    });
    mocks.parseTabularWorkbook.mockResolvedValue({
      activeSheet: 'Data',
      sheets: [{ name: 'Data', headers: ['category', 'revenue'], originalHeaders: ['category', 'revenue'], rows }],
      summaries: [{ name: 'Data', rowCount: rows.length, columnCount: 2, empty: false }]
    });

    const response = await request(createApp()).get('/api/v1/chat/attachments/att-1/dataset/overview?sheet=Data');

    expect(response.status).toBe(200);
    expect(response.body.data.dataset).toMatchObject({ sourceFileId: 'att-1', sheetName: 'Data', rowCount: 30, columnCount: 2 });
    expect(response.body.data.preview).toMatchObject({ sheetName: 'Data', offset: 0, limit: 25, rowCount: 30 });
    expect(response.body.data.preview.rows).toHaveLength(25);
    expect(mocks.getAttachmentForUser).toHaveBeenCalledTimes(1);
    expect(mocks.getAttachmentForUser).toHaveBeenCalledWith('att-1', 'owner-1', false);
    expect(mocks.parseTabularWorkbook).toHaveBeenCalledTimes(1);
    expect(buffer.every(byte => byte === 0)).toBe(true);
  });

  it('rejects a nonexistent sheet and wipes the loaded attachment buffer', async () => {
    const buffer = Buffer.from('category\nA');
    mocks.getAttachmentForUser.mockResolvedValue({
      attachment: {
        id: 'att-1', filename: 'sales.csv', status: 'ready', chatId: null,
        checksum: 'checksum-1', createdAt: new Date('2026-10-17T00:00:00.000Z')
      },
      buffer
    });
    mocks.parseTabularWorkbook.mockResolvedValue({
      activeSheet: 'Data',
      sheets: [{ name: 'Data', headers: ['category'], originalHeaders: ['category'], rows: [{ category: 'A' }] }],
      summaries: [{ name: 'Data', rowCount: 1, columnCount: 1, empty: false }]
    });

    const response = await request(createApp()).get('/api/v1/chat/attachments/att-1/dataset/overview?sheet=Missing');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('SHEET_NOT_FOUND');
    expect(mocks.getAttachmentForUser).toHaveBeenCalledTimes(1);
    expect(mocks.parseTabularWorkbook).toHaveBeenCalledTimes(1);
    expect(buffer.every(byte => byte === 0)).toBe(true);
  });

  it('fails closed when the attachment is not owned by the request principal', async () => {
    mocks.getAttachmentForUser.mockRejectedValue(new Error('UNAUTHORIZED_ACCESS'));

    const response = await request(createApp()).get('/api/v1/chat/attachments/att-private/dataset/overview');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(mocks.parseTabularWorkbook).not.toHaveBeenCalled();
  });
});
