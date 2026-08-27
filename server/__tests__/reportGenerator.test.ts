import { describe, it, expect, vi } from 'vitest';
import { generateRectorateReport, generateStudentProgressPdf } from '../services/reportGenerator';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs') as any;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      createWriteStream: vi.fn(() => ({
        on: vi.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        }),
        once: vi.fn(),
        emit: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        removeListener: vi.fn(),
      })),
    }
  };
});

vi.mock('../database', () => ({
  prisma: {
    assessmentResult: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'test-1',
          userId: 'user-1',
          timestamp: new Date('2023-10-01'),
          phq9Score: 12,
          gad7Score: 10
        }
      ])
    },
    screenings: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'test-1',
          userId: 'user-1',
          timestamp: new Date('2023-10-01'),
          phq9Score: 12,
          gad7Score: 10
        }
      ])
    }
  }
}));

describe('Report Generator Services', () => {
  it('generates rectorate report PDF path', async () => {
    const metrics = {
      totalSessions: 100,
      crisisRatio: '1:10',
      mostCommonConcern: 'Skripsi',
      dateRange: 'Jan - Mar 2024'
    };
    const resultPath = await generateRectorateReport(metrics);
    expect(resultPath).to.contain('Laporan_Rektorat_Agregat_');
    expect(resultPath).to.contain('.pdf');
  });

  it('generates student progress PDF buffer', async () => {
    const buffer = await generateStudentProgressPdf('user-1', 'Budi Santoso');
    expect(buffer).toBeDefined();
    // In our mock, PDFDocument will output some binary data chunk, which is concatenated to Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
