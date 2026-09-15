/**
 * RuangTenang Security & Data Privacy Engine
 * Handles PII stripping, prompt injection defense, input sanitization, and distributed rate limiting.
 */
import { scanAndSanitizePII } from './services/piiService.js';
import { DistributedStateService } from './services/distributedStateService.js';

// Local In-Memory Fast Cache for rate limits
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, limit: number = 15, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Distributed multi-instance safe rate limiter
 */
export async function checkDistributedRateLimit(
  key: string,
  limit: number = 15,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const res = await DistributedStateService.checkRateLimit(key, limit, windowSeconds);
  return {
    allowed: res.allowed,
    remaining: res.remaining,
  };
}

/**
 * Sanitizes input string to prevent XSS, unicode homoglyph evasions, and control-character payloads.
 */
export function sanitizeInput(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') return '';
  
  // 1. Unicode NFKC Normalization (prevents homoglyph evasion and compatibility decomposition attacks)
  let clean = text.normalize('NFKC');

  // 2. Strip explicit script and style blocks
  clean = clean.replace(/<(script|style|iframe|object|embed|svg|applet)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // 3. Strip all HTML tags
  clean = clean.replace(/<[^>]*>?/gm, '');

  // 4. Strip JavaScript pseudo-protocols & data URIs with active content
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');

  // 5. Strip inline event handlers that might survive tag stripping
  clean = clean.replace(/\bon\w+\s*=/gi, '');

  // 6. Remove dangerous control characters & bidirectional override characters (bidi attacks)
  // eslint-disable-next-line no-control-regex
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');

  // 7. Trim whitespace and enforce length cap
  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }

  return clean;
}

/**
 * Enhanced Detection for Prompt Injection, Roleplay Bypass, and Jailbreak attempts.
 */
export function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Normalize unicode before checking
  const normalized = text.normalize('NFKC').toLowerCase().trim();

  // Comprehensive Regex Patterns for Direct, Indirect & Jailbreak Injections
  const INJECTION_REGEX_PATTERNS = [
    // Ignore / forget instructions (EN & ID)
    /\b(ignore|disregard|forget|skip|bypass)\s+(all\s+|previous\s+|prior\s+|the\s+|above\s+)?(instructions|rules|prompts|guidelines|context|constraints|safety|guardrails)\b/i,
    /\b(abaikan|lupakan|hiraukan|lewati)\s+(semua\s+|seluruh\s+)?(instruksi|aturan|prompt|perintah|batasan|pedoman)\b/i,

    // Jailbreak personas & roleplay overrides (Medical, psychiatry, unrestricted)
    /\b(act|roleplay|pretend|behave|simulate)\s+(as|like)\s+(a\s+)?(real\s+doctor|licensed\s+psychiatrist|medical\s+doctor|psychiatrist|pharmacist|unrestricted|uncensored|dan\s+mode|evil\s+bot)\b/i,
    /\b(berpura-pura|bertindaklah|jadilah|berperanlah)\s+(sebagai|seperti)\s+(dokter\s+asli|psikiater|tenaga\s+medis|apoteker|bot\s+tanpa\s+filter|psikolog\s+berlisensi)\b/i,

    // Developer / DAN / Jailbreak Modes
    /\b(you\s+are\s+now\s+in\s+developer\s+mode|dan\s+mode|jailbreak\s+mode|unfiltered\s+mode|always\s+say\s+yes)\b/i,
    /\b(kamu\s+sekarang\s+dalam\s+mode\s+pengembang|mode\s+tanpa\s+batas)\b/i,

    // System prompt leaking & exfiltration
    /\b(reveal|output|display|show|leak|print|repeat)\s+(your\s+)?(system\s+prompt|initial\s+instructions|system\s+instructions|hidden\s+prompt|source\s+prompt)\b/i,
    /\b(tampilkan|bocorkan|cetak|tuliskan|beritahu)\s+(isi\s+)?(prompt\s+sistem|instruksi\s+awal|instruksi\s+rahasia)\b/i,

    // LLM Chat Delimiter spoofing / injection
    /(<\|im_start\|>|<\|im_end\|>|<\|system\|>|\[system\]|system:\s*|\[assistant\]|<system>)/i,

    // "Do Anything Now" / Override directives
    /\b(do\s+anything\s+now|override\s+system\s+prompt|reset\s+all\s+policies)\b/i,
    /\b(batalkan\s+semua\s+kebijakan|abaikan\s+kode\s+etik)\b/i
  ];

  return INJECTION_REGEX_PATTERNS.some(regex => regex.test(normalized));
}

/**
 * Safe logger that redacts PII before outputting to server logs.
 */
export function safeLog(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const sanitizedMessage = scanAndSanitizePII(message).sanitizedText;
  let dataStr = '';
  if (data) {
    dataStr = typeof data === 'string' 
      ? scanAndSanitizePII(data).sanitizedText 
      : scanAndSanitizePII(JSON.stringify(data)).sanitizedText;
  }
  console.info(`[${timestamp}] [SECURITY_LOG] ${sanitizedMessage} ${dataStr}`.trim());
}
