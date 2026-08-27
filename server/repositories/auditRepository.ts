import crypto from 'crypto';
import { prisma } from "../database";
import { AuditLogRecord, TelemetryLogRecord, GovernanceTestRecord, ProgramProgressRecord, DailyUsageRecord, UsabilityFeedbackRecord } from "../database";
import { scanAndSanitizePII } from "../services/piiService";

const HARD_MAX_PAGE_SIZE = 100;

export interface StructuredAuditEvent {
  actorPseudonymousId?: string | null;
  subjectPseudonymousId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  purpose: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  timestamp?: Date | string;
  requestId?: string | null;
  ip?: string | null;
  userRole?: string | null;
}

export function pseudonymizeIdentifier(identifier: string | null | undefined): string | null {
  if (!identifier) return null;
  return crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 16);
}

export const auditRepository = {
  async logAudit(
    action: string,
    details: string,
    ipOrHash?: string | null,
    userRole?: string | null,
  ): Promise<AuditLogRecord> {
    const id = "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    // Automatic PII Redaction for Audit Log details
    const sanitizedDetails = scanAndSanitizePII(details).sanitizedText;

    // Pseudonymize IP if provided
    let calculatedIpHash: string | null = null;
    if (ipOrHash) {
      if (ipOrHash.length === 16 && /^[a-f0-9]+$/i.test(ipOrHash)) {
        calculatedIpHash = ipOrHash;
      } else {
        calculatedIpHash = pseudonymizeIdentifier(ipOrHash);
      }
    }

    const created = await prisma.auditLogs.create({
      data: {
        id,
        action,
        details: sanitizedDetails,
        timestamp,
        ipHash: calculatedIpHash,
        userRole: userRole || null,
      },
    });

    return {
      ...created,
      timestamp: created.timestamp.toISOString(),
      ipHash: created.ipHash || undefined,
      userRole: created.userRole || undefined,
    };
  },

  async logStructuredAudit(event: StructuredAuditEvent): Promise<AuditLogRecord> {
    const actorHash = pseudonymizeIdentifier(event.actorPseudonymousId) || 'anonymous';
    const subjectHash = pseudonymizeIdentifier(event.subjectPseudonymousId) || 'n/a';
    const reqId = event.requestId || 'no-req-id';

    const structuredPayload = JSON.stringify({
      actor: actorHash,
      subject: subjectHash,
      resType: event.resourceType,
      resId: event.resourceId || 'n/a',
      purpose: event.purpose,
      result: event.result,
      reqId: reqId
    });

    return await this.logAudit(
      event.action,
      structuredPayload,
      event.ip,
      event.userRole || 'system'
    );
  },

  async getAuditLogs(limit = 100, offset = 0): Promise<AuditLogRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    
    const list = await prisma.auditLogs.findMany({
      orderBy: { timestamp: "desc" },
      take,
      skip: offset,
    });

    return list.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
      ipHash: a.ipHash || undefined,
      userRole: a.userRole || undefined,
    }));
  },

  async countAuditLogs(): Promise<number> {
    return await prisma.auditLogs.count();
  },

  async addTelemetryLog(
    log: Omit<TelemetryLogRecord, "id" | "timestamp">,
  ): Promise<TelemetryLogRecord> {
    const id = "tel-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.telemetryLogs.create({
      data: {
        id,
        service: log.service,
        status: log.status,
        latencyMs: log.latencyMs,
        details: log.details ? scanAndSanitizePII(log.details).sanitizedText : null,
        retryAttempt: log.retryAttempt ?? null,
        timestamp,
      },
    });

    return {
      ...created,
      status: created.status as 'SUCCESS' | 'WARNING' | 'FAILED',
      timestamp: created.timestamp.toISOString(),
      retryAttempt: created.retryAttempt ?? undefined,
    };
  },

  async getTelemetryLogs(limit = 100, offset = 0): Promise<TelemetryLogRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    
    const list = await prisma.telemetryLogs.findMany({
      orderBy: { timestamp: "desc" },
      take,
      skip: offset,
    });

    return list.map((t) => ({
      ...t,
      status: t.status as 'SUCCESS' | 'WARNING' | 'FAILED',
      timestamp: t.timestamp.toISOString(),
      retryAttempt: t.retryAttempt ?? undefined,
    }));
  },

  async countTelemetryLogs(): Promise<number> {
    return await prisma.telemetryLogs.count();
  },

  async addGovernanceTest(
    test: Omit<GovernanceTestRecord, "id" | "evaluatedAt">,
  ): Promise<GovernanceTestRecord> {
    const id = "gov-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const evaluatedAt = new Date();

    const created = await prisma.governanceTests.create({
      data: {
        id,
        category: test.category,
        prompt: test.prompt,
        expectedBehavior: test.expectedBehavior,
        actualAIResponse: test.actualAIResponse,
        status: test.status,
        evaluatedAt,
      },
    });

    return {
      ...created,
      evaluatedAt: created.evaluatedAt.toISOString(),
    };
  },

  async getGovernanceTests(limit = 100, offset = 0): Promise<GovernanceTestRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    
    const list = await prisma.governanceTests.findMany({
      orderBy: { evaluatedAt: "desc" },
      take,
      skip: offset,
    });

    return list.map((g) => ({
      ...g,
      evaluatedAt: g.evaluatedAt.toISOString(),
    }));
  },

  async countGovernanceTests(): Promise<number> {
    return await prisma.governanceTests.count();
  },

  // Daily Usage Tracking
  async getDailyUsage(identifier: string, date: string): Promise<DailyUsageRecord> {
    const record = await prisma.dailyUsages.findUnique({
      where: {
        identifier_date: { identifier, date },
      },
    });

    if (record) {
      return record;
    }

    // Return virtual zero record
    return { identifier, date, count: 0 };
  },

  async incrementDailyUsage(identifier: string, date: string): Promise<DailyUsageRecord> {
    const record = await prisma.dailyUsages.upsert({
      where: {
        identifier_date: { identifier, date },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        identifier,
        date,
        count: 1,
      },
    });

    return record;
  },

  async getWeeklyUsage(identifier: string): Promise<DailyUsageRecord[]> {
    const dateList: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateList.push(d.toISOString().split("T")[0]);
    }

    const records = await prisma.dailyUsages.findMany({
      where: {
        identifier,
        date: { in: dateList },
      },
    });

    // Merge and fill zeroes
    return dateList.map((date) => {
      const found = records.find((r) => r.date === date);
      return found || { identifier, date, count: 0 };
    });
  },

  // Program Progress Logging
  async saveProgramProgress(
    userId: string,
    programId: string,
    completedStepIds: string[],
  ): Promise<ProgramProgressRecord> {
    const record = await prisma.programProgresses.upsert({
      where: {
        userId_programId: { userId, programId },
      },
      update: {
        completedStepIds: JSON.stringify(completedStepIds),
        lastUpdated: new Date(),
      },
      create: {
        userId,
        programId,
        completedStepIds: JSON.stringify(completedStepIds),
        lastUpdated: new Date(),
      },
    });

    return {
      userId: record.userId,
      programId: record.programId,
      completedStepIds,
      lastUpdated: record.lastUpdated.toISOString(),
    };
  },

  async getProgramProgress(userId: string): Promise<ProgramProgressRecord[]> {
    const progress = await prisma.programProgresses.findMany({
      where: { userId },
    });

    return progress.map((p) => ({
      userId: p.userId,
      programId: p.programId,
      completedStepIds: JSON.parse(p.completedStepIds),
      lastUpdated: p.lastUpdated.toISOString(),
    }));
  },

  // Usability Feedbacks
  async addUsabilityFeedback(
    feedback: Omit<UsabilityFeedbackRecord, "id" | "submittedAt">,
  ): Promise<UsabilityFeedbackRecord> {
    const id = "usab-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const submittedAt = new Date();

    const created = await prisma.usabilityFeedbacks.create({
      data: {
        id,
        role: feedback.role,
        scenarioName: feedback.scenarioName,
        susScores: typeof feedback.susScores === "string" ? feedback.susScores : JSON.stringify(feedback.susScores),
        overallSusScore: feedback.overallSusScore,
        comments: feedback.comments ? scanAndSanitizePII(feedback.comments).sanitizedText : null,
        submittedAt,
      },
    });

    let parsedScores: string | number[] = created.susScores;
    try {
      parsedScores = JSON.parse(created.susScores);
    } catch {
      // keep as string
    }

    return {
      id: created.id,
      role: created.role,
      scenarioName: created.scenarioName,
      susScores: parsedScores,
      overallSusScore: created.overallSusScore,
      comments: created.comments,
      submittedAt: created.submittedAt.toISOString(),
    };
  },

  async getUsabilityFeedbacks(limit = 100, offset = 0): Promise<UsabilityFeedbackRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);

    const list = await prisma.usabilityFeedbacks.findMany({
      orderBy: { submittedAt: "desc" },
      take,
      skip: offset,
    });

    return list.map((u) => {
      let parsedScores: string | number[] = u.susScores;
      try {
        parsedScores = JSON.parse(u.susScores);
      } catch {
        // keep as string
      }

      return {
        id: u.id,
        role: u.role,
        scenarioName: u.scenarioName,
        susScores: parsedScores,
        overallSusScore: u.overallSusScore,
        comments: u.comments,
        submittedAt: u.submittedAt.toISOString(),
      };
    });
  },

  async countUsabilityFeedbacks(): Promise<number> {
    return await prisma.usabilityFeedbacks.count();
  },
};
