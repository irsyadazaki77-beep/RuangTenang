import crypto from 'crypto';

/**
 * Sanitizes URLs before logging by applying a strict ALLOWLIST policy on query parameters.
 * Prevents accidental leak of sensitive medical/clinical PII or credentials (e.g. ?keluhan=depresi, ?token=xyz) in ELK/Datadog logs.
 *
 * @param rawUrl - The raw input URL string.
 * @returns Sanitized URL string where any non-allowlisted query parameter value is replaced with [REDACTED].
 */
export function sanitizeUrlForLogs(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  try {
    const [pathname, queryString] = rawUrl.split('?');
    if (!queryString) {
      return pathname;
    }

    const ALLOWED_QUERY_KEYS = new Set([
      'page',
      'limit',
      'offset',
      'sort',
      'order',
      'format',
      'view',
      'tab',
      'mode',
      'filter',
      'status',
      'approvalstatus',
      'category',
      'type',
      'lang'
    ]);

    const params = new URLSearchParams(queryString);
    for (const key of Array.from(params.keys())) {
      const normalizedKey = key.toLowerCase().trim();
      if (!ALLOWED_QUERY_KEYS.has(normalizedKey)) {
        params.set(key, '[REDACTED]');
      }
    }

    return `${pathname}?${params.toString()}`;
  } catch {
    return rawUrl.split('?')[0] || rawUrl;
  }
}

export function pseudonymizeIp(ip: string | string[]): string {
  const ipStr = Array.isArray(ip) ? ip[0] : ip;
  return crypto.createHash('sha256').update(ipStr || '127.0.0.1').digest('hex').slice(0, 16);
}
