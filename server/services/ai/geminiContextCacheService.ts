import { createHash } from 'node:crypto';
import { getGenAIClient } from '../../config/aiConfig.js';
import { getActualGeminiModel } from './aiModelRegistry.js';
import { aiMetricsService } from './aiMetricsService.js';

interface ActiveCacheEntry {
  cacheName: string;
  fingerprint: string;
  tokenCount: number;
  model: string;
  createdAt: number;
  expiresAt: number;
}

const activeCaches = new Map<string, ActiveCacheEntry>();
const MIN_TOKENS_FOR_EXPLICIT_CACHE = 32_768;
const DEFAULT_CACHE_TTL_SECONDS = 1800; // 30 minutes

function sweepExpiredCaches(): void {
  const now = Date.now();
  for (const [key, entry] of activeCaches.entries()) {
    if (entry.expiresAt <= now) {
      activeCaches.delete(key);
    }
  }
}

export const geminiContextCacheService = {
  cleanExpired(): void {
    sweepExpiredCaches();
  },
  computeFingerprint(items: Array<{ id?: string; text: string }>): string {
    const combined = items
      .map(item => `${item.id || ''}:${item.text}`)
      .join('\n---\n');
    return createHash('sha256').update(combined).digest('hex');
  },

  /**
   * Retrieves or creates a Gemini Explicit Context Cache for large document bundles.
   * If tokens < 32k or client unavailable, gracefully returns without explicit cacheName,
   * relying on Gemini's automatic implicit prefix caching.
   */
  async getOrCreateCache(params: {
    documents: Array<{ id?: string; filename?: string; text: string }>;
    modelId: string;
    ttlSeconds?: number;
  }): Promise<{
    cacheName?: string;
    isExplicitCached: boolean;
    tokenCount: number;
    implicitEligible: boolean;
  }> {
    sweepExpiredCaches();
    const { documents, modelId, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS } = params;
    if (!documents || documents.length === 0) {
      return { isExplicitCached: false, tokenCount: 0, implicitEligible: false };
    }

    const fullText = documents
      .map(d => `--- DOKUMEN: ${d.filename || 'Untitled'} ---\n${d.text}`)
      .join('\n\n');
    const estimatedTokens = aiMetricsService.estimateTokens(fullText);
    const fingerprint = this.computeFingerprint(documents);

    // 1. Check existing in-memory active cache
    const existing = activeCaches.get(fingerprint);
    if (existing && Date.now() < existing.expiresAt) {
      return {
        cacheName: existing.cacheName,
        isExplicitCached: true,
        tokenCount: existing.tokenCount,
        implicitEligible: true
      };
    }

    // 2. Explicit cache requires at least 32,768 tokens in Gemini API
    if (estimatedTokens < MIN_TOKENS_FOR_EXPLICIT_CACHE) {
      return {
        cacheName: undefined,
        isExplicitCached: false,
        tokenCount: estimatedTokens,
        implicitEligible: true
      };
    }

    // 3. Attempt creating Gemini explicit cache via SDK
    const client = getGenAIClient();
    if (!client) {
      return {
        cacheName: undefined,
        isExplicitCached: false,
        tokenCount: estimatedTokens,
        implicitEligible: false
      };
    }

    const actualModel = getActualGeminiModel(modelId);
    try {
      const cache = await client.caches.create({
        model: actualModel,
        config: {
          contents: [
            {
              role: 'user',
              parts: [{ text: fullText }]
            }
          ],
          ttl: `${ttlSeconds}s`
        }
      });

      if (cache && cache.name) {
        const entry: ActiveCacheEntry = {
          cacheName: cache.name,
          fingerprint,
          tokenCount: estimatedTokens,
          model: actualModel,
          createdAt: Date.now(),
          expiresAt: Date.now() + (ttlSeconds * 1000)
        };
        activeCaches.set(fingerprint, entry);

        return {
          cacheName: cache.name,
          isExplicitCached: true,
          tokenCount: estimatedTokens,
          implicitEligible: true
        };
      }
    } catch (err: any) {
      console.warn(`[GEMINI_CONTEXT_CACHE] Explicit cache creation failed (falling back to direct injection):`, err?.message || err);
    }

    return {
      cacheName: undefined,
      isExplicitCached: false,
      tokenCount: estimatedTokens,
      implicitEligible: true
    };
  },

  clearCache(fingerprint?: string): void {
    if (fingerprint) {
      activeCaches.delete(fingerprint);
    } else {
      activeCaches.clear();
    }
  }
};
