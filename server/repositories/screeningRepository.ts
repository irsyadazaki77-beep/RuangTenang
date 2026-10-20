import { prisma } from "../database";
import { ScreeningRecord } from "../database";
import { auditRepository } from "./auditRepository";
import { encryptionService } from "../services/encryptionService";

const HARD_MAX_PAGE_SIZE = 100;

function parseRiskIndicators(raw: string | null | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const decrypted = encryptionService.decryptSensitive(raw) || raw;
    const parsed = JSON.parse(decrypted);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function isSameSubmission(existing: any, incoming: Omit<ScreeningRecord, 'id' | 'timestamp'>): boolean {
  if (
    existing.userId !== (incoming.userId || null) ||
    existing.phq9Score !== incoming.phq9Score ||
    existing.gad7Score !== incoming.gad7Score ||
    (existing.item9Score ?? null) !== (incoming.item9Score ?? null) ||
    (existing.hasSelfHarmRisk ?? null) !== (incoming.hasSelfHarmRisk ?? null)
  ) return false;

  const storedIndicators = parseRiskIndicators(existing.riskIndicators);
  const incomingIndicators = incoming.riskIndicators;
  if (!storedIndicators || !incomingIndicators) return !storedIndicators && !incomingIndicators;

  return ['item9Score', 'item9Positive', 'immediateDanger', 'planOrIntent', 'wantsTrustedContact']
    .every(key => (storedIndicators[key] ?? null) === ((incomingIndicators as Record<string, unknown>)[key] ?? null));
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
    clientSubmissionId?: string,
  ): Promise<ScreeningRecord> {
    const id = clientSubmissionId || "scr-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    if (clientSubmissionId) {
      const existing = await prisma.screenings.findUnique({ where: { id: clientSubmissionId } });
      if (existing) {
        if (!isSameSubmission(existing, screening)) throw new Error('SCREENING_IDEMPOTENCY_CONFLICT');
        return mapDbScreeningToRecord(existing);
      }
    }

    // Application-level encryption of clinical textual indicators
    let encryptedIndicators: string | null = null;
    if (screening.riskIndicators) {
      const jsonStr = JSON.stringify(screening.riskIndicators);
      encryptedIndicators = encryptionService.encryptSensitive(jsonStr);
    }

    let created: any;
    try {
      created = await prisma.screenings.create({
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
    } catch (error: any) {
      // Concurrent retries can race after both observe no row. Resolve only the
      // same user's identical submission; otherwise surface a conflict.
      if (clientSubmissionId && error?.code === 'P2002') {
        const existing = await prisma.screenings.findUnique({ where: { id: clientSubmissionId } });
        if (existing && isSameSubmission(existing, screening)) return mapDbScreeningToRecord(existing);
        if (existing) throw new Error('SCREENING_IDEMPOTENCY_CONFLICT');
      }
      throw error;
    }

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
