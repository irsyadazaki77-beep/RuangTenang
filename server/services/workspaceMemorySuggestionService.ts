import { consentService } from './consentService.js';
import { scanAndSanitizePII } from './piiService.js';
import { detectPromptInjection } from '../security.js';
import { WorkspaceMemoryService } from './workspaceMemoryService.js';
import { DEFAULT_AI_MODEL_ID } from './ai/aiModelRegistry.js';
import type { WorkspaceMemoryCategory } from '../../shared/contracts/workspaceMemory.js';

export interface MemorySuggestion {
  category: WorkspaceMemoryCategory;
  content: string;
}

const CATEGORIES: WorkspaceMemoryCategory[] = ['goal', 'decision', 'preference', 'constraint', 'progress'];
const MAX_SUGGESTIONS = 3;
const MAX_INPUT_CHARS = 1500;
const MAX_CONTENT_CHARS = 200;
const SENSITIVE_PATTERN = /\b(bunuh diri|melukai diri|suicide|self-harm|sayat|overdosis|akhiri hidup|depresi|cemas|anxiety|diagnosa|diagnosis|terapi|psikolog|obat)\b/i;

const SYSTEM_INSTRUCTION = `[CONTEXT_BOUNDARIES]
Tugasmu: dari satu pertukaran pesan, pilih fakta yang layak diingat untuk proyek akademik/kerja pengguna.
Hanya ambil hal yang JELAS dinyatakan pengguna: tujuan proyek, keputusan, preferensi format/gaya kerja, batasan (deadline, aturan dosen), atau progres.
JANGAN ambil: emosi, kondisi kesehatan atau mental, data pribadi (nama, kontak, ID), tebakan, atau isi jawaban asisten yang tidak ditegaskan pengguna.
Jika tidak ada yang layak, kembalikan array kosong.
Balas HANYA JSON: {"suggestions":[{"category":"goal|decision|preference|constraint|progress","content":"kalimat singkat Bahasa Indonesia, maks 200 karakter"}]}`;

function parseSuggestions(raw: string): MemorySuggestion[] {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return []; }
  const list = (parsed as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const out: MemorySuggestion[] = [];
  for (const item of list) {
    const category = (item as { category?: string })?.category as WorkspaceMemoryCategory;
    const content = (item as { content?: unknown })?.content;
    if (!CATEGORIES.includes(category) || typeof content !== 'string') continue;
    const safe = scanAndSanitizePII(content.replace(/[<>]/g, '').trim()).sanitizedText.slice(0, MAX_CONTENT_CHARS).trim();
    if (safe.length < 8 || SENSITIVE_PATTERN.test(safe) || detectPromptInjection(safe)) continue;
    out.push({ category, content: safe });
  }
  return out;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export const workspaceMemorySuggestionService = {
  /**
   * Proposes (never saves) memory candidates. Returns [] when the user has not
   * consented to AI memory, or when nothing safe and new is found.
   */
  async suggest(params: { userId: string; workspaceId: string; userMessage: string; assistantReply: string; abortSignal?: AbortSignal }): Promise<MemorySuggestion[]> {
    const { userId, workspaceId, abortSignal } = params;
    const consents = await consentService.getUserConsents(userId);
    if (!consents.consentForAI || !consents.consentForAIMemory) return [];

    const userMessage = scanAndSanitizePII(params.userMessage.slice(0, MAX_INPUT_CHARS)).sanitizedText;
    const assistantReply = scanAndSanitizePII(params.assistantReply.slice(0, MAX_INPUT_CHARS)).sanitizedText;
    if (userMessage.trim().length < 15 || SENSITIVE_PATTERN.test(userMessage)) return [];

    const { aiRequestService } = await import('./ai/aiRequestService.js');
    const response = await aiRequestService.generateChatResponse({
      userId,
      userTier: 'Free',
      requestedModelId: DEFAULT_AI_MODEL_ID,
      prompt: `Pesan pengguna:\n"""${userMessage}"""\n\nJawaban asisten (konteks saja):\n"""${assistantReply}"""`,
      systemInstruction: SYSTEM_INSTRUCTION,
      maxOutputTokens: 300,
      responseFormat: 'json',
      abortSignal
    });
    if (!response.text || response.isFallback) return [];

    const existing = await WorkspaceMemoryService.listMemories(userId, workspaceId);
    const known = new Set(existing.filter(item => item.isActive).map(item => normalize(item.content)));
    const seen = new Set<string>();
    return parseSuggestions(response.text).filter(item => {
      const key = normalize(item.content);
      if (known.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_SUGGESTIONS);
  }
};
