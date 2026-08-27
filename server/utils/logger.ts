/**
 * Structured JSON Logger for Server Observability
 * Automatically redacts PII and sensitive fields.
 */

const REDACT_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'notes',
  'content',
  'screeningScore',
  'secret',
  'key',
  'cookie',
  'email',
  'nim',
  'studentNIM'
]);

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitize(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
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
