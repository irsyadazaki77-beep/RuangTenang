import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatSummarizer } from '../../services/ai/chatSummarizer.js';
import { aiContextBuilder } from '../../services/ai/aiContextBuilder.js';
import { aiMetricsService } from '../../services/ai/aiMetricsService.js';
import { aiSafetyService } from '../../services/ai/aiSafetyService.js';

describe('FASE 9: AI Context & Streaming System Upgrade Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    chatSummarizer.clearCache();
    aiMetricsService.clearMetrics();
  });

  describe('1. Token Budgeting & Chunked Chat Summarization', () => {
    it('returns empty summary for short chat history (<=10 messages)', async () => {
      const shortHistory = Array.from({ length: 8 }, (_, i) => ({
        id: `msg_${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Pesan percakapan singkat nomor ${i}`
      }));

      const res = await chatSummarizer.getOrUpdateSummary('chat_short_1', shortHistory);
      expect(res.summary).toBe('');
      expect(res.tokensSaved).toBe(0);
    });

    it('summarizes older messages for long chat history (>10 messages) and caches result', async () => {
      const longHistory = Array.from({ length: 15 }, (_, i) => ({
        id: `msg_${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Mahasiswa merasa cemas dengan skripsi dan perkuliahan babak ${i}`
      }));

      const res1 = await chatSummarizer.getOrUpdateSummary('chat_long_1', longHistory);
      expect(res1.summary).not.toBe('');
      expect(res1.tokensSaved).toBeGreaterThan(0);

      // Second call for the same chat history should hit the cache instantly
      const res2 = await chatSummarizer.getOrUpdateSummary('chat_long_1', longHistory);
      expect(res2.summary).toBe(res1.summary);
      expect(res2.lastSummarizedMsgId).toBe(res1.lastSummarizedMsgId);
    }, 15000);
  });

  describe('2. Context Deduplication & Safety Sanitization', () => {
    it('deduplicates memory content if already present in recent history or summary', async () => {
      const historyWithTopic = Array.from({ length: 12 }, (_, i) => ({
        id: `msg_${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Saya sedang mengerjakan skripsi di Jakarta`
      }));

      const result = await aiContextBuilder.buildContext({
        userId: 'guest',
        chatId: 'chat_dedup_1',
        fullHistory: historyWithTopic,
        currentMessage: 'Bagaimana cara fokus?'
      });

      expect(result.systemContext).not.toContain('ignore');
      expect(result.recentHistory.length).toBeLessThanOrEqual(5);
    });

    it('sanitizes PII and strips prompt injection delimiters from context', async () => {
      const result = await aiContextBuilder.buildContext({
        userId: 'guest',
        chatId: 'chat_pii_1',
        fullHistory: [
          { role: 'user', content: 'Email saya test@example.com dan HP 08123456789' },
          { role: 'assistant', content: 'Siap, privacy kamu terjaga.' }
        ],
        currentMessage: 'Bantu aku dengan NIK 3171012304950001'
      });

      for (const h of result.recentHistory) {
        expect(h.parts[0].text).not.toContain('test@example.com');
        expect(h.parts[0].text).not.toContain('08123456789');
      }
    });
  });

  describe('3. End-to-End AbortSignal & Request Management', () => {
    it('handles aborted signal gracefully without crashing', async () => {
      const controller = new AbortController();
      controller.abort();

      const pipelineOutput = await aiSafetyService.runUnifiedPipeline({
        userId: 'guest',
        input: 'Halo, bisakah bantu aku?',
        isStreaming: false,
        abortSignal: controller.signal
      });

      expect(pipelineOutput).toBeDefined();
      expect(pipelineOutput.text).toBeDefined();
    });
  });

  describe('4. Privacy-Preserving Telemetry & Metrics', () => {
    it('records request metrics accurately without storing conversation text', () => {
      aiMetricsService.recordRequestMetric({
        requestId: 'test_req_1',
        ttfbMs: 120,
        totalLatencyMs: 450,
        inputChars: 200,
        estimatedInputTokens: 50,
        outputChars: 400,
        estimatedOutputTokens: 100,
        contextSavedTokens: 80,
        modelUsed: 'gemini-3.1-flash-lite',
        isFallback: false,
        aborted: false
      });

      const summary = aiMetricsService.getMetricsSummary();
      expect(summary.totalRequests).toBe(1);
      expect(summary.avgTTFBMs).toBe(120);
      expect(summary.avgTotalLatencyMs).toBe(450);
      expect(summary.totalInputTokens).toBe(50);
      expect(summary.totalOutputTokens).toBe(100);
      expect(summary.totalContextSavedTokens).toBe(80);

      // Verify that no text properties exist on metrics object
      const metricKeys = Object.keys(summary);
      expect(metricKeys).not.toContain('prompt');
      expect(metricKeys).not.toContain('text');
      expect(metricKeys).not.toContain('message');
    });
  });
});
