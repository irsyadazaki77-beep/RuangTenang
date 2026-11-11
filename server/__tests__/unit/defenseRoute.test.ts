/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  generateQuestions: vi.fn(),
  evaluateAnswer: vi.fn()
}));

vi.mock('../../services/defenseService.js', () => ({
  defenseService: {
    generateQuestions: mocks.generateQuestions,
    evaluateAnswer: mocks.evaluateAnswer
  }
}));

import { defenseRouter } from '../../routes/defense.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/ai', defenseRouter);
  return app;
};

describe('Defense AI Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/ai/defense/generate-questions', () => {
    it('returns 400 if thesisTitle is missing or whitespace', async () => {
      const res = await request(createApp())
        .post('/api/v1/ai/defense/generate-questions')
        .send({ thesisTitle: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('thesisTitle');
    });

    it('successfully calls defenseService.generateQuestions with sanitized input', async () => {
      const mockResult = [
        {
          id: 'q-1',
          examinerId: 'examiner-1',
          chapterTag: 'Bab 3: Metodologi',
          question: 'Bagaimana saudara menentukan sampling?',
          contextHint: 'Sebutkan rumus',
          expectedKeyPoints: ['Rumus Slovin'],
          suggestedCounterDefense: 'Kami menggunakan Slovin'
        }
      ];

      mocks.generateQuestions.mockResolvedValueOnce(mockResult);

      const res = await request(createApp())
        .post('/api/v1/ai/defense/generate-questions')
        .send({
          thesisTitle: 'Analisis Keamanan Jaringan IoT',
          examType: 'SIDANG_SKRIPSI',
          rigorLevel: 'killer'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockResult);
      expect(mocks.generateQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          thesisTitle: 'Analisis Keamanan Jaringan IoT',
          examType: 'SIDANG_SKRIPSI',
          rigorLevel: 'killer'
        })
      );
    });
  });

  describe('POST /api/v1/ai/defense/evaluate', () => {
    it('returns 400 if studentAnswer is empty', async () => {
      const res = await request(createApp())
        .post('/api/v1/ai/defense/evaluate')
        .send({
          studentAnswer: '',
          question: { id: 'q-1', question: 'Apa metodologi saudara?' },
          examiner: { id: 'examiner-1', name: 'Dr. Hendra', role: 'Ketua Penguji' }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('studentAnswer');
    });

    it('returns 400 if question is missing', async () => {
      const res = await request(createApp())
        .post('/api/v1/ai/defense/evaluate')
        .send({
          studentAnswer: 'Kami menggunakan pendekatan kualitatif dengan studi kasus.',
          examiner: { id: 'examiner-1', name: 'Dr. Hendra', role: 'Ketua Penguji' }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('question');
    });

    it('returns 400 if examiner is missing', async () => {
      const res = await request(createApp())
        .post('/api/v1/ai/defense/evaluate')
        .send({
          studentAnswer: 'Kami menggunakan pendekatan kualitatif dengan studi kasus.',
          question: { id: 'q-1', question: 'Apa metodologi saudara?' }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('examiner');
    });

    it('evaluates student defense argument successfully', async () => {
      const mockEvaluation = {
        questionId: 'q-1',
        studentAnswer: 'Kami menggunakan stratified sampling.',
        score: 85,
        grade: 'A',
        confidenceScore: 88,
        theoryScore: 85,
        defenseLogicScore: 86,
        critique: 'Dr. Hendra: Jawaban saudara sangat sistematis.',
        strengths: ['Tepat sasaran'],
        weaknesses: ['Perlu elaborasi instrumen'],
        suggestedImprovement: 'Sebutkan margin of error.',
        followUpQuestion: 'Bagaimana dengan reliabilitas Cronbach Alpha?'
      };

      mocks.evaluateAnswer.mockResolvedValueOnce(mockEvaluation);

      const res = await request(createApp())
        .post('/api/v1/ai/defense/evaluate')
        .send({
          studentAnswer: 'Kami menggunakan stratified sampling.',
          question: { id: 'q-1', question: 'Apa metodologi saudara?' },
          examiner: { id: 'examiner-1', name: 'Dr. Hendra', role: 'Ketua Penguji' },
          thesisTitle: 'Sistem Deteksi Anomali',
          rigorLevel: 'killer'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockEvaluation);
      expect(mocks.evaluateAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          thesisTitle: 'Sistem Deteksi Anomali',
          studentAnswer: 'Kami menggunakan stratified sampling.',
          rigorLevel: 'killer'
        })
      );
    });
  });
});
