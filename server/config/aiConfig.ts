import { GoogleGenAI } from '@google/genai';

/**
 * RuangTenang Centralized AI Configuration & Model Registry
 */

export const DEFAULT_AI_MODEL = 'gemini-3.1-flash-lite';

export const AI_MODELS = {
  DEFAULT_FAST: 'gemini-3.1-flash-lite',
  LATEST_FLASH_38: 'gemini-3.8-flash',
  LATEST_FLASH: 'gemini-3.7-flash',
  DYNAMIC_FLASH: 'gemini-flash-latest',
  PRO_REASONING: 'gemini-3.1-pro-preview',
  BALANCED: 'gemini-2.5-flash',
  PRO_LEGACY: 'gemini-2.5-pro',
  LITE_FAST: 'gemini-3.1-flash-lite',
  LITE_LEGACY: 'gemini-2.5-flash-lite',
  FALLBACK: 'gemini-3.1-flash-lite',
  CRISIS_CLASSIFIER: 'gemini-3.1-flash-lite',
  COUNSELOR_SIMULATION: 'gemini-3.1-flash-lite',
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
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Terbaru • Cepat & Cerdas',
    description: 'Model teks dan multimodal generasi 3.8 terbaru dari Google AI. Keseimbangan terbaik antara pemahaman emosional mendalam, penalaran adaptif, dan respon instan.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    category: 'Gemini 3.x Series',
    tag: 'Default • Ultra Cepat & Ringan',
    description: 'Model generasi 3.1 paling ringan dan responsif dengan latensi sangat rendah, ideal untuk percakapan pendampingan harian dan koneksi hemat kuota.',
    isDefault: true,
    speed: 'Sangat Cepat',
    reasoning: 'Standar'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    category: 'Gemini 3.x Series',
    tag: 'Cerdas & Empatik',
    description: 'Model multimodal generasi 3.7 dengan penalaran adaptif, active listening terfokus, dan pemahaman nuansa psikologis yang mendalam.',
    speed: 'Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    category: 'Gemini 3.x Series',
    tag: 'Pro • Penalaran Lanjut',
    description: 'Model penalaran tingkat tinggi untuk analisis kognitif mendalam, CBT lanjutan, dan pemecahan masalah emosional bertingkat.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    category: 'Gemini Dynamic',
    tag: 'Auto-Updated • Rilis Terkini',
    description: 'Alias model dinamis yang otomatis menggunakan versi Flash paling mutakhir yang disediakan oleh Google AI.',
    speed: 'Sangat Cepat',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Gemini 2.5 Series',
    tag: 'Stabil & Teruji',
    description: 'Model generasi 2.5 dengan stabilitas tinggi dan konsistensi respon pendampingan terpercaya.',
    speed: 'Cepat',
    reasoning: 'Standar'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'Gemini 2.5 Series',
    tag: 'Refleksi Terstruktur',
    description: 'Model berorientasi penalaran terstruktur untuk eksplorasi psikologis dan latihan pemikiran bertahap.',
    speed: 'Sedang',
    reasoning: 'Tinggi'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Gemini 2.5 Series',
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
  MAX_HISTORY_MESSAGES: 12,

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
