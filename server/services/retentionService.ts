import crypto from 'crypto';
import { prisma } from '../database.js';

export interface RetentionCleanupResult {
  success: boolean;
  totalCleaned: number;
  moodLogsDeleted: number;
  screeningsDeleted: number;
  appointmentsDeleted: number;
  chatsDeleted: number;
  temporaryChatsDeleted: number;
  timestamp: string;
}

import { encryptionService } from './encryptionService.js';

export class RetentionService {
  /**
   * Run automated data retention cleanup strictly based on user-configured policies.
   */
  async runRetentionCleanup(): Promise<RetentionCleanupResult> {
    const allConsents = await prisma.userConsents.findMany();
    let moodLogsDeleted = 0;
    let screeningsDeleted = 0;
    let appointmentsDeleted = 0;
    let chatsDeleted = 0;

    for (const c of allConsents) {
      const retentionDays = c.retentionDays;
      // 0 means indefinite / manual right to be forgotten
      if (!retentionDays || retentionDays <= 0) {
        continue;
      }

      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const userId = c.userId;

      // 1. Mood Logs
      const deletedMoods = await prisma.moodLogs.deleteMany({
        where: {
          userId,
          timestamp: { lt: cutoff }
        }
      });
      moodLogsDeleted += deletedMoods.count;

      // 2. Screenings
      const deletedScreens = await prisma.screenings.deleteMany({
        where: {
          userId,
          timestamp: { lt: cutoff }
        }
      });
      screeningsDeleted += deletedScreens.count;

      // 3. Appointments (Finished or Cancelled)
      const deletedAppts = await prisma.appointments.deleteMany({
        where: {
          userId,
          createdAt: { lt: cutoff },
          status: { in: ['COMPLETED', 'CANCELLED', 'REJECTED'] }
        }
      });
      appointmentsDeleted += deletedAppts.count;

      // 4. Chats & Messages
      const oldChats = await prisma.chats.findMany({
        where: {
          userId,
          updatedAt: { lt: cutoff }
        },
        select: { id: true }
      });

      if (oldChats.length > 0) {
        const oldChatIds = oldChats.map((ch) => ch.id);
        await prisma.chatMessages.deleteMany({
          where: { chatId: { in: oldChatIds } }
        });
        const deletedCh = await prisma.chats.deleteMany({
          where: { id: { in: oldChatIds } }
        });
        chatsDeleted += deletedCh.count;
      }
    }

    // 5. Cleanup temporary / guest chats older than 24 hours
    const guestCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldGuestChats = await prisma.chats.findMany({
      where: {
        userId: 'guest',
        createdAt: { lt: guestCutoff }
      },
      select: { id: true }
    });

    let temporaryChatsDeleted = 0;
    if (oldGuestChats.length > 0) {
      const guestIds = oldGuestChats.map((g) => g.id);
      await prisma.chatMessages.deleteMany({
        where: { chatId: { in: guestIds } }
      });
      const delGuest = await prisma.chats.deleteMany({
        where: { id: { in: guestIds } }
      });
      temporaryChatsDeleted = delGuest.count;
    }

    // 6. Cleanup expired password reset & MFA codes from user records
    try {
      await prisma.users.updateMany({
        where: {
          passwordResetExpires: { lt: new Date() }
        },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      await prisma.users.updateMany({
        where: {
          mfaExpires: { lt: new Date() }
        },
        data: {
          mfaCode: null,
          mfaToken: null,
          mfaExpires: null
        }
      });
    } catch {
      // Non-blocking
    }

    const totalCleaned = moodLogsDeleted + screeningsDeleted + appointmentsDeleted + chatsDeleted + temporaryChatsDeleted;

    return {
      success: true,
      totalCleaned,
      moodLogsDeleted,
      screeningsDeleted,
      appointmentsDeleted,
      chatsDeleted,
      temporaryChatsDeleted,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute Right to be Forgotten (Full Account & Personal Data Deletion) in an ACID Transaction.
   * Completely idempotent.
   */
  async eraseUserData(
    userId: string,
    requestedByName?: string
  ): Promise<{ success: boolean; erasedRecordsCount: number; timestamp: string }> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({ where: { id: userId } });
      const userEmail = user?.email || 'anonymized';
      let count = 0;

      // 1. Chat Messages and Chats
      const userChats = await tx.chats.findMany({
        where: { userId },
        select: { id: true }
      });
      if (userChats.length > 0) {
        const chatIds = userChats.map((c) => c.id);
        const delMsgs = await tx.chatMessages.deleteMany({
          where: { chatId: { in: chatIds } }
        });
        count += delMsgs.count;
      }
      const delChats = await tx.chats.deleteMany({ where: { userId } });
      count += delChats.count;

      // 2. User AI Memories
      const delMemories = await tx.userMemories.deleteMany({ where: { userId } });
      count += delMemories.count;

      // 3. Mood Logs
      const delMoods = await tx.moodLogs.deleteMany({ where: { userId } });
      count += delMoods.count;

      // 4. Screenings
      const delScreenings = await tx.screenings.deleteMany({ where: { userId } });
      count += delScreenings.count;

      // 5. Appointments & Appointment Slots
      const userAppts = await tx.appointments.findMany({
        where: { userId },
        select: { id: true }
      });
      if (userAppts.length > 0) {
        const apptIds = userAppts.map(a => a.id);
        await tx.appointmentSlot.deleteMany({
          where: { appointmentId: { in: apptIds } }
        });
      }
      const delAppts = await tx.appointments.deleteMany({ where: { userId } });
      count += delAppts.count;

      // 6. Emergency Contacts
      const delContacts = await tx.emergencyContacts.deleteMany({ where: { userId } });
      count += delContacts.count;

      // 7. Program Progress
      const delProgress = await tx.programProgresses.deleteMany({ where: { userId } });
      count += delProgress.count;

      // 7b. User Sessions, Login Events, Security Notifications
      const delSessions = await tx.userSession.deleteMany({ where: { userId } });
      count += delSessions.count;
      const delLogins = await tx.loginEvent.deleteMany({ where: { userId } });
      count += delLogins.count;
      const delNotifs = await tx.securityNotification.deleteMany({ where: { userId } });
      count += delNotifs.count;

      // 8. Daily Usage Identifiers
      const delUsage = await tx.dailyUsages.deleteMany({
        where: {
          OR: [{ identifier: `user_${userId}` }, { identifier: `ip_${userId}` }]
        }
      });
      count += delUsage.count;

      // 9. Staff Access Logs
      const delStaffLogs = await tx.staffAccessLogs.deleteMany({
        where: { targetUserId: userId }
      });
      count += delStaffLogs.count;

      // 10. User Consents
      const delConsents = await tx.userConsents.deleteMany({ where: { userId } });
      count += delConsents.count;

      // 11. User Account Record
      const delUser = await tx.users.deleteMany({ where: { id: userId } });
      count += delUser.count;

      const now = new Date();
      const erasureId = `erasure-${Date.now()}`;
      const hashedEmail = userEmail ? crypto.createHash('sha256').update(userEmail).digest('hex') : 'anonymized';
      await tx.dataErasureRequests.create({
        data: {
          id: erasureId,
          userId,
          userEmail: hashedEmail,
          requestedAt: now,
          status: 'COMPLETED',
          erasedRecordsCount: count,
          completedAt: now,
          details: `Hak untuk Dilupakan (Right to be Forgotten) dieksekusi untuk ${userId} oleh ${requestedByName || 'Pengguna'}. Total ${count} item rekam jejak dibersihkan secara permanen.`
        }
      });

      return {
        success: true,
        erasedRecordsCount: count,
        timestamp: now.toISOString()
      };
    });
  }

  /**
   * Erase only user activities (chats, moods, screenings, memories) while keeping the user account.
   */
  async eraseUserActivityOnly(
    userId: string
  ): Promise<{ success: boolean; erasedRecordsCount: number; timestamp: string }> {
    return await prisma.$transaction(async (tx) => {
      let count = 0;

      const userChats = await tx.chats.findMany({
        where: { userId },
        select: { id: true }
      });
      if (userChats.length > 0) {
        const chatIds = userChats.map((c) => c.id);
        const delMsgs = await tx.chatMessages.deleteMany({
          where: { chatId: { in: chatIds } }
        });
        count += delMsgs.count;
      }
      const delChats = await tx.chats.deleteMany({ where: { userId } });
      count += delChats.count;

      const delMemories = await tx.userMemories.deleteMany({ where: { userId } });
      count += delMemories.count;

      const delMoods = await tx.moodLogs.deleteMany({ where: { userId } });
      count += delMoods.count;

      const delScreenings = await tx.screenings.deleteMany({ where: { userId } });
      count += delScreenings.count;

      const delProgress = await tx.programProgresses.deleteMany({ where: { userId } });
      count += delProgress.count;

      return {
        success: true,
        erasedRecordsCount: count,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Export all user data in standard structured machine-readable format.
   * Strips all internal security keys, password hashes, and tokens.
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const [
      user,
      consents,
      moods,
      screenings,
      appointments,
      chats,
      memories,
      emergencyContact,
      programProgress,
      staffAccessLogs
    ] = await Promise.all([
      prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          university: true,
          role: true,
          tier: true,
          emailVerified: true,
          mfaEnabled: true,
          createdAt: true
        }
      }),
      prisma.userConsents.findUnique({ where: { userId } }),
      prisma.moodLogs.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.screenings.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.appointments.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.chats.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              role: true,
              content: true,
              plugin: true,
              createdAt: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.userMemories.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.emergencyContacts.findUnique({
        where: { userId }
      }),
      prisma.programProgresses.findMany({
        where: { userId }
      }),
      prisma.staffAccessLogs.findMany({
        where: { targetUserId: userId },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    return {
      exportedAt: new Date().toISOString(),
      formatVersion: 'v2.0-GDPR-PDP',
      privacyCompliance: 'UU Perlindungan Data Pribadi (UU PDP No. 27/2022) & GDPR Art. 20',
      userProfile: user,
      consents: consents ? {
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
        consentTimestamp: consents.consentTimestamp,
        retentionDays: consents.retentionDays,
        updatedAt: consents.updatedAt
      } : null,
      moodLogs: moods.map((m) => ({
        id: m.id,
        mood: m.mood,
        notes: encryptionService.decryptSensitive(m.notes) || m.notes,
        intensity: m.intensity,
        factors: m.factors ? JSON.parse(m.factors) : null,
        timestamp: m.timestamp
      })),
      screenings: screenings.map((s) => ({
        id: s.id,
        phq9Score: s.phq9Score,
        gad7Score: s.gad7Score,
        phq9Severity: s.phq9Severity,
        gad7Severity: s.gad7Severity,
        item9Score: s.item9Score,
        hasSelfHarmRisk: s.hasSelfHarmRisk,
        status: s.status,
        timestamp: s.timestamp
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        counselorName: a.counselorName,
        date: a.date,
        time: a.time,
        mode: a.mode,
        status: a.status,
        approvalStatus: a.approvalStatus,
        notes: a.notes,
        createdAt: a.createdAt
      })),
      chats: chats.map((ch) => ({
        id: ch.id,
        title: encryptionService.decryptSensitive(ch.title) || ch.title,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt,
        messages: ch.messages.map((msg) => ({
          ...msg,
          content: encryptionService.decryptSensitive(msg.content) || msg.content
        }))
      })),
      aiMemories: memories.map((mem) => ({
        id: mem.id,
        content: encryptionService.decryptSensitive(mem.content) || mem.content,
        isActive: mem.isActive,
        createdAt: mem.createdAt
      })),
      emergencyContact: emergencyContact ? {
        name: encryptionService.decryptSensitive(emergencyContact.name) || emergencyContact.name,
        relationship: encryptionService.decryptSensitive(emergencyContact.relationship) || emergencyContact.relationship,
        phone: encryptionService.decryptSensitive(emergencyContact.phone) || emergencyContact.phone,
        whatsapp: emergencyContact.whatsapp ? (encryptionService.decryptSensitive(emergencyContact.whatsapp) || emergencyContact.whatsapp) : null,
        hasConsent: emergencyContact.hasConsent,
        consentDate: emergencyContact.consentDate
      } : null,
      programProgress,
      staffAccessLogs: staffAccessLogs.map((l) => ({
        staffName: l.staffName,
        staffRole: l.staffRole,
        accessType: l.accessType,
        purpose: l.purpose,
        timestamp: l.timestamp
      }))
    };
  }
}

export const retentionService = new RetentionService();
