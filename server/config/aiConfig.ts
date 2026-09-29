import { GoogleGenAI } from '@google/genai';

/**
 * RuangTenang Centralized AI Configuration & Model Registry
 */

export const DEFAULT_AI_MODEL = 'gemini-3.8-flash';
export const RESILIENT_FALLBACK_AI_MODEL = 'gemini-3.1-flash-lite';

export const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();
export const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
export const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

export const CALMING_FALLBACK_MESSAGE = 'Aku sedang menyimak ceritamu, namun koneksi kita sempat terhenti sejenak 🌿. Tarik napas perlahan ya, kamu bisa mengirim ulang ceritamu atau beristirahat sejenak 🤍.';

export const AI_MODELS = {
  DEFAULT_FAST: 'gemini-2.5-flash',
  LATEST_FLASH_38: 'gemini-3.8-flash',
  LATEST_FLASH: 'gemini-3.7-flash',
  DYNAMIC_FLASH: 'gemini-flash-latest',
  PRO_REASONING: 'gemini-3.1-pro-preview',
  BALANCED: 'gemini-2.5-flash',
  PRO_LEGACY: 'gemini-2.5-pro',
  LITE_FAST: 'gemini-2.5-flash-lite',
  LITE_LEGACY: 'gemini-3.1-flash-lite',
  FALLBACK: 'gemini-2.5-flash-lite',
  CRISIS_CLASSIFIER: 'gemini-2.5-flash',
  COUNSELOR_SIMULATION: 'gemini-2.5-flash',
  DEEPSEEK_CHAT: 'deepseek-chat',
  DEEPSEEK_REASONER: 'deepseek-reasoner',
  GROQ_QWEN: 'qwen/qwen3.8-27b',
  GROQ_GPT_120B: 'openai/gpt-oss-120b',
  GROQ_GPT_20B: 'openai/gpt-oss-20b',
} as const;

export interface AiModelInfo {
  id: string;
  name: string;
  category: string;
  tag: string;
  description: string;
  isDefault?: boolean;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
}

export const AVAILABLE_AI_MODELS: AiModelInfo[] = [
  // --- 1. FRONTIER & DEEP REASONING TIER (Sangat Tinggi) ---
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Reasoner)',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'R1 • Penalaran Mendalam',
    description: 'Model reasoning canggih DeepSeek-R1 dengan proses berpikir bertahap (Chain-of-Thought) untuk analisis kognitif, CBT mendalam, dan pemecahan masalah kompleks.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'openrouter-nemotron-550b',
    name: 'OpenRouter • Nemotron 550B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'OpenRouter • Ultra 550B',
    description: 'Model raksasa 550B parameter dari NVIDIA via OpenRouter dengan kapasitas pemahaman tingkat lanjut dan analisis multi-domain.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'openrouter-nemotron-super-120b',
    name: 'OpenRouter • Nemotron 120B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'OpenRouter • Super 120B',
    description: 'Model NVIDIA Nemotron 120B parameter via OpenRouter yang kuat dalam penalaran terstruktur dan artikulasi bahasa ilmiah.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'groq-gpt-120b',
    name: 'Groq • GPT-OSS 120B',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Groq • Kapasitas Besar',
    description: 'Model open-weight 120B parameter berkemampuan tinggi dengan akselerasi Groq LPU, ideal untuk analisis komprehensif dan penalaran kompleks.',
    speed: 'Cepat',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi untuk analisis kognitif mendalam, CBT lanjutan, dan pemecahan masalah emosional bertingkat.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Penalaran Mendalam & Analisis',
    tag: 'Refleksi Terstruktur',
    description: 'Model berorientasi penalaran terstruktur untuk eksplorasi psikologis dan latihan pemikiran bertahap.',
    speed: 'Sedang',
    reasoning: 'Tinggi'
  },

  // --- 2. HIGH PERFORMANCE & BALANCED TIER (Utama & Cerdas) ---
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Terbaru • Cepat & Cerdas',
    description: 'Model teks dan multimodal generasi 3.8 terbaru dari Google AI. Keseimbangan terbaik antara pemahaman emosional mendalam, penalaran adaptif, dan respon instan.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    category: 'Model Utama & Seimbang',
    tag: 'Populer • Cerdas & Cepat',
    description: 'Model percakapan unggulan DeepSeek-V3 dengan pemahaman bahasa alami yang sangat luwes, responsif, dan kaya empati.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 dengan penalaran adaptif, active listening terfokus, dan pemahaman nuansa psikologis yang mendalam.',
    speed: 'Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    category: 'Model Utama & Seimbang',
    tag: 'Auto-Updated • Rilis Terkini',
    description: 'Alias model dinamis yang otomatis menggunakan versi Flash paling mutakhir yang disediakan oleh Google AI.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Model Utama & Seimbang',
    tag: 'Stabil & Teruji',
    description: 'Model generasi 2.5 dengan stabilitas tinggi dan konsistensi respon pendampingan terpercaya.',
    speed: 'Cepat',
    reasoning: 'Standar'
  },

  // --- 3. ULTRA-FAST & LIGHTWEIGHT TIER (Respons Kilat / Minim Latensi) ---
  {
    id: 'openrouter-nemotron-lightning',
    name: 'OpenRouter • Nemotron Lightning',
    category: 'Ultra-Cepat & Ringan',
    tag: 'OpenRouter • Lightning',
    description: 'Model ultra cepat NVIDIA Nemotron 3.5 Lightning via OpenRouter, dirancang khusus untuk kecepatan eksekusi tinggi dan respon dinamis.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'groq-qwen-27b',
    name: 'Groq • Qwen 3.8 27B',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Groq • Super Cepat',
    description: 'Model Qwen 3.8 27B dengan akselerasi hardware Groq LPU untuk respon instan, penalaran natural, dan percakapan empati cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'groq-gpt-20b',
    name: 'Groq • GPT-OSS 20B',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Groq • Ringan & Responsif',
    description: 'Model open-weight 20B parameter yang dioptimalkan untuk kecepatan kilat dan pendampingan konseling interaktif.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Ringan • Ultra Cepat',
    description: 'Model generasi 3.1 paling ringan dan responsif dengan latensi sangat rendah, ideal untuk percakapan pendampingan harian dan koneksi hemat kuota.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Ultra-Cepat & Ringan',
    tag: 'Ringan & Hemat Kuota',
    description: 'Model ringkas hemat resource untuk obrolan santai dan catatan harian cepat.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar'
  }
];

export const AI_CONFIG = {
  // Timeout in milliseconds
  DEFAULT_TIMEOUT_MS: 15000,
  CRISIS_TIMEOUT_MS: 4000,
  STREAM_TIMEOUT_MS: 20000,

  // Generation parameters
  TEMPERATURE_DEFAULT: 0.7,
  TEMPERATURE_CREATIVE: 0.8,
  TEMPERATURE_PRECISE: 0.2,
  TOP_P: 0.9,
  MAX_OUTPUT_TOKENS: 1000,
  MAX_HISTORY_MESSAGES: 60,

  // Retry settings
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 500,
};

let genAIClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return genAIClient;
}

export const getAiClient = getGenAIClient;

export function isAiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
