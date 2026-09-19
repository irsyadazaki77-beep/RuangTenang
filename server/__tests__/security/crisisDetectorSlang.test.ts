import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { analyzeMessageSentiment, isAcuteCrisis } from '../../../src/lib/crisisDetector.js';
import chatRouter from '../../routes/chat.js';
import { aiRequestService } from '../../services/ai/aiRequestService.js';

describe('Crisis Detector Indonesian Slang & Pre-flight Safe Interceptor Tests', () => {
  describe('Indonesian Slang & Informal Expression Detection (Unit)', () => {
    const positiveTestCases = [
      { text: 'aku capek bgt pengen udahan hidup', description: 'slang abbreviation bgt + udahan hidup' },
      { text: 'pengen nyerah aja rasanya', description: 'informal despair rasanya + nyerah aja' },
      { text: 'ga kuat lagi sumpah pgn nyusul dia', description: 'informal pgn nyusul dia' },
      { text: 'bund1r aja kali ya', description: 'leetspeak bund1r' },
      { text: 'pengen ngilaaaang selamanya dari dunia', description: 'excessive repeated characters ngilaaaang' },
      { text: 'mau sayat tangan biar tenang', description: 'direct self harm ideation' }
    ];

    positiveTestCases.forEach(({ text, description }) => {
      it(`accurately detects acute crisis: "${text}" (${description})`, () => {
        const result = analyzeMessageSentiment(text);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe('crisis');
        expect(isAcuteCrisis(text)).toBe(true);
      });
    });

    const negativeTestCases = [
      { text: 'aku capek banget habis lari pagi', description: 'physical exhaustion from exercise' },
      { text: 'pengen tidur siang sebentar', description: 'desire to take a daytime nap' },
      { text: 'tugas kuliah bikin pusing', description: 'academic stress / headache without crisis' }
    ];

    negativeTestCases.forEach(({ text, description }) => {
      it(`does not trigger false positive: "${text}" (${description})`, () => {
        const result = analyzeMessageSentiment(text);
        expect(result.isCrisis).toBe(false);
        expect(result.severity).not.toBe('crisis');
        expect(isAcuteCrisis(text)).toBe(false);
      });
    });
  });

  describe('Pre-flight Safe Interceptor (Integration)', () => {
    let app: any;
    let generateSpy: any;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use('/api', chatRouter);

      // Spy on external LLM service to assert zero invocations on crisis
      generateSpy = vi.spyOn(aiRequestService, 'generateChatResponse').mockImplementation(async () => {
        throw new Error('LLM_SERVICE_SHOULD_NOT_BE_CALLED_FOR_CRISIS');
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('short-circuits and never calls external LLM when user message contains acute crisis', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          message: 'aku capek bgt pengen udahan hidup rasanya'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isCrisis).toBe(true);

      // Verify that external LLM was NOT invoked
      expect(generateSpy).not.toHaveBeenCalled();

      // Verify emergency response contains official hotlines (119 ext 8 & LISA)
      const responseText = res.body.message || res.body.response || '';
      expect(responseText).toMatch(/119/);
      expect(responseText).toMatch(/LISA/i);

      // Verify contacts payload
      if (res.body.hotlines) {
        expect(res.body.hotlines).toContain('119 ext 8');
      }
    });

    it('short-circuits on leetspeak bund1r in chat endpoint without LLM invocation', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          message: 'bund1r aja kali ya udah ga kuat'
        });

      expect(res.status).toBe(200);
      expect(res.body.isCrisis).toBe(true);
      expect(generateSpy).not.toHaveBeenCalled();
      const responseText = res.body.message || res.body.response || '';
      expect(responseText).toMatch(/119/);
    });
  });
});
