import { prisma } from "../database";
import { ScreeningRecord } from "../database";
import { auditRepository } from "./auditRepository";
import { encryptionService } from "../services/encryptionService";

const HARD_MAX_PAGE_SIZE = 100;

function parseRiskIndicators(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const decrypted = encryptionService.decryptSensitive(raw) || raw;
    return JSON.parse(decrypted);
  } catch {
    return undefined;
  }
}

function mapDbScreeningToRecord(s: any): ScreeningRecord {
  return {
    ...s,
    timestamp: s.timestamp.toISOString(),
    item9Score: s.item9Score ?? undefined,
    hasSelfHarmRisk: s.hasSelfHarmRisk ?? undefined,
    riskLevel: s.riskLevel || undefined,
    riskIndicators: parseRiskIndicators(s.riskIndicators),
    status: s.status as any,
    userId: s.userId || undefined,
  };
}

export const screeningRepository = {
  async getScreenings(limit = 20, offset = 0, userId?: string): Promise<ScreeningRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    const where = userId ? { userId } : {};

    const list = await prisma.screenings.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take,
      skip: offset,
    });

    return list.map(mapDbScreeningToRecord);
  },

  async countScreenings(userId?: string): Promise<number> {
    const where = userId ? { userId } : {};
    return await prisma.screenings.count({ where });
  },

  async findScreeningById(id: string): Promise<ScreeningRecord | null> {
    const s = await prisma.screenings.findUnique({
      where: { id },
    });
    if (!s) return null;

    return mapDbScreeningToRecord(s);
  },

  async addScreening(
    screening: Omit<ScreeningRecord, "id" | "timestamp">,
  ): Promise<ScreeningRecord> {
    const id = "scr-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    // Application-level encryption of clinical textual indicators
    let encryptedIndicators: string | null = null;
    if (screening.riskIndicators && Array.isArray(screening.riskIndicators)) {
      const jsonStr = JSON.stringify(screening.riskIndicators);
      encryptedIndicators = encryptionService.encryptSensitive(jsonStr);
    }

    const created = await prisma.screenings.create({
      data: {
        id,
        phq9Score: screening.phq9Score,
        gad7Score: screening.gad7Score,
        phq9Severity: screening.phq9Severity,
        gad7Severity: screening.gad7Severity,
        item9Score: screening.item9Score ?? null,
        hasSelfHarmRisk: screening.hasSelfHarmRisk ?? null,
        riskLevel: screening.riskLevel || null,
        riskIndicators: encryptedIndicators,
        status: screening.status || "Menunggu Penanganan",
        timestamp,
        userId: screening.userId || null,
      },
    });

    await auditRepository.logAudit(
      "SCREENING_SUBMITTED",
      `Hasil screening kesehatan mental tersimpan untuk subject ID ${screening.userId || "guest"}. Status: ${created.status}`,
      screening.userId || "guest",
    );

    return mapDbScreeningToRecord(created);
  },

  async updateScreeningStatus(
    id: string,
    status: "Menunggu Penanganan" | "Sedang Ditangani" | "Selesai Penanganan",
  ): Promise<ScreeningRecord | null> {
    const current = await prisma.screenings.findUnique({ where: { id } });
    if (!current) return null;

    const updated = await prisma.screenings.update({
      where: { id },
      data: { status },
    });

    return mapDbScreeningToRecord(updated);
  },
};
