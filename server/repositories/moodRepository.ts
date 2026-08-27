import { prisma } from "../database";
import { MoodLogRecord } from "../database";

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

    return list.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
      notes: m.notes || undefined,
      intensity: m.intensity ?? undefined,
      factors: m.factors ? JSON.parse(m.factors) : undefined,
    }));
  },

  async addMoodLog(
    log: Omit<MoodLogRecord, "id" | "timestamp">,
  ): Promise<MoodLogRecord> {
    const id = "mood-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.moodLogs.create({
      data: {
        id,
        userId: log.userId,
        mood: log.mood,
        notes: log.notes || null,
        intensity: log.intensity ?? null,
        factors: log.factors ? JSON.stringify(log.factors) : null,
        timestamp,
      },
    });

    return {
      ...created,
      timestamp: created.timestamp.toISOString(),
      notes: created.notes || undefined,
      intensity: created.intensity ?? undefined,
      factors: created.factors ? JSON.parse(created.factors) : undefined,
    };
  },
};
