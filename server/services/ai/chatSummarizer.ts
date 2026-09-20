import { getGenAIClient } from '../../config/aiConfig.js';
import { getActualGeminiModel } from './aiModelRegistry.js';
import { scanAndSanitizePII } from '../piiService.js';
import { aiMetricsService } from './aiMetricsService.js';
import { getLocalFallbackSummary } from '../../routes/fallbackAi.js';

interface SummaryCacheEntry {
  summary: string;
  lastSummarizedMsgId: string;
  msgCount: number;
  timestamp: number;
}

const summaryCache = new Map<string, SummaryCacheEntry>();
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ChatMessageItem {
  id?: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  plugin?: string;
}

export const chatSummarizer = {
  /**
   * Clears summary cache for a specific chat or all chats
   */
  clearCache(chatId?: string): void {
    if (chatId) {
      summaryCache.delete(chatId);
    } else {
      summaryCache.clear();
    }
  },

  /**
   * Retrieves or incrementally updates summary for chat history older than the last 5 turns.
   */
  async getOrUpdateSummary(
    chatId: string,
    fullHistory: ChatMessageItem[],
    options?: { userId?: string; abortSignal?: AbortSignal }
  ): Promise<{ summary: string; lastSummarizedMsgId: string; tokensSaved: number }> {
    if (!chatId || !Array.isArray(fullHistory) || fullHistory.length <= 10) {
      return { summary: '', lastSummarizedMsgId: '', tokensSaved: 0 };
    }

    // Keep the last 5 messages as recent raw history
    const RECENT_KEEP_COUNT = 5;
    const olderMessages = fullHistory.slice(0, fullHistory.length - RECENT_KEEP_COUNT);
    if (olderMessages.length === 0) {
      return { summary: '', lastSummarizedMsgId: '', tokensSaved: 0 };
    }

    const lastOlderMsg = olderMessages[olderMessages.length - 1];
    const targetMsgId = lastOlderMsg.id || `idx_${olderMessages.length}`;

    // 1. Check Cache
    const cached = summaryCache.get(chatId);
    if (cached && cached.lastSummarizedMsgId === targetMsgId && (Date.now() - cached.timestamp) < MAX_CACHE_AGE_MS) {
      const rawOlderText = olderMessages.map(m => m.content).join(' ');
      const rawTokens = aiMetricsService.estimateTokens(rawOlderText);
      const summaryTokens = aiMetricsService.estimateTokens(cached.summary);
      const tokensSaved = Math.max(0, rawTokens - summaryTokens);

      return {
        summary: cached.summary,
        lastSummarizedMsgId: cached.lastSummarizedMsgId,
        tokensSaved
      };
    }

    // 2. Incremental or Fresh Summarization
    let textToSummarize = '';
    let previousSummaryContext = '';

    if (cached && cached.lastSummarizedMsgId && (Date.now() - cached.timestamp) < MAX_CACHE_AGE_MS) {
      // Find new older messages since last cached message
      const lastIndex = olderMessages.findIndex(m => m.id === cached.lastSummarizedMsgId);
      if (lastIndex !== -1 && lastIndex < olderMessages.length - 1) {
        const newOlderChunk = olderMessages.slice(lastIndex + 1);
        textToSummarize = newOlderChunk.map(m => `${m.role}: ${m.content}`).join('\n');
        previousSummaryContext = `Ringkasan sebelumnya:\n${cached.summary}\n\nPesan baru yang perlu ditambahkan:`;
      } else {
        textToSummarize = olderMessages.map(m => `${m.role}: ${m.content}`).join('\n');
      }
    } else {
      textToSummarize = olderMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    let generatedSummary = '';

    // Sanitize input to summarizer
    const sanitizedInput = scanAndSanitizePII(textToSummarize.substring(0, 3000)).sanitizedText;

    const aiClient = getGenAIClient();
    if (aiClient) {
      try {
        const prompt = previousSummaryContext
          ? `${previousSummaryContext}\n${sanitizedInput}\n\nBuat ringkasan gabungan yang sangat ringkas (maksimal 3 poin singkat dalam Bahasa Indonesia) mencakup poin penting dan emosi utama.`
          : `Buat ringkasan percakapan berikut secara sangat ringkas (maksimal 3 poin singkat dalam Bahasa Indonesia):\n${sanitizedInput}`;

        const response = await aiClient.models.generateContent({
          model: getActualGeminiModel('gemini-2.5-flash-lite'),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.3,
            maxOutputTokens: 250
          }
        });

        if (response.text) {
          generatedSummary = response.text.trim();
        }
      } catch (err: any) {
        console.warn(`[CHAT_SUMMARIZER] AI summarization failed, using local fallback summary:`, err?.message || err);
      }
    }

    if (!generatedSummary) {
      // Deterministic Local Fallback Summary
      const localHistory = olderMessages.map(m => ({ role: m.role, content: m.content }));
      generatedSummary = getLocalFallbackSummary(localHistory);
    }

    // Sanitize generated summary against PII & prompt injection delimiters
    generatedSummary = scanAndSanitizePII(generatedSummary).sanitizedText;
    generatedSummary = generatedSummary.replace(/[\[\]<>]/g, '');

    // Calculate token metrics
    const rawOlderText = olderMessages.map(m => m.content).join(' ');
    const rawTokens = aiMetricsService.estimateTokens(rawOlderText);
    const summaryTokens = aiMetricsService.estimateTokens(generatedSummary);
    const tokensSaved = Math.max(0, rawTokens - summaryTokens);

    // Save to Cache
    summaryCache.set(chatId, {
      summary: generatedSummary,
      lastSummarizedMsgId: targetMsgId,
      msgCount: olderMessages.length,
      timestamp: Date.now()
    });

    return {
      summary: generatedSummary,
      lastSummarizedMsgId: targetMsgId,
      tokensSaved
    };
  }
};
