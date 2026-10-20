import type { ProviderId } from '../services/ai/aiModelRegistry.js';

const keyNames: Record<ProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  ollama: 'OLLAMA_BASE_URL'
};

function isValidKey(provider: ProviderId, key: string): boolean {
  if (provider === 'ollama') {
    return key.startsWith('http://') || key.startsWith('https://');
  }
  if (provider === 'gemini') return key.length > 0;
  if (provider === 'deepseek') return key.startsWith('sk-') && !key.includes('n123') && key.length >= 30;
  if (provider === 'groq') return key.startsWith('gsk_') && key.length >= 30;
  if (provider === 'openrouter') return key.startsWith('sk-or-') && key.length >= 30;
  return key.startsWith('sk-') && key.length >= 40;
}

/** Internal server-only provider credentials. Never serialize this object. */
export const aiProviderConfig = {
  getApiKey(provider: ProviderId): string {
    // If external cloud AI APIs are disabled to save cost, only allow local Ollama provider
    const disableCloud = (process.env.LOCAL_AI_ONLY === 'true' || process.env.DISABLE_CLOUD_AI === 'true') && process.env.NODE_ENV !== 'test';
    if (disableCloud && provider !== 'ollama') {
      return '';
    }

    if (provider === 'ollama') {
      const configured = process.env.OLLAMA_BASE_URL || (process.env.LOCAL_AI_ONLY === 'true' ? 'http://127.0.0.1:11434' : '');
      const trimmed = configured.trim();
      return isValidKey('ollama', trimmed) ? trimmed : '';
    }
    const key = (process.env[keyNames[provider]] || '').trim();
    return isValidKey(provider, key) ? key : '';
  },
  isConfigured(provider: ProviderId): boolean {
    const disableCloud = (process.env.LOCAL_AI_ONLY === 'true' || process.env.DISABLE_CLOUD_AI === 'true') && process.env.NODE_ENV !== 'test';
    if (disableCloud && provider !== 'ollama') {
      return false;
    }
    return Boolean(this.getApiKey(provider));
  }
};

export const DEEPSEEK_API_KEY = aiProviderConfig.getApiKey('deepseek');
export const GROQ_API_KEY = aiProviderConfig.getApiKey('groq');
export const OPENROUTER_API_KEY = aiProviderConfig.getApiKey('openrouter');
export const OPENAI_API_KEY = aiProviderConfig.getApiKey('openai');
export const OLLAMA_BASE_URL = aiProviderConfig.getApiKey('ollama');
