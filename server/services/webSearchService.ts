import { createHash } from 'node:crypto';
import { scanAndSanitizePII } from './piiService.js';

export interface WebSearchResult {
  title: string;
  url: string;
  excerpt: string;
  publishedDate?: string;
}

export class WebSearchError extends Error {
  constructor(public readonly code: 'WEB_SEARCH_NOT_CONFIGURED' | 'WEB_SEARCH_FAILED' | 'WEB_SEARCH_TIMEOUT') { super(code); }
}

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

/** Only public http(s) URLs may be cited. Rejects credentials, private hosts and other schemes. */
export function normalizePublicUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 600) return null;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || PRIVATE_HOST.test(url.hostname)) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

export function webCitationDocumentId(url: string): string {
  return `web_${createHash('sha256').update(url).digest('hex').slice(0, 24)}`;
}

/**
 * Real web search through Tavily. Returns only what the provider returned (title, URL, content
 * snippet); nothing is synthesised. The outgoing query is PII-sanitised first.
 */
export async function searchWeb(query: string, options: { maxResults: number; signal?: AbortSignal; fetchImpl?: typeof fetch }): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) throw new WebSearchError('WEB_SEARCH_NOT_CONFIGURED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await (options.fetchImpl || fetch)(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: scanAndSanitizePII(query).sanitizedText.slice(0, 400),
        max_results: Math.min(Math.max(options.maxResults, 1), 5),
        search_depth: 'basic', include_answer: false, include_raw_content: false
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new WebSearchError('WEB_SEARCH_FAILED');
    const body = await response.json() as { results?: Array<Record<string, unknown>> };
    const seen = new Set<string>();
    const results: WebSearchResult[] = [];
    for (const item of body.results || []) {
      const url = normalizePublicUrl(item.url);
      if (!url || seen.has(url) || typeof item.content !== 'string' || !item.content.trim()) continue;
      seen.add(url);
      const published = typeof item.published_date === 'string' && !Number.isNaN(Date.parse(item.published_date)) ? item.published_date.slice(0, 40) : undefined;
      results.push({
        title: (typeof item.title === 'string' && item.title.trim() ? item.title : new URL(url).hostname).slice(0, 300),
        url,
        excerpt: item.content.trim().slice(0, 900),
        ...(published ? { publishedDate: published } : {})
      });
    }
    return results.slice(0, options.maxResults);
  } catch (error) {
    if (error instanceof WebSearchError) throw error;
    throw new WebSearchError(controller.signal.aborted && !options.signal?.aborted ? 'WEB_SEARCH_TIMEOUT' : 'WEB_SEARCH_FAILED');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
