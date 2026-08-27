import crypto from 'crypto';
import { prisma } from "../database";
import { UserConsentRecord, StaffAccessLogRecord, DataErasureRecord } from "../database";
import { auditRepository } from "./auditRepository";

export const privacyRepository = {
  async getUserConsent(userId: string): Promise<UserConsentRecord | null> {
    const record = await prisma.userConsents.findUnique({
      where: { userId },
    });
    if (!record) return null;

    return {
      ...record,
      consentTimestamp: record.consentTimestamp?.toISOString() || undefined,
      grantedAt: record.grantedAt?.toISOString() || undefined,
      withdrawnAt: record.withdrawnAt?.toISOString() || undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  },

  async saveUserConsent(
    userId: string,
    consents: Partial<UserConsentRecord>,
  ): Promise<UserConsentRecord> {
    const record = await prisma.userConsents.upsert({
      where: { userId },
      update: {
        consentForAI: consents.consentForAI,
        consentForAIMood: consents.consentForAIMood,
        consentForAIScreening: consents.consentForAIScreening,
        consentForAIMemory: consents.consentForAIMemory,
        consentForAIJournal: consents.consentForAIJournal,
        consentForEmergencySOS: consents.consentForEmergencySOS,
        consentForCounselorSummary: consents.consentForCounselorSummary,
        consentForCounselorSharing: consents.consentForCounselorSharing,
        consentForTelemetry: consents.consentForTelemetry,
        consentForAnalytics: consents.consentForAnalytics,
        consentVersion: consents.consentVersion,
        policyVersion: consents.policyVersion,
        consentTimestamp: consents.consentTimestamp
          ? new Date(consents.consentTimestamp)
          : undefined,
        grantedAt: consents.grantedAt ? new Date(consents.grantedAt) : undefined,
        withdrawnAt: consents.withdrawnAt
          ? new Date(consents.withdrawnAt)
          : undefined,
        retentionDays: consents.retentionDays,
        updatedAt: new Date(),
      },
      create: {
        userId,
        consentForAI: consents.consentForAI ?? false,
        consentForAIMood: consents.consentForAIMood ?? false,
        consentForAIScreening: consents.consentForAIScreening ?? false,
        consentForAIMemory: consents.consentForAIMemory ?? false,
        consentForAIJournal: consents.consentForAIJournal ?? false,
        consentForEmergencySOS: consents.consentForEmergencySOS ?? false,
        consentForCounselorSummary: consents.consentForCounselorSummary ?? false,
        consentForCounselorSharing: consents.consentForCounselorSharing ?? false,
        consentForTelemetry: consents.consentForTelemetry ?? false,
        consentForAnalytics: consents.consentForAnalytics ?? false,
        consentVersion: consents.consentVersion ?? "v1.3-2026",
        policyVersion: consents.policyVersion ?? "v2.0-PDP-2026",
        consentTimestamp: consents.consentTimestamp
          ? new Date(consents.consentTimestamp)
          : new Date(),
        grantedAt: consents.grantedAt ? new Date(consents.grantedAt) : new Date(),
        withdrawnAt: consents.withdrawnAt
          ? new Date(consents.withdrawnAt)
          : undefined,
        retentionDays: consents.retentionDays ?? 90,
        updatedAt: new Date(),
      },
    });

    await auditRepository.logAudit(
      "CONSENT_UPDATED",
      `Persetujuan privasi diperbarui untuk user ID ${userId}. Versi persetujuan: ${record.consentVersion}`,
      userId,
    );

    return {
      ...record,
      consentTimestamp: record.consentTimestamp?.toISOString() || undefined,
      grantedAt: record.grantedAt?.toISOString() || undefined,
      withdrawnAt: record.withdrawnAt?.toISOString() || undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  },

  async addStaffAccessLog(
    log: Omit<StaffAccessLogRecord, "id" | "timestamp">,
  ): Promise<StaffAccessLogRecord> {
    const id = "stafflog-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.staffAccessLogs.create({
      data: {
        id,
        staffUserId: log.staffUserId,
        staffName: log.staffName,
        staffRole: log.staffRole,
        targetUserId: log.targetUserId,
        accessType: log.accessType,
        purpose: log.purpose,
        timestamp,
      },
    });

    await auditRepository.logAudit(
      "STAFF_DATA_ACCESS",
      `Petugas ${log.staffName} (${log.staffRole}) mengakses data pengguna ID ${log.targetUserId}. Alasan: ${log.purpose}`,
      log.staffUserId,
    );

    return {
      ...created,
      timestamp: created.timestamp.toISOString(),
    };
  },

  async getStaffAccessLogsForUser(targetUserId: string): Promise<StaffAccessLogRecord[]> {
    const list = await prisma.staffAccessLogs.findMany({
      where: { targetUserId },
      orderBy: { timestamp: "desc" },
    });

    return list.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));
  },

  async requestDataErasure(
    userId: string,
    email: string,
    details: string,
  ): Promise<DataErasureRecord> {
    const id = "erasure-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const requestedAt = new Date();
    const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

    const created = await prisma.dataErasureRequests.create({
      data: {
        id,
        userId,
        userEmail: hashedEmail,
        requestedAt,
        status: "PENDING",
        erasedRecordsCount: 0,
        completedAt: null,
        details,
      },
    });

    await auditRepository.logAudit(
      "DATA_ERASURE_REQUESTED",
      `Permintaan penghapusan data diajukan oleh subject ID ${userId}`,
      userId,
    );

    return {
      ...created,
      requestedAt: created.requestedAt.toISOString(),
      completedAt: created.completedAt?.toISOString() || undefined,
      status: created.status as any,
    };
  },

  async getErasureStatus(userId: string): Promise<DataErasureRecord[]> {
    const list = await prisma.dataErasureRequests.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
    });

    return list.map((e) => ({
      ...e,
      requestedAt: e.requestedAt.toISOString(),
      completedAt: e.completedAt?.toISOString() || undefined,
      status: e.status as any,
    }));
  },
};
