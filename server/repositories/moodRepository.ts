import { prisma } from "../database.js";
import { MoodLogRecord } from "../database.js";
import { encryptionService } from "../services/encryptionService.js";
import crypto from "crypto";

const HARD_MAX_PAGE_SIZE = 100;

export const moodRepository = {
  async getMoodLogs(userId: string, limit = 100, offset = 0): Promise<MoodLogRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    const list = await prisma.moodLogs.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take,
      skip: offset,
    });

    return list.map((m) => {
      // Decrypt notes
      let decryptedNotes: string | undefined = undefined;
      if (m.notes) {
        decryptedNotes = encryptionService.decryptSensitive(m.notes) || undefined;
      }

      // Decrypt and parse factors
      let decryptedFactors: string[] | undefined = undefined;
      if (m.factors) {
        if (encryptionService.isEncrypted(m.factors)) {
          const decryptedFactorsStr = encryptionService.decryptSensitive(m.factors);
          if (decryptedFactorsStr) {
            try {
              decryptedFactors = JSON.parse(decryptedFactorsStr);
            } catch {
              decryptedFactors = [decryptedFactorsStr];
            }
          }
        } else {
          // Legacy plaintext factors
          try {
            decryptedFactors = JSON.parse(m.factors);
          } catch {
            decryptedFactors = [m.factors];
          }
        }
      }

      return {
        ...m,
        timestamp: m.timestamp.toISOString(),
        notes: decryptedNotes,
        intensity: m.intensity ?? undefined,
        factors: decryptedFactors,
      };
    });
  },

  async addMoodLog(
    log: Omit<MoodLogRecord, "id" | "timestamp">,
  ): Promise<MoodLogRecord> {
    const id = "mood-" + crypto.randomUUID();
    const timestamp = new Date();

    // Encrypt notes
    let encryptedNotes: string | null = null;
    if (log.notes) {
      const enc = encryptionService.encryptSensitive(log.notes);
      if (!enc) {
        throw new Error("FATAL SECURITY ERROR: Failed to encrypt sensitive mood notes. Transaction aborted.");
      }
      encryptedNotes = enc;
    }

    // Encrypt factors
    let encryptedFactors: string | null = null;
    if (log.factors && log.factors.length > 0) {
      const factorsJson = JSON.stringify(log.factors);
      const enc = encryptionService.encryptSensitive(factorsJson);
      if (!enc) {
        throw new Error("FATAL SECURITY ERROR: Failed to encrypt sensitive mood factors. Transaction aborted.");
      }
      encryptedFactors = enc;
    }

    const created = await prisma.moodLogs.create({
      data: {
        id,
        userId: log.userId,
        mood: log.mood,
        notes: encryptedNotes,
        intensity: log.intensity ?? null,
        factors: encryptedFactors,
        timestamp,
      },
    });

    return {
      ...created,
      timestamp: created.timestamp.toISOString(),
      notes: log.notes || undefined,
      intensity: created.intensity ?? undefined,
      factors: log.factors,
    };
  },
};
