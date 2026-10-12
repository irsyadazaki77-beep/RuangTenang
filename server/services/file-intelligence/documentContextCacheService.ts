import { createHash } from 'node:crypto';
import type { RetrievedDocumentContext } from './contextRetrievalService.js';

export interface DocumentRetrievalCacheKey {
  userId: string;
  chatId?: string;
  attachmentIds: string[];
  userQuery: string;
  sourceChecksums: string;
}

interface CacheEntry {
  result: RetrievedDocumentContext;
  expiresAt: number;
  createdAt: number;
}

const documentContextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache per safe versioned query
const MAX_CACHE_ENTRIES = 200;

export const documentContextCacheService = {
  createCacheKey(params: {
    userId: string;
    chatId?: string;
    attachmentIds?: string[];
    userQuery: string;
    sourceChecksums: string[];
  }): string {
    const rawKey = JSON.stringify({
      userId: params.userId,
      chatId: params.chatId || '',
      attachmentIds: [...(params.attachmentIds || [])].sort(),
      normalizedQuery: (params.userQuery || '').trim().toLowerCase(),
      checksums: [...params.sourceChecksums].sort()
    });
    return createHash('sha256').update(rawKey).digest('hex');
  },

  get(key: string): RetrievedDocumentContext | null {
    const entry = documentContextCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      documentContextCache.delete(key);
      return null;
    }
    return entry.result;
  },

  set(key: string, result: RetrievedDocumentContext): void {
    if (documentContextCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = documentContextCache.keys().next().value;
      if (oldestKey) documentContextCache.delete(oldestKey);
    }
    documentContextCache.set(key, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
      createdAt: Date.now()
    });
  },

  invalidateUser(_userId: string): void {
    documentContextCache.clear();
  },

  clear(): void {
    documentContextCache.clear();
  }
};
