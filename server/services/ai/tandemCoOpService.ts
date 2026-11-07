/**
 * Tandem Co-Op Pipeline Service
 * 
 * Mengorkestrasi sinergi kolaboratif antara dua SLM mandiri RuangTenang:
 * 1. Si Pinter v2.0 (1.7B) — Draft Engine (Kecepatan tinggi ~45 tps, ekstraksi poin inti, draf kerangka)
 * 2. Si Gacor 27B (26.9B) — Flagship Titan (Penalaran kognitif tingkat tinggi, audit logika, anti-lazy code)
 */

import { aiRequestService, AiRequestOptions } from './aiRequestService.js';

export type TandemMode = 'draft_and_verify' | 'architect_and_explain';

export interface TandemCoOpOptions {
  prompt: string;
  mode?: TandemMode;
  userId?: string;
  userTier?: string;
  systemInstruction?: string;
  abortSignal?: AbortSignal;
  onPassComplete?: (pass: 1 | 2, result: { model: string; content: string }) => void;
}

export interface TandemCoOpResult {
  mode: TandemMode;
  draft: string;
  finalContent: string;
  pass1Model: string;
  pass2Model: string;
  totalDurationMs: number;
}

export class TandemCoOpService {
  /**
   * Menjalankan pipeline eksekusi dua tahap (Tandem Co-Op).
   */
  static async executeTandem(options: TandemCoOpOptions): Promise<TandemCoOpResult> {
    const startedAt = Date.now();
    const mode = options.mode || 'draft_and_verify';

    if (mode === 'draft_and_verify') {
      // =========================================================================
      // PASS 1: Si Pinter (Draft Engine)
      // Menyusun struktur cepat, draf kerangka solusi, dan inventarisasi poin
      // =========================================================================
      const pass1Prompt = `[TANDEM CO-OP PASS 1: RAPID DRAFT ENGINE]
Tugas Anda: Susun draf awal, kerangka struktural, atau sketsa solusi teknis secepat dan sejelas mungkin untuk instruksi berikut:

"${options.prompt}"

Panduan:
- Sajikan kerangka modular atau fondasi kode/argumen yang to-the-point.
- Draf ini akan segera disempurnakan oleh Si Gacor (Titan Engine).`;

      const pass1Options: AiRequestOptions = {
        userId: options.userId,
        userTier: options.userTier || 'Free',
        requestedModelId: 'ollama-si-pinter',
        prompt: pass1Prompt,
        systemInstruction: options.systemInstruction || 'Kamu adalah Si Pinter v3.0 (Rapid Draft Engine). Tugasmu adalah menyusun kerangka struktural awal secara cepat, modular, padat, dan akurat untuk ditelaah mendalam oleh Si Gacor.',
        abortSignal: options.abortSignal,
        maxOutputTokens: 2500
      };

      const pass1Res = await aiRequestService.generateChatResponse(pass1Options);
      options.onPassComplete?.(1, { model: pass1Res.modelUsed, content: pass1Res.text });

      // =========================================================================
      // PASS 2: Si Gacor (Flagship Cognitive & Architectural Titan)
      // Menganalisis draf dari Si Pinter, membedah invarian, menulis kode produksi 100% tanpa TODO
      // =========================================================================
      const pass2Prompt = `[TANDEM CO-OP PASS 2: ARCHITECTURAL & DEEP REASONING VERIFIER]
Instruksi Pengguna Asli:
"${options.prompt}"

Draf Awal dari Si Pinter:
"""
${pass1Res.text}
"""

Tugas Anda (Si Gacor):
1. Bedah draf di atas dengan standar penalaran tingkat tinggi dan rekayasa perangkat lunak enterprise.
2. Identifikasi potensi edge cases, bug logika, atau celah arsitektural dari draf tersebut.
3. Hasilkan IMPLEMENTASI FINAL yang 100% lengkap, strictly-typed, ZERO PLACEHOLDERS (tanpa // TODO), dan siap produksi.`;

      const pass2Options: AiRequestOptions = {
        userId: options.userId,
        userTier: options.userTier || 'Free',
        requestedModelId: 'ollama-si-gacor',
        prompt: pass2Prompt,
        systemInstruction: options.systemInstruction,
        abortSignal: options.abortSignal,
        maxOutputTokens: 4096,
        enableReasoning: true
      };

      const pass2Res = await aiRequestService.generateChatResponse(pass2Options);
      options.onPassComplete?.(2, { model: pass2Res.modelUsed, content: pass2Res.text });

      return {
        mode,
        draft: pass1Res.text,
        finalContent: pass2Res.text,
        pass1Model: pass1Res.modelUsed,
        pass2Model: pass2Res.modelUsed,
        totalDurationMs: Date.now() - startedAt
      };
    } else {
      // mode === 'architect_and_explain'
      // Pass 1: Si Gacor merancang solusi arsitektural rumit
      const pass1Options: AiRequestOptions = {
        userId: options.userId,
        userTier: options.userTier || 'Free',
        requestedModelId: 'ollama-si-gacor',
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        abortSignal: options.abortSignal,
        maxOutputTokens: 4096,
        enableReasoning: true
      };
      const pass1Res = await aiRequestService.generateChatResponse(pass1Options);
      options.onPassComplete?.(1, { model: pass1Res.modelUsed, content: pass1Res.text });

      // Pass 2: Si Pinter merangkum dan menjelaskan dengan bahasa ramah mahasiswa
      const pass2Prompt = `[TANDEM CO-OP PASS 2: STUDENT COMPANION EXPLAINER]
Berikut adalah solusi arsitektural tingkat lanjut yang telah dirancang oleh Si Gacor:
"""
${pass1Res.text}
"""

Tugas Anda (Si Pinter):
Sajikan panduan pendamping ramah mahasiswa (Maba Explainer):
1. Ringkasan inti apa yang dilakukan oleh solusi di atas dalam 2-3 poin sederhana.
2. Langkah praktis (actionable checklist) cara menjalankan atau menerapkan solusi ini.`;

      const pass2Options: AiRequestOptions = {
        userId: options.userId,
        userTier: options.userTier || 'Free',
        requestedModelId: 'ollama-si-pinter',
        prompt: pass2Prompt,
        systemInstruction: options.systemInstruction || 'Kamu adalah Si Pinter v3.0 (Student Explainer & Companion). Tugasmu adalah menerjemahkan rancangan teknis menjadi panduan yang mudah dipahami, bernas, dan langsung dapat dieksekusi mahasiswa.',
        abortSignal: options.abortSignal,
        maxOutputTokens: 2500
      };
      const pass2Res = await aiRequestService.generateChatResponse(pass2Options);
      options.onPassComplete?.(2, { model: pass2Res.modelUsed, content: pass2Res.text });

      const combinedOutput = `${pass1Res.text}\n\n---\n\n### 🎓 Panduan Mahasiswa (Disusun oleh Si Pinter)\n${pass2Res.text}`;

      return {
        mode,
        draft: pass1Res.text,
        finalContent: combinedOutput,
        pass1Model: pass1Res.modelUsed,
        pass2Model: pass2Res.modelUsed,
        totalDurationMs: Date.now() - startedAt
      };
    }
  }
}

export const tandemCoOpService = TandemCoOpService;
