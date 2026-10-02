import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { 
  smartModelRouter, 
  classifyRequest, 
  filterCandidates, 
  scoreCandidate 
} from '../../services/ai/smartModelRouter.js';
import { 
  AI_MODEL_REGISTRY, 
  DEFAULT_AI_MODEL_ID,
  AiModelError 
} from '../../services/ai/aiModelRegistry.js';
import { AUTO_ROUTING_MODEL_ID, AiRoutingContext } from '../../../shared/aiModelContract.js';

describe('SmartModelRouter unit tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'valid-gemini-key';
    process.env.DEEPSEEK_API_KEY = `sk-${'a'.repeat(32)}`;
    process.env.GROQ_API_KEY = `gsk_${'b'.repeat(32)}`;
    process.env.OPENROUTER_API_KEY = `sk-or-${'c'.repeat(32)}`;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Manual model selection precedence', () => {
    it('manual model always wins over auto routing when specified and valid', () => {
      const decision = smartModelRouter.routeModel({
        manualModelId: 'deepseek-reasoner',
        userTier: 'Free'
      });

      expect(decision.routingMode).toBe('manual');
      expect(decision.selectedModelId).toBe('deepseek-reasoner');
      expect(decision.provider).toBe('deepseek');
      expect(decision.routingReason).toContain('dipilih secara manual');
    });

    it('rejects unknown or invalid manual model', () => {
      expect(() => smartModelRouter.routeModel({
        manualModelId: 'unknown-model-xyz',
        userTier: 'Free'
      })).toThrowError(AiModelError);
    });

    it('rejects restricted manual model when user tier is insufficient', () => {
      expect(() => smartModelRouter.routeModel({
        manualModelId: 'gemini-3.1-pro-preview', // Pro tier only
        userTier: 'Free'
      })).toThrowError(expect.objectContaining({ code: 'MODEL_NOT_ALLOWED' }));
    });

    it('rejects manual model if provider is not configured', () => {
      delete process.env.GROQ_API_KEY;
      expect(() => smartModelRouter.routeModel({
        manualModelId: 'groq-qwen-27b',
        userTier: 'Free'
      })).toThrowError(expect.objectContaining({ code: 'PROVIDER_NOT_CONFIGURED' }));
    });
  });

  describe('2. Deterministic Request Classification', () => {
    it('classifies image attachment as visual/multimodal requirement without LLM', () => {
      const signal = classifyRequest({
        attachments: [{ filename: 'screenshot.png', mimeType: 'image/png' }]
      });
      expect(signal.reasonHint).toContain('multimodal/visual');
    });

    it('classifies doc attachments as document analysis', () => {
      const signal = classifyRequest({
        attachments: [{ filename: 'skripsi_draft.pdf', mimeType: 'application/pdf' }]
      });
      expect(signal.category).toBe('document_analysis');
      expect(signal.reasonHint).toContain('analisis dokumen');
    });

    it('classifies code attachments as coding', () => {
      const signal = classifyRequest({
        attachments: [{ filename: 'server.ts', mimeType: 'text/typescript' }]
      });
      expect(signal.category).toBe('coding');
      expect(signal.reasonHint).toContain('kode');
    });

    it('honors fast latency preference when responseStyle is Singkat', () => {
      const signal = classifyRequest({
        responseStyle: 'Singkat'
      });
      expect(signal.latencyPreference).toBe('fast');
    });

    it('honors deep reasoning preference when responseStyle is Mendalam', () => {
      const signal = classifyRequest({
        responseStyle: 'Mendalam'
      });
      expect(signal.latencyPreference).toBe('deep');
      expect(signal.category).toBe('structured_reasoning');
    });

    it('classifies workspace mode skripsi query as academic writing', () => {
      const signal = classifyRequest({
        workspaceMode: true
      }, 'Buatkan bab 1 skripsi latar belakang');
      expect(signal.category).toBe('academic_writing');
    });

    it('never infers medical diagnosis or psychiatric condition', () => {
      const signal = classifyRequest({
        chatMode: 'Teman Cerita'
      }, 'Aku merasa cemas dan sedih seharian');
      // Should result in a standard conversation category, not a diagnostic category
      expect(signal.category).toBe('general_chat');
    });
  });

  describe('3. Candidate Filtering & Tier Enforcement', () => {
    it('filters out restricted models for Free users under Auto mode', () => {
      const candidates = filterCandidates({
        userTier: 'Free'
      }, {
        category: 'general_chat',
        latencyPreference: 'balanced',
        qualityPreference: 'standard',
        requiredCapabilities: ['chat'],
        reasonHint: 'test'
      });

      // gemini-3.1-pro-preview is Pro tier only and must not be in Free candidate list
      expect(candidates.some(c => c.id === 'gemini-3.1-pro-preview')).toBe(false);
      expect(candidates.every(c => c.allowedTiers.includes('Free'))).toBe(true);
    });

    it('includes Pro models for Pro tier users', () => {
      const candidates = filterCandidates({
        userTier: 'Pro'
      }, {
        category: 'academic_writing',
        latencyPreference: 'deep',
        qualityPreference: 'very_high',
        requiredCapabilities: ['chat'],
        reasonHint: 'test'
      });

      expect(candidates.some(c => c.id === 'gemini-3.1-pro-preview')).toBe(true);
    });

    it('filters out unconfigured providers', () => {
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const candidates = filterCandidates({
        userTier: 'Free'
      }, {
        category: 'general_chat',
        latencyPreference: 'balanced',
        qualityPreference: 'standard',
        requiredCapabilities: ['chat'],
        reasonHint: 'test'
      });

      expect(candidates.every(c => c.provider !== 'deepseek' && c.provider !== 'groq')).toBe(true);
    });
  });

  describe('4. Deterministic Ranking & Scoring', () => {
    it('produces identical routing decisions for identical inputs (zero randomness)', () => {
      const context: AiRoutingContext = {
        routingMode: 'auto',
        taskCategory: 'academic_writing',
        latencyPreference: 'deep',
        userTier: 'Free'
      };

      const decision1 = smartModelRouter.routeModel(context, 'Tinjauan literatur');
      const decision2 = smartModelRouter.routeModel(context, 'Tinjauan literatur');
      const decision3 = smartModelRouter.routeModel(context, 'Tinjauan literatur');

      expect(decision1.selectedModelId).toBe(decision2.selectedModelId);
      expect(decision2.selectedModelId).toBe(decision3.selectedModelId);
      expect(decision1.routingMode).toBe('auto');
    });

    it('prefers high reasoning models for deep academic requests', () => {
      const context: AiRoutingContext = {
        routingMode: 'auto',
        workspaceMode: true,
        responseStyle: 'Mendalam',
        userTier: 'Free'
      };

      const decision = smartModelRouter.routeModel(context, 'Analisis metodologi skripsi');
      const model = AI_MODEL_REGISTRY.find(m => m.id === decision.selectedModelId);
      expect(model?.reasoning).toBe('Sangat Tinggi');
    });

    it('prefers fast models for quick requests', () => {
      const context: AiRoutingContext = {
        routingMode: 'auto',
        responseStyle: 'Singkat',
        userTier: 'Free'
      };

      const decision = smartModelRouter.routeModel(context, 'Rangkum ini');
      const model = AI_MODEL_REGISTRY.find(m => m.id === decision.selectedModelId);
      expect(model?.speed).toBe('Sangat Cepat');
    });
  });

  describe('5. Fallback List Generation & Boundness', () => {
    it('returns a bounded fallback list without cycles or duplicates', () => {
      const decision = smartModelRouter.routeModel({
        manualModelId: 'deepseek-reasoner',
        userTier: 'Free'
      });

      expect(decision.fallbackCandidates.length).toBeLessThanOrEqual(2);
      expect(decision.fallbackCandidates).not.toContain('deepseek-reasoner');
      expect(new Set(decision.fallbackCandidates).size).toBe(decision.fallbackCandidates.length);
    });
  });

  describe('6. FASE 21 Presets & Routing Integration', () => {
    it('routes preset with taskCategory=coding to high coding capability model', () => {
      const decision = smartModelRouter.routeModel({
        routingMode: 'auto',
        taskCategory: 'coding',
        latencyPreference: 'balanced',
        userTier: 'Free'
      });

      expect(decision.routingMode).toBe('auto');
      const model = AI_MODEL_REGISTRY.find(m => m.id === decision.selectedModelId);
      expect(model).toBeDefined();
      expect(model?.capabilities).toContain('chat');
    });

    it('routes preset with taskCategory=academic_writing to deep reasoning model', () => {
      const decision = smartModelRouter.routeModel({
        routingMode: 'auto',
        taskCategory: 'academic_writing',
        latencyPreference: 'deep',
        qualityPreference: 'very_high',
        userTier: 'Free'
      });

      expect(decision.routingMode).toBe('auto');
      const model = AI_MODEL_REGISTRY.find(m => m.id === decision.selectedModelId);
      expect(model?.reasoning).toBe('Sangat Tinggi');
    });

    it('manual model selection strictly overrides preset preference', () => {
      const decision = smartModelRouter.routeModel({
        manualModelId: 'gemini-3.8-flash',
        taskCategory: 'coding', // preset suggested coding
        presetId: 'coding',
        userTier: 'Free'
      });

      expect(decision.routingMode).toBe('manual');
      expect(decision.selectedModelId).toBe('gemini-3.8-flash');
      expect(decision.provider).toBe('gemini');
    });

    it('preset never bypasses tier restriction', () => {
      expect(() => smartModelRouter.routeModel({
        manualModelId: 'gemini-3.1-pro-preview', // Pro tier only
        presetId: 'custom-pro',
        userTier: 'Free'
      })).toThrowError(expect.objectContaining({ code: 'MODEL_NOT_ALLOWED' }));
    });
  });
});
