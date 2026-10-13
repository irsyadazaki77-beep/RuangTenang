import { describe, it, expect, vi } from 'vitest';
import { buildRectorateReportRows, generateRectorateReport, generateStudentProgressPdf, evaluateScreeningTrends } from '../../services/reportGenerator';
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

  describe('Clinical Screening Trend Evaluation (PHQ-9 & GAD-7)', () => {
    it('evaluates baseline appropriately when no previous screening is available', () => {
      const evaluation = evaluateScreeningTrends({ phq9Score: 8, gad7Score: 6 }, null);
      expect(evaluation.overallSummary).toContain('baseline');
      expect(evaluation.phqAnalysis).toContain('Belum ada data skrining pembanding');
      expect(evaluation.gadAnalysis).toContain('Belum ada data skrining pembanding');
      expect(evaluation.overallSummary).not.toContain('membaik');
      expect(evaluation.overallSummary).not.toContain('peningkatan tekanan');
    });

    it('evaluates concordant improvement when both scores decrease', () => {
      const evaluation = evaluateScreeningTrends(
        { phq9Score: 5, gad7Score: 4 },
        { phq9Score: 12, gad7Score: 9 }
      );
      expect(evaluation.phqAnalysis).toContain('penurunan (-7 poin');
      expect(evaluation.gadAnalysis).toContain('penurunan (-5 poin');
      expect(evaluation.overallSummary).toContain('penurunan skor secara searah');
    });

    it('evaluates concordant deterioration when both scores increase', () => {
      const evaluation = evaluateScreeningTrends(
        { phq9Score: 16, gad7Score: 14 },
        { phq9Score: 9, gad7Score: 7 }
      );
      expect(evaluation.phqAnalysis).toContain('peningkatan (+7 poin');
      expect(evaluation.gadAnalysis).toContain('peningkatan (+7 poin');
      expect(evaluation.overallSummary).toContain('peningkatan skor secara searah');
    });

    it('evaluates discordant changes separately without stating condition is improving when one increases', () => {
      // PHQ-9 decreases (12 -> 6), but GAD-7 increases (4 -> 11)
      const evaluationPhqDownGadUp = evaluateScreeningTrends(
        { phq9Score: 6, gad7Score: 11 },
        { phq9Score: 12, gad7Score: 4 }
      );
      expect(evaluationPhqDownGadUp.phqAnalysis).toContain('penurunan (-6 poin');
      expect(evaluationPhqDownGadUp.gadAnalysis).toContain('peningkatan (+7 poin');
      expect(evaluationPhqDownGadUp.overallSummary).toContain('Dinamika berlawanan arah');
      expect(evaluationPhqDownGadUp.overallSummary).not.toContain('menunjukkan tren membaik');

      // PHQ-9 increases (5 -> 14), but GAD-7 decreases (12 -> 4)
      const evaluationPhqUpGadDown = evaluateScreeningTrends(
        { phq9Score: 14, gad7Score: 4 },
        { phq9Score: 5, gad7Score: 12 }
      );
      expect(evaluationPhqUpGadDown.phqAnalysis).toContain('peningkatan (+9 poin');
      expect(evaluationPhqUpGadDown.gadAnalysis).toContain('penurunan (-8 poin');
      expect(evaluationPhqUpGadDown.overallSummary).toContain('Dinamika berlawanan arah');
      expect(evaluationPhqUpGadDown.overallSummary).not.toContain('menunjukkan tren membaik');
    });

    it('evaluates stable status when both scores remain unchanged', () => {
      const evaluation = evaluateScreeningTrends(
        { phq9Score: 7, gad7Score: 5 },
        { phq9Score: 7, gad7Score: 5 }
      );
      expect(evaluation.phqAnalysis).toContain('stabil tanpa perubahan');
      expect(evaluation.gadAnalysis).toContain('stabil tanpa perubahan');
      expect(evaluation.overallSummary).toContain('tetap stabil');
    });
  });
});
