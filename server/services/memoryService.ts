import { prisma } from '../database.js';
import { encryptionService } from './encryptionService.js';
import { UserMemories } from '@prisma/client';

export class MemoryService {
  /**
   * Retrieves, ranks, and filters memories for AI context.
   * Prevents duplicates, irrelevant, stale, or out-of-context memories.
   */
  static async getRelevantMemories(userId: string, currentMessage: string, take: number = 3): Promise<UserMemories[]> {
    const allMemories = await prisma.userMemories.findMany({
      where: { userId, isActive: true }
    });

    if (!allMemories.length) return [];

    const now = Date.now();
    const queryTerms = currentMessage.toLowerCase().split(/\s+/).filter(t => t.length > 3);

    const scoredMemories = allMemories.map(m => {
      const contentStr = (encryptionService.decryptSensitive(m.content) || m.content).toLowerCase();
      let score = 0;

      // 1. Relevance Scoring (TF-like)
      for (const term of queryTerms) {
        if (contentStr.includes(term)) score += 2;
      }

      // 2. Recency Decay
      // Memories older than 30 days have a lower score, but not 0 if highly relevant
      const ageMs = now - m.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      let timeScore = Math.max(0, 5 - (ageDays / 30)); // Max +5 for brand new, 0 for > 150 days
      score += timeScore;

      // If highly irrelevant (score < 1), we can filter them out later, but keep if we need baseline
      return { memory: m, score, contentStr };
    });

    // 3. Filter out irrelevant memories if we have query terms (score threshold)
    // If no query terms, we just rely on recency (timeScore)
    let filtered = scoredMemories;
    if (queryTerms.length > 0) {
      filtered = scoredMemories.filter(s => s.score >= 2); // Must have at least some relevance
    }

    // 4. Sort by score descending, then recency
    filtered.sort((a, b) => b.score - a.score || b.memory.createdAt.getTime() - a.memory.createdAt.getTime());

    // 5. Conflict Handling & Deduplication
    const selected: UserMemories[] = [];
    const usedContents = new Set<string>();

    for (const item of filtered) {
      if (selected.length >= take) break;
      
      // Simple deduplication based on content overlap
      let isDuplicate = false;
      for (const used of usedContents) {
        // If 80% of words overlap, consider it duplicate
        const usedWords = used.split(/\s+/);
        const itemWords = item.contentStr.split(/\s+/);
        const overlap = itemWords.filter(w => usedWords.includes(w)).length;
        if (overlap / Math.max(usedWords.length, itemWords.length) > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        selected.push(item.memory);
        usedContents.add(item.contentStr);
      }
    }

    return selected.length > 0 ? selected : allMemories.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, take);
  }
}
