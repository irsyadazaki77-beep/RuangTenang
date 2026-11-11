import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AI_MODEL_REGISTRY, RESILIENT_FALLBACK_AI_MODEL_ID } from '../../services/ai/aiModelRegistry.js';
import { smartModelRouter, classifyRequest } from '../../services/ai/smartModelRouter.js';
import { DEFAULT_AI_MODEL_ID } from '../../../shared/aiModelContract.js';
import { tandemCoOpService } from '../../services/ai/tandemCoOpService.js';
import { aiRequestService } from '../../services/ai/aiRequestService.js';

describe('Si Pinter v3.0 Supreme Local Genius Evaluation', () => {
  beforeEach(() => {
    vi.stubEnv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
    for (const key of ['GEMINI_API_KEY', 'DEEPSEEK_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY']) {
      vi.stubEnv(key, '');
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('1. Model Registry & Canonical Contracts', () => {
    it('registers Si Pinter v3.0 as default model and resilient fallback', () => {
      expect(DEFAULT_AI_MODEL_ID).toBe('ollama-si-pinter');
      expect(RESILIENT_FALLBACK_AI_MODEL_ID).toBe('ollama-si-pinter');

      const model = AI_MODEL_REGISTRY.find(m => m.id === 'ollama-si-pinter');
      expect(model).toBeDefined();
      expect(model?.name).toContain('Si Pinter');
      expect(model?.name).toMatch(/v3\.[05]|v4\.0/);
      expect(model?.isDefault).toBe(true);
      expect(model?.speed).toBe('Sangat Cepat');
      expect(model?.reasoning).toBe('Tinggi');
      expect(model?.allowedTiers).toEqual(['Free', 'Pro', 'Premium']);
      expect(model?.category).toBe('Model Utama & Seimbang');
    });
  });

  describe('2. Modelfile & Setup Automation Integrity', () => {
    it('verifies Modelfile.pinter parameters and dual-core system prompt', () => {
      const pinterPath = path.resolve(process.cwd(), 'local_ai_lab', 'Modelfile.pinter');
      expect(fs.existsSync(pinterPath)).toBe(true);

      const content = fs.readFileSync(pinterPath, 'utf-8');
      expect(content).toContain('FROM qwen3:1.7b');
      expect(content).toContain('PARAMETER num_ctx 8192');
      expect(content).toContain('PARAMETER num_predict 4096');
      expect(content).toMatch(/PARAMETER repeat_penalty 1\.1[05]/);
      expect(content).toContain('TEMPLATE """{{- if .System }}<|im_start|>system');
      expect(content).toContain('Si Pinter');
      expect(content).toContain('v3.0');
      expect(content).toContain('PROTOKOL RUANGTENANG');
      expect(content).toContain('PROTOKOL RUANGKERJA');
      expect(content).toContain('AST Balance Guarantee');
      expect(content).toContain('APA 7th');
      expect(content).toContain('119');
      expect(content).toContain('PROTOKOL PENYELESAIAN TUGAS KULIAH');
      expect(content).toContain('Master Theorem');
      expect(content).toContain('Bentuk Normal Ketiga (3NF)');
      // Zero-phantom message guarantee: Modelfile must never inject fake conversation history
      expect(content).not.toMatch(/^MESSAGE\s+/m);
      expect(content).not.toContain('Binus University');
    });

    it('verifies backward-compatible Modelfile.asisten and setup script', () => {
      const asistenPath = path.resolve(process.cwd(), 'local_ai_lab', 'Modelfile.asisten');
      const setupPath = path.resolve(process.cwd(), 'local_ai_lab', 'setup_si_pinter.bat');

      expect(fs.existsSync(asistenPath)).toBe(true);
      expect(fs.existsSync(setupPath)).toBe(true);

      const asistenContent = fs.readFileSync(asistenPath, 'utf-8');
      expect(asistenContent).not.toMatch(/^MESSAGE\s+/m);
      expect(asistenContent).not.toContain('Binus University');

      const setupContent = fs.readFileSync(setupPath, 'utf-8');
      expect(setupContent).toContain('ollama pull qwen3:1.7b');
      expect(setupContent).toContain('ollama create si-pinter -f Modelfile.pinter');
    });

    it('guarantees that all Modelfiles in local_ai_lab are free of phantom MESSAGE directives', () => {
      const localAiLabDir = path.resolve(process.cwd(), 'local_ai_lab');
      const modelfiles = ['Modelfile.pinter', 'Modelfile.asisten', 'Modelfile.tangguh', 'Modelfile.gacor'];
      for (const file of modelfiles) {
        const filePath = path.join(localAiLabDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          expect(content).not.toMatch(/^MESSAGE\s+/m);
        }
      }
    });
  });

  describe('3. Smart Routing Affinity', () => {
    it('prioritizes Si Pinter for fast profile and general light conversation', () => {
      const fastDecision = smartModelRouter.routeModel({
        profileId: 'kerja-fast',
        workspaceMode: true,
        userTier: 'Free'
      }, 'Halo');

      expect(fastDecision.selectedModelId).toBe('ollama-si-pinter');
      expect(fastDecision.provider).toBe('ollama');

      const autoDecision = smartModelRouter.routeModel({
        routingMode: 'auto',
        userTier: 'Free'
      }, 'Halo apa kabar?');

      expect(autoDecision.selectedModelId).toBe('ollama-si-pinter');

      const classification = classifyRequest({
        workspaceMode: true,
        userTier: 'Free'
      }, 'tolong bantu tugas kuliah saya: tentukan kompleksitas waktu dengan Master Theorem');

      expect(classification.category).toBe('structured_reasoning');
    });
  });

  describe('4. Tandem Co-Op Integration', () => {
    it('executes draft_and_verify using Si Pinter as Pass 1 Draft Engine', async () => {
      const generateSpy = vi.spyOn(aiRequestService, 'generateChatResponse')
        .mockImplementation(async (options: any) => {
          if (options.requestedModelId === 'ollama-si-pinter') {
            return {
              text: '## Draf Kerangka Solusi\n1. Modul Parser\n2. Modul Transformer',
              modelUsed: 'ollama-si-pinter',
              isFallback: false
            };
          }
          if (options.requestedModelId === 'ollama-si-gacor') {
            return {
              text: '```typescript\nexport class EnterpriseTransformer {}\n```',
              modelUsed: 'ollama-si-gacor',
              isFallback: false
            };
          }
          return { text: 'ok', modelUsed: 'default', isFallback: false };
        });

      const passes: Array<{ pass: number; model: string }> = [];
      const result = await tandemCoOpService.executeTandem({
        prompt: 'Rancang arsitektur pipeline data',
        mode: 'draft_and_verify',
        onPassComplete: (pass, res) => {
          passes.push({ pass, model: res.model });
        }
      });

      expect(generateSpy).toHaveBeenCalledTimes(2);
      expect(result.pass1Model).toBe('ollama-si-pinter');
      expect(result.pass2Model).toBe('ollama-si-gacor');
      expect(result.draft).toContain('Draf Kerangka Solusi');
      expect(result.finalContent).toContain('EnterpriseTransformer');
      expect(passes).toEqual([
        { pass: 1, model: 'ollama-si-pinter' },
        { pass: 2, model: 'ollama-si-gacor' }
      ]);
    });
  });
});
