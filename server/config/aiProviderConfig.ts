import fs from 'fs';
import path from 'path';
import type { ProviderId } from '../services/ai/aiModelRegistry.js';

const keyNames: Record<ProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  ollama: 'OLLAMA_BASE_URL'
};

// STRICT PROVIDER POLICY: ONLY Gemini and OpenRouter are allowed in this application.
// All other third-party providers (Groq, DeepSeek, OpenAI, Ollama) are permanently blocked.
const ALLOWED_PROVIDERS: ReadonlySet<ProviderId> = new Set(['gemini', 'openrouter']);

function readLocalSecretFile(filename: string): string {
  try {
    const filePath = path.resolve(process.cwd(), 'secrets', filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  } catch {
    // Ignore file read errors
  }
  return '';
}

function isValidKey(provider: ProviderId, key: string): boolean {
  if (provider === 'gemini') return key.length > 0 && key !== 'admin123';
  if (provider === 'openrouter') return key.startsWith('sk-or-') && key.length >= 30;
  // All other providers are strictly prohibited
  return false;
}

/** Internal server-only provider credentials. Never serialize this object. */
export const aiProviderConfig = {
  getApiKey(provider: ProviderId): string {
    // Strictly ONLY Gemini and OpenRouter are permitted
    if (!ALLOWED_PROVIDERS.has(provider)) {
      return '';
    }

    let key = (process.env[keyNames[provider]] || '').trim();
    if (!isValidKey(provider, key) && provider === 'openrouter') {
      key = readLocalSecretFile('openrouter_api_key');
    }
    return isValidKey(provider, key) ? key : '';
  },
  isConfigured(provider: ProviderId): boolean {
    if (!ALLOWED_PROVIDERS.has(provider)) {
      return false;
    }
    return Boolean(this.getApiKey(provider));
  }
};

export const DEEPSEEK_API_KEY = '';
export const GROQ_API_KEY = '';
export const OPENROUTER_API_KEY = aiProviderConfig.getApiKey('openrouter');
export const OPENAI_API_KEY = '';
export const OLLAMA_BASE_URL = '';
