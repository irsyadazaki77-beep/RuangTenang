import { GoogleGenAI } from '@google/genai';
import { DEFAULT_AI_MODEL_ID, RESILIENT_FALLBACK_AI_MODEL_ID } from '../services/ai/aiModelRegistry.js';
import { aiProviderConfig, DEEPSEEK_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY } from './aiProviderConfig.js';

/**
 * RuangTenang Centralized AI Configuration & Model Registry
 */

export const DEFAULT_AI_MODEL = DEFAULT_AI_MODEL_ID;
export const RESILIENT_FALLBACK_AI_MODEL = RESILIENT_FALLBACK_AI_MODEL_ID;

export { DEEPSEEK_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY };

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
  const apiKey = aiProviderConfig.getApiKey('gemini');
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
  return aiProviderConfig.isConfigured('gemini');
}
