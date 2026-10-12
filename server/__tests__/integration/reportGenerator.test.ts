import { describe, it, expect, vi } from 'vitest';
import { buildRectorateReportRows, generateRectorateReport, generateStudentProgressPdf } from '../../services/reportGenerator';
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

vi.mock('../../database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Budi Santoso',
        university: 'Universitas Indonesia'
      })
    },
    chats: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'chat-1',
        summary: JSON.stringify({
          masalahUtama: 'Mengalami ketegangan akademis karena tugas menumpuk.',
          emosi: ['Cemas', 'Lelah'],
          poinPenting: ['Mengerjakan tugas kecil', 'Istirahat teratur'],
          langkahBerikutnya: ['Pernapasan 4-4-4-4', 'Jurnal harian']
        })
      }),
      findFirst: vi.fn().mockResolvedValue({
        id: 'chat-1',
        summary: JSON.stringify({
          masalahUtama: 'Mengalami ketegangan akademis karena tugas menumpuk.',
          emosi: ['Cemas', 'Lelah'],
          poinPenting: ['Mengerjakan tugas kecil', 'Istirahat teratur'],
          langkahBerikutnya: ['Pernapasan 4-4-4-4', 'Jurnal harian']
        })
      })
    },
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
    },
    moodLogs: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'mood-1',
          userId: 'user-1',
          score: 4,
          note: 'Merasa lebih baik',
          timestamp: new Date()
        }
      ])
    }
  }
}));

describe('Report Generator Services', () => {
  it('generates rectorate report PDF path', async () => {
    const metrics = {
      completedAppointments: 12,
      totalScreenings: 20,
      selfHarmRiskScreenings: 6,
      minimumGroupSize: 5,
      dateRange: '2026-09-11 – 2026-10-11'
    };
    const resultPath = await generateRectorateReport(metrics);
    expect(resultPath).to.contain('Laporan_Rektorat_Agregat_');
    expect(resultPath).to.contain('.pdf');
  });

  it('renders only computed metrics and suppresses small groups with their denominator', () => {
    const rows = buildRectorateReportRows({
      completedAppointments: 12,
      totalScreenings: 20,
      selfHarmRiskScreenings: 6,
      minimumGroupSize: 5,
      dateRange: '2026-09-11 – 2026-10-11'
    });
    const riskRow = rows.find(row => row.category.includes('indikator risiko'));
    expect(riskRow?.value).toBe('6 dari 20 (30.0%)');
    expect(riskRow?.details).toContain('Pembilang 6; penyebut 20');
    expect(rows.some(row => /45%|25%|20%|10%|-4\.5|-5\.2|3\.2%|100% anonim/i.test(`${row.value} ${row.details}`))).toBe(false);

    const suppressedRows = buildRectorateReportRows({
      completedAppointments: 2,
      totalScreenings: 8,
      selfHarmRiskScreenings: 2,
      minimumGroupSize: 5,
      dateRange: '2026-09-11 – 2026-10-11'
    });
    expect(suppressedRows.find(row => row.category === 'Janji temu selesai')?.value).toContain('Disembunyikan');
    expect(suppressedRows.find(row => row.category.includes('indikator risiko'))?.value).toContain('Disembunyikan');
  });

  it('generates student progress PDF buffer', async () => {
    const buffer = await generateStudentProgressPdf('user-1', 'Budi Santoso');
    expect(buffer).toBeDefined();
    // In our mock, PDFDocument will output some binary data chunk, which is concatenated to Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
