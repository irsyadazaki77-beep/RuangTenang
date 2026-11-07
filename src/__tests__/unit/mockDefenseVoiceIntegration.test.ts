import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateMockQuestions,
  evaluateDefenseAnswer,
  generateDefenseReportMarkdown,
  DEFAULT_EXAMINERS,
  type DefenseQuestion,
  type MockDefenseSession,
} from '../../features/workspace/utils/mockDefenseModel';
import {
  speechDefenseService,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../../features/workspace/services/speechDefenseService';

describe('Voice Defense Simulator & Thesis Co-Pilot', () => {
  describe('Examiners & Question Generation', () => {
    it('has 3 official AI examiners configured with Indonesian personas', () => {
      expect(DEFAULT_EXAMINERS).toHaveLength(3);
      const names = DEFAULT_EXAMINERS.map(e => e.name);
      expect(names).toContain('Dr. Ir. Hendra Suhartono, M.Kom.');
      expect(names).toContain('Prof. Dr. Ratna Kusuma Dewi, M.Si.');
      expect(names).toContain('Dra. Hj. Nurul Hidayati, M.Pd.');
    });

    it('generates standard defense questions tailored for Proposal Seminar (Sempro)', () => {
      const questions = generateMockQuestions(
        'Analisis Sentimen Algoritma SVM',
        'SEMINAR_PROPOSAL',
        'Penelitian ini menggunakan dataset ulasan Google Play Store sebanyak 1000 data.'
      );

      expect(questions).toHaveLength(4);
      expect(questions.every(q => Boolean(q.id && q.examinerId && q.question))).toBe(true);
      // Examiner distribution check
      const assignedExaminers = new Set(questions.map(q => q.examinerId));
      expect(assignedExaminers.size).toBeGreaterThanOrEqual(2);
    });

    it('generates advanced defense questions tailored for Final Thesis Defense (Sidang Skripsi)', () => {
      const questions = generateMockQuestions(
        'Sistem Deteksi Anomali Jaringan Komputer',
        'SIDANG_SKRIPSI'
      );

      expect(questions).toHaveLength(4);
      // Questions should target results, validation, and contribution
      const allText = questions.map(q => q.question).join(' ');
      expect(allText).toMatch(/kontribusi|hasil|metode|evaluasi|kesimpulan|temuan/i);
    });
  });

  describe('Answer Evaluation & Scoring Matrix', () => {
    const sampleQuestion: DefenseQuestion = {
      id: 'q1',
      examinerId: 'examiner-1',
      chapterTag: 'Bab 3: Metodologi Penelitian',
      question: 'Mengapa Anda memilih algoritma ini dan bagaimana validitas datanya?',
      contextHint: 'Fokus pada teknik sampling dan metrik evaluasi model.',
      expectedKeyPoints: ['Justifikasi pemilihan metode', 'Validasi dan evaluasi data'],
      suggestedCounterDefense: 'Sebutkan keunggulan metode dan pengujian k-fold cross validation.',
    };

    it('penalizes short, evasive, or tautological answers', () => {
      const shortAnswer = 'Karena mudah dipakai dan disuruh dosen.';
      const evalResult = evaluateDefenseAnswer(sampleQuestion, shortAnswer);

      expect(evalResult.score).toBeLessThanOrEqual(55);
      expect(evalResult.critique.toLowerCase()).toMatch(/terlalu singkat|kurang|argumentasi|teori/);
    });

    it('rewards structured, evidence-backed, and methodological answers', () => {
      const strongAnswer = `Pemilihan metode ini didasarkan pada tinjauan pustaka terdahulu yang menunjukkan akurasi tinggi pada dataset tidak seimbang. Validitas data diuji menggunakan teknik stratified k-fold cross-validation 5-fold, dengan metrik precision, recall, dan F1-score untuk memitigasi bias sampling sehingga temuan penelitian memiliki reliabilitas tinggi.`;
      const evalResult = evaluateDefenseAnswer(sampleQuestion, strongAnswer);

      expect(evalResult.score).toBeGreaterThanOrEqual(75);
      expect(evalResult.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('Defense Report Markdown Generation', () => {
    it('generates complete official minutes report with pass status and examiner notes', () => {
      const q1: DefenseQuestion = {
        id: 'q1',
        examinerId: 'examiner-1',
        chapterTag: 'Bab 3: Metodologi',
        question: 'Bagaimana penentuan sampel?',
        contextHint: 'Slovin formula',
        expectedKeyPoints: ['Slovin', 'Margin of error'],
        suggestedCounterDefense: 'Jelaskan rumus dan signifikansi sampling.',
      };
      const q2: DefenseQuestion = {
        id: 'q2',
        examinerId: 'examiner-2',
        chapterTag: 'Bab 2: Landasan Teori',
        question: 'Jelaskan keterkaitan variabel X dan Y.',
        contextHint: 'Korelasi konseptual',
        expectedKeyPoints: ['Korelasi teori'],
        suggestedCounterDefense: 'Kaitkan dengan sintesis rujukan jurnal bereputasi.',
      };

      const session: MockDefenseSession = {
        id: 'session-test-1',
        examType: 'SIDANG_SKRIPSI',
        thesisTitle: 'Penerapan NLP pada Analisis Ulasan Konsumen',
        studentName: 'Mahasiswa Berprestasi',
        examiners: DEFAULT_EXAMINERS,
        questions: [q1, q2],
        evaluations: {
          q1: {
            questionId: 'q1',
            studentAnswer: 'Sampel dihitung dengan rumus Slovin dengan margin of error 5%.',
            score: 88,
            grade: 'A',
            confidenceScore: 85,
            theoryScore: 90,
            defenseLogicScore: 89,
            critique: 'Penjelasan metodologis sangat baik dan tepat sasaran.',
            strengths: ['Menggunakan rumus baku', 'Margin of error jelas'],
            weaknesses: [],
            suggestedImprovement: 'Pertahankan ketenangan saat memaparkan rumus.',
          },
          q2: {
            questionId: 'q2',
            studentAnswer: 'Variabel X mempengaruhi Y secara linear berdasarkan teori Z.',
            score: 82,
            grade: 'B+',
            confidenceScore: 80,
            theoryScore: 85,
            defenseLogicScore: 81,
            critique: 'Rasionalitas teori cukup solid.',
            strengths: ['Landasan konseptual jelas'],
            weaknesses: ['Perlu rujukan jurnal bereputasi terbaru'],
            suggestedImprovement: 'Tambahkan sitasi internasional bereputasi.',
          },
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        finalScore: 85,
        finalGrade: 'A',
        summaryVerdict: 'LULUS DENGAN PUJIAN',
      };

      const report = generateDefenseReportMarkdown(session);

      expect(report).toContain('BERITA ACARA SIMULASI');
      expect(report).toContain('SIDANG SKRIPSI');
      expect(report).toMatch(/Lulus/i);
      expect(report).toContain('85');
      expect(report).toContain('Dr. Ir. Hendra Suhartono');
      expect(report).toContain('Prof. Dr. Ratna Kusuma Dewi');
      expect(report).toContain('Catatan Dewan Penguji untuk Revisi Naskah');
      expect(report).toContain('Rekapitulasi Penilaian Butir Pertanyaan');
    });
  });

  describe('Speech Defense Service (Offline Web Speech API)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('gracefully handles headless / non-browser environment for speech recognition', () => {
      const isSupported = isSpeechRecognitionSupported();
      expect(typeof isSupported).toBe('boolean');

      const mockCb = vi.fn();
      const mockErr = vi.fn();
      const success = speechDefenseService.startListening({
        onResult: mockCb,
        onError: mockErr,
      });

      expect(success).toBe(false);
      expect(mockErr).toHaveBeenCalledWith(expect.stringContaining('tidak mendukung Web Speech Recognition'));

      expect(() => {
        speechDefenseService.stopListening();
      }).not.toThrow();
    });

    it('gracefully handles speech synthesis in non-speech environment', () => {
      const isTtsSupported = isSpeechSynthesisSupported();
      expect(typeof isTtsSupported).toBe('boolean');

      const onEnd = vi.fn();
      expect(() => {
        speechDefenseService.speak('Halo mahasiswa, silakan presentasikan skripsi Anda.', {
          onEnd,
        });
      }).not.toThrow();

      expect(() => {
        speechDefenseService.stopSpeaking();
      }).not.toThrow();
    });
  });
});
