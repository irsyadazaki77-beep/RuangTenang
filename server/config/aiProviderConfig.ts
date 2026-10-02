import type { ProviderId } from '../services/ai/aiModelRegistry.js';

const keyNames: Record<ProviderId, string> = {
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY'
};

function isValidKey(provider: ProviderId, key: string): boolean {
  if (provider === 'gemini') return key.length > 0;
  if (provider === 'deepseek') return key.startsWith('sk-') && !key.includes('n123') && key.length >= 30;
  if (provider === 'groq') return key.startsWith('gsk_') && key.length >= 30;
  return key.startsWith('sk-or-') && key.length >= 30;
}

/** Internal server-only provider credentials. Never serialize this object. */
export const aiProviderConfig = Object.freeze({
  getApiKey(provider: ProviderId): string {
    const key = (process.env[keyNames[provider]] || '').trim();
    return isValidKey(provider, key) ? key : '';
  },
  isConfigured(provider: ProviderId): boolean {
    return Boolean(this.getApiKey(provider));
  }
});

export const DEEPSEEK_API_KEY = aiProviderConfig.getApiKey('deepseek');
export const GROQ_API_KEY = aiProviderConfig.getApiKey('groq');
export const OPENROUTER_API_KEY = aiProviderConfig.getApiKey('openrouter');
