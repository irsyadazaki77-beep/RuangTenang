import { z } from 'zod';
import { scanAndSanitizePII } from './piiService.js';
import { consentService } from './consentService.js';

export const clientDebugSchema = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(2000).optional(),
  source: z.string().max(300).optional(),
  lineno: z.number().int().optional(),
  colno: z.number().int().optional(),
  url: z.string().max(500).optional(),
  componentStack: z.string().max(2000).optional(),
  timestamp: z.string().max(100).optional()
}).strict();

export type ClientDebugPayload = z.infer<typeof clientDebugSchema>;

interface TelemetryDedupEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// In-memory sliding-window deduplicator (retention: 60 seconds window, max 200 fingerprints)
const dedupCache = new Map<string, TelemetryDedupEntry>();
const MAX_DEDUP_ENTRIES = 200;
const DEDUP_WINDOW_MS = 60 * 1000;

// In-memory telemetry buffer for diagnostics (retains last 50 sanitized records, volatile RAM only)
const telemetryBuffer: Array<{
  timestamp: string;
  requestId: string;
  message: string;
  source?: string;
  url?: string;
}> = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Strips sensitive query parameters and URL hashes
 */
export function sanitizeTelemetryUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    const urlObj = new URL(rawUrl, 'http://localhost');
    return `${urlObj.origin !== 'http://localhost' ? urlObj.origin : ''}${urlObj.pathname}`;
  } catch {
    return rawUrl.split('?')[0].split('#')[0].slice(0, 300);
  }
}

/**
 * Redacts secrets, tokens, passwords, session identifiers, and PII from stack traces and messages
 */
export function redactTelemetryText(text?: string): string {
  if (!text) return '';
  let sanitized = scanAndSanitizePII(text).sanitizedText;

  // Redact JWT tokens (Bearer or raw eyJ...)
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_JWT]');
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_=]{10,}\.?[A-Za-z0-9-_.+/=]*/g, '[REDACTED_JWT]');

  // Redact cookies, tokens, and authorization headers
  sanitized = sanitized.replace(/(cookie|authorization|token|secret|password|sessionid|connect\.sid)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');

  // Redact potential emergency contact / phone leaks
  sanitized = sanitized.replace(/(?:(?:\+62|62|0)8[1-9][0-9]{6,10})/g, '[REDACTED_PHONE]');

  return sanitized;
}

export class ClientTelemetryService {
  /**
   * Evaluates if telemetry is globally allowed in the current environment
   */
  isTelemetryEnabled(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return process.env.ENABLE_CLIENT_TELEMETRY === 'true';
    }
    return process.env.ENABLE_CLIENT_TELEMETRY !== 'false';
  }

  /**
   * Records a sanitized client error with deduplication and user consent verification
   */
  async recordClientError(
    payload: ClientDebugPayload,
    context: {
      userId?: string;
      requestId: string;
      clientIp?: string;
    }
  ): Promise<{ recorded: boolean; reason?: string }> {
    // 1. Check global environment toggle
    if (!this.isTelemetryEnabled()) {
      return { recorded: false, reason: 'TELEMETRY_DISABLED_BY_CONFIG' };
    }

    // 2. Check user consent if authenticated
    if (context.userId && context.userId !== 'guest') {
      const consents = await consentService.getUserConsents(context.userId);
      if (!consents.consentForTelemetry) {
        return { recorded: false, reason: 'TELEMETRY_OPT_OUT' };
      }
    }

    // 3. Deduplication fingerprinting
    const now = Date.now();
    const cleanMessage = redactTelemetryText(payload.message.slice(0, 300));
    const cleanSource = payload.source ? redactTelemetryText(payload.source.slice(0, 150)) : '';
    const fingerprint = `${cleanMessage}:${cleanSource}:${payload.lineno || 0}:${payload.colno || 0}`;

    const existing = dedupCache.get(fingerprint);
    if (existing && (now - existing.firstSeen < DEDUP_WINDOW_MS)) {
      existing.count += 1;
      existing.lastSeen = now;
      if (existing.count > 5) {
        // Sampled / dropped to prevent denial-of-service or log spam
        return { recorded: false, reason: 'SAMPLED_DUPLICATE' };
      }
    } else {
      if (dedupCache.size >= MAX_DEDUP_ENTRIES) {
        const oldestKey = dedupCache.keys().next().value;
        if (oldestKey) dedupCache.delete(oldestKey);
      }
      dedupCache.set(fingerprint, { count: 1, firstSeen: now, lastSeen: now });
    }

    // 4. Sanitize all fields
    const sanitizedRecord = {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      message: cleanMessage,
      stack: payload.stack ? redactTelemetryText(payload.stack.slice(0, 1000)) : undefined,
      componentStack: payload.componentStack ? redactTelemetryText(payload.componentStack.slice(0, 1000)) : undefined,
      source: cleanSource || undefined,
      lineno: payload.lineno,
      colno: payload.colno,
      url: sanitizeTelemetryUrl(payload.url),
      clientIp: context.clientIp ? '[MASKED_IP]' : undefined
    };

    // 5. In-memory buffer retention (non-blocking, bounded, no disk write)
    telemetryBuffer.push({
      timestamp: sanitizedRecord.timestamp,
      requestId: sanitizedRecord.requestId,
      message: sanitizedRecord.message,
      source: sanitizedRecord.source,
      url: sanitizedRecord.url
    });
    if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
      telemetryBuffer.shift();
    }

    // 6. Async structured stdout logging
    console.warn(JSON.stringify({
      level: 'warn',
      type: 'CLIENT_TELEMETRY',
      ...sanitizedRecord
    }));

    return { recorded: true };
  }

  getRecentTelemetry() {
    return [...telemetryBuffer];
  }

  clearBuffer() {
    telemetryBuffer.length = 0;
    dedupCache.clear();
  }
}

export const clientTelemetryService = new ClientTelemetryService();
