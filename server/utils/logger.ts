/**
 * Structured JSON Logger for Server Observability
 * Automatically redacts PII and sensitive fields.
 */

import { scanAndSanitizePII } from '../services/piiService.js';

const REDACT_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
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
  'cvv'
]);

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
      if (REDACT_KEYS.has(key.toLowerCase())) {
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
    return scanAndSanitizePII(data).sanitizedText;
  }

  return data;
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
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event,
      error: error?.message || String(error),
      meta: sanitize(meta)
    }));
  }
};
