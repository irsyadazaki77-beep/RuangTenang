import { describe, it, expect } from 'vitest';
import {
  generateMockQuestions,
  evaluateDefenseAnswer,
  generateDefenseReportMarkdown,
  DEFAULT_EXAMINERS,
  MockDefenseSession
} from '../../features/workspace/utils/mockDefenseModel';

describe('Mock Defense Model & Simulation Engine', () => {
  it('generates proposal-specific questions when examType is SEMINAR_PROPOSAL', () => {
    const questions = generateMockQuestions('Pengaruh AI Terhadap Mahasiswa', 'SEMINAR_PROPOSAL');
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.some(q => q.chapterTag.includes('Bab 1') || q.chapterTag.includes('Research Gap'))).toBe(true);
    expect(questions.some(q => q.chapterTag.includes('Bab 3') || q.chapterTag.includes('Sampling'))).toBe(true);
  });

  it('generates defense-specific questions when examType is SIDANG_SKRIPSI', () => {
    const questions = generateMockQuestions('Pengaruh AI Terhadap Mahasiswa', 'SIDANG_SKRIPSI');
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.some(q => q.chapterTag.includes('Bab 4') || q.chapterTag.includes('Hasil'))).toBe(true);
    expect(questions.some(q => q.chapterTag.includes('Bab 5') || q.chapterTag.includes('Keterbatasan'))).toBe(true);
  });

  it('evaluates brief answers as needing improvement', () => {
    const questions = generateMockQuestions('Topik Skripsi', 'SEMINAR_PROPOSAL');
    const evaluation = evaluateDefenseAnswer(questions[0], 'Karena bagus.');
    expect(evaluation.score).toBeLessThan(60);
    expect(evaluation.grade).toBe('Perlu Perbaikan');
    expect(evaluation.critique).toContain('terlalu singkat');
    expect(evaluation.suggestedImprovement).toBe(questions[0].suggestedCounterDefense);
  });

  it('evaluates comprehensive answers matching keypoints with a high score', () => {
    const questions = generateMockQuestions('Topik Skripsi', 'SEMINAR_PROPOSAL');
    const answer = 'Berdasarkan telaah literatur 5 tahun terakhir, penelitian sebelumnya mayoritas hanya berfokus pada variabel X secara parsial. Terdapat gap empiris di mana konteks Y belum pernah diuji secara terintegrasi pada target populasi ini. Oleh karena itu, kebaruan penelitian ini mengisi kekosongan tersebut dengan bukti empiris.';
    const evaluation = evaluateDefenseAnswer(questions[0], answer);
    expect(evaluation.score).toBeGreaterThanOrEqual(80);
    expect(['A', 'B+']).toContain(evaluation.grade);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
  });

  it('generates an academic protocol report in markdown', () => {
    const questions = generateMockQuestions('Analisis Sistem NLP', 'SIDANG_SKRIPSI');
    const session: MockDefenseSession = {
      id: 'session-123',
      examType: 'SIDANG_SKRIPSI',
      thesisTitle: 'Analisis Sistem NLP',
      examiners: DEFAULT_EXAMINERS,
      questions,
      evaluations: {
        [questions[0].id]: {
          questionId: questions[0].id,
          studentAnswer: 'Kami menggunakan pendekatan kualitatif dengan uji triangulasi data.',
          score: 85,
          grade: 'A',
          confidenceScore: 88,
          theoryScore: 82,
          defenseLogicScore: 85,
          critique: 'Argumen sangat solid.',
          strengths: ['Rasional'],
          weaknesses: [],
          suggestedImprovement: 'Bisa diperkaya studi kasus.'
        }
      },
      startedAt: new Date().toISOString()
    };

    const md = generateDefenseReportMarkdown(session);
    expect(md).toContain('Berita Acara Evaluasi Simulasi Ujian Sidang');
    expect(md).toContain('Analisis Sistem NLP');
    expect(md).toContain('Dewan Penguji');
  });
});
