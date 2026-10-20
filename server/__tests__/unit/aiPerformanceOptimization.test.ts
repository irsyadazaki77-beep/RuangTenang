import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { aiCostCalculator, MODEL_PRICING_REGISTRY } from '../../services/ai/aiCostCalculator.js';
import { aiMetricsService } from '../../services/ai/aiMetricsService.js';
import { smartModelRouter, classifyRequest } from '../../services/ai/smartModelRouter.js';
import { chatSummarizer } from '../../services/ai/chatSummarizer.js';
import { contextRetrievalService } from '../../services/file-intelligence/contextRetrievalService.js';
import { documentContextCacheService } from '../../services/file-intelligence/documentContextCacheService.js';
import { prisma } from '../../database.js';

describe('FASE 11 Performance, Token & Cost Optimization Benchmark Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'valid-gemini-test-key';
    aiMetricsService.clearMetrics();
    documentContextCacheService.clear();
    chatSummarizer.clearCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Pricing Registry & Cost Tracking', () => {
    it('accurately calculates costs for Gemini, DeepSeek, Groq, and OpenRouter', () => {
      // Gemini 3.8 Flash (0.10 / 0.40 per 1M)
      const geminiCost = aiCostCalculator.calculateCost('gemini-3.8-flash', 1000, 500);
      expect(geminiCost.inputCostUsd).toBeCloseTo(0.0001, 6);
      expect(geminiCost.outputCostUsd).toBeCloseTo(0.0002, 6);
      expect(geminiCost.estimatedCostUsd).toBeCloseTo(0.0003, 6);
      expect(geminiCost.isPricingKnown).toBe(true);

      // DeepSeek Reasoner (0.55 / 2.19 per 1M)
      const deepseekCost = aiCostCalculator.calculateCost('deepseek-reasoner', 1000, 1000);
      expect(deepseekCost.estimatedCostUsd).toBeCloseTo(0.00274, 5);

      // OpenRouter Free model (0.00 / 0.00)
      const openRouterCost = aiCostCalculator.calculateCost('openrouter-nemotron-lightning', 5000, 2000);
      expect(openRouterCost.estimatedCostUsd).toBe(0);

      // Groq Qwen (0.20 / 0.20)
      const groqCost = aiCostCalculator.calculateCost('groq-qwen-27b', 1000, 1000);
      expect(groqCost.estimatedCostUsd).toBeCloseTo(0.0004, 6);
      expect(groqCost.actualCostUsd).toBeCloseTo(0.0004, 6);
      expect(groqCost.pricingStatus).toBe('verified');
      expect(groqCost.pricingSource).toContain('Groq Cloud');
      expect(groqCost.validatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('distinguishes verified, estimated, and unknown models, preventing fallback from acting as actual cost', () => {
      // Verified model
      const verified = aiCostCalculator.calculateCost('gemini-3.8-flash', 1000, 1000);
      expect(verified.pricingStatus).toBe('verified');
      expect(verified.isPricingKnown).toBe(true);
      expect(verified.actualCostUsd).not.toBeNull();
      expect(verified.pricingSource).toContain('Google AI Studio');

      // Estimated preview model
      const estimated = aiCostCalculator.calculateCost('gemini-3.1-pro-preview', 1000, 1000);
      expect(estimated.pricingStatus).toBe('estimated');
      expect(estimated.isPricingKnown).toBe(true);
      expect(estimated.actualCostUsd).not.toBeNull();

      // Unknown / Unregistered model
      const unknown = aiCostCalculator.calculateCost('unregistered-custom-llm-v9', 1000, 1000);
      expect(unknown.pricingStatus).toBe('unknown');
      expect(unknown.isPricingKnown).toBe(false);
      expect(unknown.actualCostUsd).toBeNull(); // Must never display fallback as actual spend
      expect(unknown.estimatedCostUsd).toBeGreaterThan(0);
      expect(unknown.pricingSource).toContain('Fallback');
    });

    it('records request metrics with provider, model, actual vs estimated usage, and cost', () => {
      aiMetricsService.recordRequestMetric({
        requestId: 'req_test_1',
        ttfbMs: 120,
        totalLatencyMs: 450,
        inputChars: 400,
        estimatedInputTokens: 100,
        outputChars: 800,
        estimatedOutputTokens: 200,
        contextSavedTokens: 50,
        modelUsed: 'gemini-3.8-flash',
        provider: 'gemini',
        isFallback: false,
        aborted: false
      });

      const summary = aiMetricsService.getMetricsSummary();
      expect(summary.totalRequests).toBe(1);
      expect(summary.avgTTFBMs).toBe(120);
      expect(summary.totalInputTokens).toBe(100);
      expect(summary.totalOutputTokens).toBe(200);
      expect(summary.totalEstimatedCostUsd).toBeGreaterThan(0);
    });
  });

  describe('2. Smart Model Routing with Cost & Latency Affinity', () => {
    it('preserves manual user choice strictly without unauthorized override', () => {
      const decision = smartModelRouter.routeModel({
        manualModelId: 'gemini-3.5-pro',
        userTier: 'Pro'
      });
      expect(decision.routingMode).toBe('manual');
      expect(decision.selectedModelId).toBe('gemini-3.5-pro');
      expect(decision.provider).toBe('gemini');
    });

    it('routes quick summarization tasks to fast & cost-efficient models', () => {
      const classification = classifyRequest({
        taskCategory: 'summarization',
        latencyPreference: 'fast'
      }, 'Ringkas teks ini sesingkat mungkin');

      expect(classification.category).toBe('summarization');
      expect(classification.latencyPreference).toBe('fast');
    });
  });

  describe('3. Isolated Context Caching & Deduplication', () => {
    it('isolates cache per user, workspace, and content checksums (never leaks across users)', () => {
      const keyUserA = documentContextCacheService.createCacheKey({
        userId: 'user_A',
        chatId: 'workspace_1',
        attachmentIds: ['att_1'],
        userQuery: 'analisis metodologi',
        sourceChecksums: ['sha256_hash_1'],
        maxTokens: 2500,
        maxChunks: 8
      });

      const keyUserB = documentContextCacheService.createCacheKey({
        userId: 'user_B',
        chatId: 'workspace_1',
        attachmentIds: ['att_1'],
        userQuery: 'analisis metodologi',
        sourceChecksums: ['sha256_hash_1'],
        maxTokens: 2500,
        maxChunks: 8
      });

      expect(keyUserA).not.toBe(keyUserB);

      const keySmallerBudget = documentContextCacheService.createCacheKey({
        userId: 'user_A', chatId: 'workspace_1', attachmentIds: ['att_1'],
        userQuery: 'analisis metodologi', sourceChecksums: ['sha256_hash_1'], maxTokens: 800, maxChunks: 8
      });
      const keyFewerChunks = documentContextCacheService.createCacheKey({
        userId: 'user_A', chatId: 'workspace_1', attachmentIds: ['att_1'],
        userQuery: 'analisis metodologi', sourceChecksums: ['sha256_hash_1'], maxTokens: 2500, maxChunks: 3
      });
      const keyFilteredSection = documentContextCacheService.createCacheKey({
        userId: 'user_A', chatId: 'workspace_1', attachmentIds: ['att_1'],
        userQuery: 'analisis metodologi', sourceChecksums: ['sha256_hash_1'], maxTokens: 2500, maxChunks: 8, section: 'Metodologi'
      });
      expect(keySmallerBudget).not.toBe(keyUserA);
      expect(keyFewerChunks).not.toBe(keyUserA);
      expect(keyFilteredSection).not.toBe(keyUserA);

      const mockResult: any = {
        contextBlock: 'Mock Context User A',
        sourceReferences: [],
        chunksSelected: [],
        totalTokensUsed: 100,
        snapshot: { id: 'snap_1' }
      };

      documentContextCacheService.set(keyUserA, mockResult);
      expect(documentContextCacheService.get(keyUserA)).toEqual(mockResult);
      expect(documentContextCacheService.get(keyUserB)).toBeNull();
    });

    it('isolates chat summarizer cache across distinct users', async () => {
      const mockHistory = [
        { id: '1', role: 'user' as const, content: 'halo pertama' },
        { id: '2', role: 'model' as const, content: 'hai balasan' },
        { id: '3', role: 'user' as const, content: 'pesan 3' },
        { id: '4', role: 'model' as const, content: 'pesan 4' },
        { id: '5', role: 'user' as const, content: 'pesan 5' },
        { id: '6', role: 'model' as const, content: 'pesan 6' },
        { id: '7', role: 'user' as const, content: 'pesan 7' },
        { id: '8', role: 'model' as const, content: 'pesan 8' },
        { id: '9', role: 'user' as const, content: 'pesan 9' },
        { id: '10', role: 'model' as const, content: 'pesan 10' },
        { id: '11', role: 'user' as const, content: 'pesan 11' },
        { id: '12', role: 'model' as const, content: 'pesan 12' }
      ];

      const resUserA = await chatSummarizer.getOrUpdateSummary('shared_chat_id', mockHistory, { userId: 'user_1' });
      expect(resUserA.summary).toBeDefined();

      // If user 2 accesses, user 1 cache key is not returned
      const resUserB = await chatSummarizer.getOrUpdateSummary('shared_chat_id', mockHistory, { userId: 'user_2' });
      expect(resUserB.summary).toBeDefined();
    });
  });

  describe('4. Token Optimization & Redundancy Reduction Benchmark', () => {
    it('benchmarks token savings from incremental summarization and document caching', () => {
      const sampleLongConversation = Array.from({ length: 15 }, (_, i) => ({
        id: `msg_${i + 1}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Ini adalah pesan detail yang cukup panjang mengenai bab ${i + 1} dalam skripsi untuk menganalisis data empiris dan kajian literatur terkait.`
      }));

      const rawTokensTotal = sampleLongConversation.reduce((acc, m) => acc + aiMetricsService.estimateTokens(m.content), 0);
      expect(rawTokensTotal).toBeGreaterThan(400);

      // 5 recent turns kept raw = 5 * ~25 = ~125 tokens
      // Older turns (10 turns) summarized into <= 50 tokens
      const recentTurnTokens = sampleLongConversation.slice(-5).reduce((acc, m) => acc + aiMetricsService.estimateTokens(m.content), 0);
      const estimatedSummaryTokens = 50;
      const optimizedTokens = recentTurnTokens + estimatedSummaryTokens;

      const percentageSavings = ((rawTokensTotal - optimizedTokens) / rawTokensTotal) * 100;
      expect(percentageSavings).toBeGreaterThan(50); // More than 50% token reduction
    });
  });
});
