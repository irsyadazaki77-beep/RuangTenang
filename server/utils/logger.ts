/**
 * Structured JSON Logger for Server Observability
 * Automatically redacts PII and sensitive fields.
 */

import { scanAndSanitizePII } from '../services/piiService.js';

const REDACT_KEYS = new Set([
  'password',
  'passwd',
  'passwordhash',
  'api_key',
  'token',
  'access_token',
  'refreshtoken',
  'sessiontoken',
  'authorization',
  'notes',
  'content',
  'message',
  'messages',
  'input',
  'prompt',
  'pluginresult',
  'history',
  'chathistory',
  'screeningscore',
  'secret',
  'jwtsecret',
  'jwt_secret',
  'encryptionkey',
  'encryption_key',
  'encryptionsecret',
  'encryption_secret',
  'blindindexsecret',
  'blind_index_secret',
  'turncredential',
  'turn_credential',
  'turnsharedsecret',
  'turn_shared_secret',
  'geminiapikey',
  'gemini_api_key',
  'deepseekapikey',
  'deepseek_api_key',
  'groqapikey',
  'groq_api_key',
  'openrouterapikey',
  'openrouter_api_key',
  'databaseurl',
  'database_url',
  'redisurl',
  'redis_url',
  'connectionstring',
  'connection_string',
  'privatekey',
  'private_key',
  'authorizationheader',
  'set-cookie',
  'key',
  'apikey',
  'cookie',
  'ruangtenang_session',
  'email',
  'nim',
  'studentnim',
  'nik',
  'noktp',
  'phone',
  'nohp',
  'telepon',
  'address',
  'alamat',
  'rekening',
  'accountnumber',
  'keluhan',
  'diagnosa',
  'catatan',
  'catatankonselor',
  'mfa',
  'mfacode',
  'mfatoken',
  'otp',
  'pin',
  'payload',
  'cvv',
  'userid',
  'studentid',
  'counselorid',
  'appointmentid',
  'recordid',
  'primaryconcern',
  'symptoms',
  'symptom',
  'risklevel',
  'triage',
  'clinicalnotes',
  'soapnotes',
  'moodlog',
  'reflection',
  'screeningresult',
  'screeningscore',
  'medicalhistory',
  'healthdata'
]);

const NORMALIZED_REDACT_KEYS = new Set(
  [...REDACT_KEYS].map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, ''))
);

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return NORMALIZED_REDACT_KEYS.has(normalizedKey) ||
    /(?:clinical|screening|diagnos|journal|reflect|counselor|mentalhealth|healthdata|symptom|concern|transcript|soapnote|moodlog|crisis|risk|triage|phq|gad)/.test(normalizedKey);
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b(?:postgres(?:ql)?|redis):\/\/[^\s@]+@[^\s]+/gi, '[REDACTED_CONNECTION_URL]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|passwd|secret|credential|authorization|api[_-]?key|token)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{16,})\b/g, '[REDACTED_API_KEY]');
}

export function maskSensitivePayload(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitivePayload);
  }

  if (typeof data === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        masked[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        masked[key] = maskSensitivePayload(val);
      } else if (typeof val === 'string') {
        masked[key] = scanAndSanitizePII(val).sanitizedText;
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }

  if (typeof data === 'string') {
    return redactSensitiveText(scanAndSanitizePII(data).sanitizedText);
  }

  return data;
}

export function installProductionConsoleSanitizer(): void {
  if (process.env.NODE_ENV !== 'production') return;

  for (const method of ['log', 'warn', 'error', 'info'] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => original(...args.map((arg) => {
      if (arg instanceof Error) return { name: arg.name, code: (arg as Error & { code?: string }).code };
      return maskSensitivePayload(arg);
    }));
  }
}

function sanitize(obj: any): any {
  return maskSensitivePayload(obj);
}

export const logger = {
  info(event: string, meta: Record<string, any> = {}) {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event,
      meta: sanitize(meta)
    }));
  },

  warn(event: string, meta: Record<string, any> = {}) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      event,
      meta: sanitize(meta)
    }));
  },

  error(event: string, error?: any, meta: Record<string, any> = {}) {
    const rawErrorMessage = error?.message || String(error);
    const safeError = process.env.NODE_ENV === 'production'
      ? { name: error?.name || 'Error', code: error?.code || undefined }
      : redactSensitiveText(rawErrorMessage);
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event,
      error: safeError,
      meta: sanitize(meta)
    }));
  }
};
