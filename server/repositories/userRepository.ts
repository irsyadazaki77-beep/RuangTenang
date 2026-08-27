import { prisma } from "../database";
import { UserRecord, ActiveSession, LoginHistoryEntry, SecurityNotification } from "../database";
import { auditRepository } from "./auditRepository";
import crypto from "crypto";

const HARD_MAX_PAGE_SIZE = 100;

export async function migrateLegacyUserDataIfNeeded(user: any): Promise<void> {
  // 1. Sessions migration
  if (user.activeSessions && user.activeSessions !== "[]") {
    try {
      const parsedSessions = JSON.parse(user.activeSessions);
      if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
        for (const session of parsedSessions) {
          if (!session.sessionId) continue;
          const exists = await prisma.userSession.findUnique({
            where: { id: session.sessionId },
          });
          if (!exists) {
            await prisma.userSession.create({
              data: {
                id: session.sessionId,
                userId: user.id,
                device: session.device || "Unknown",
                ip: session.ip || session.ipAddress || "127.0.0.1",
                userAgent: session.userAgent || "Unknown",
                createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
                lastActive: session.lastActive ? new Date(session.lastActive) : new Date(),
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("[MIGRATION_ERROR] activeSessions migration failed:", e);
    }
  }

  // 2. Login history migration
  if (user.loginHistory && user.loginHistory !== "[]") {
    try {
      const parsedHistory = JSON.parse(user.loginHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        for (const event of parsedHistory) {
          if (!event.id) continue;
          const exists = await prisma.loginEvent.findUnique({
            where: { id: event.id },
          });
          if (!exists) {
            await prisma.loginEvent.create({
              data: {
                id: event.id,
                userId: user.id,
                timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
                ip: event.ip || "127.0.0.1",
                userAgent: event.userAgent || "Unknown",
                status: event.status || "SUCCESS",
                location: event.location || null,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("[MIGRATION_ERROR] loginHistory migration failed:", e);
    }
  }

  // 3. Security notifications migration
  if (user.securityNotifications && user.securityNotifications !== "[]") {
    try {
      const parsedNotifs = JSON.parse(user.securityNotifications);
      if (Array.isArray(parsedNotifs) && parsedNotifs.length > 0) {
        for (const notif of parsedNotifs) {
          if (!notif.id) continue;
          const exists = await prisma.securityNotification.findUnique({
            where: { id: notif.id },
          });
          if (!exists) {
            await prisma.securityNotification.create({
              data: {
                id: notif.id,
                userId: user.id,
                title: notif.title || "Security Notification",
                message: notif.message || "",
                timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
                read: notif.read || false,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("[MIGRATION_ERROR] securityNotifications migration failed:", e);
    }
  }

  // Clear legacy fields to complete migration
  if (
    (user.activeSessions && user.activeSessions !== "[]") ||
    (user.loginHistory && user.loginHistory !== "[]") ||
    (user.securityNotifications && user.securityNotifications !== "[]")
  ) {
    try {
      await prisma.users.update({
        where: { id: user.id },
        data: {
          activeSessions: "[]",
          loginHistory: "[]",
          securityNotifications: "[]",
        },
      });
    } catch (e) {
      console.error("[MIGRATION_ERROR] Clearing legacy fields failed:", e);
    }
  }
}

export async function mapUserToRecord(u: any): Promise<UserRecord> {
  // Live migration if legacy data is present
  if (
    (u.activeSessions && u.activeSessions !== "[]") ||
    (u.loginHistory && u.loginHistory !== "[]") ||
    (u.securityNotifications && u.securityNotifications !== "[]")
  ) {
    await migrateLegacyUserDataIfNeeded(u);
  }

  const sessions = await prisma.userSession.findMany({
    where: { userId: u.id },
    orderBy: { lastActive: "desc" },
  });

  const loginEvents = await prisma.loginEvent.findMany({
    where: { userId: u.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const notifications = await prisma.securityNotification.findMany({
    where: { userId: u.id },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role as any,
    tier: u.tier as any,
    university: u.university,
    createdAt: u.createdAt.toISOString(),
    emailVerified: u.emailVerified,
    emailVerificationCode: u.emailVerificationCode || undefined,
    emailVerificationExpires: u.emailVerificationExpires?.toISOString() || undefined,
    passwordResetToken: u.passwordResetToken || undefined,
    passwordResetExpires: u.passwordResetExpires?.toISOString() || undefined,
    failedLoginAttempts: u.failedLoginAttempts,
    lockUntil: u.lockUntil?.toISOString() || undefined,
    mfaEnabled: u.mfaEnabled,
    mfaCode: u.mfaCode || undefined,
    mfaExpires: u.mfaExpires?.toISOString() || undefined,
    mfaToken: u.mfaToken || undefined,
    activeSessions: sessions.map(s => ({
      sessionId: s.id,
      device: s.device,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastActive: s.lastActive.toISOString(),
    })),
    loginHistory: loginEvents.map(e => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      ip: e.ip,
      userAgent: e.userAgent,
      status: e.status as any,
      location: e.location || undefined,
    })),
    securityNotifications: notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp.toISOString(),
      read: n.read,
    })),
  };
}

export const userRepository = {
  async getUsers(limit = 100, offset = 0): Promise<UserRecord[]> {
    const take = Math.min(limit, HARD_MAX_PAGE_SIZE);
    const list = await prisma.users.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip: offset,
    });
    
    const records: UserRecord[] = [];
    for (const u of list) {
      records.push(await mapUserToRecord(u));
    }
    return records;
  },

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const u = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return u ? mapUserToRecord(u) : null;
  },

  async getUserById(id: string): Promise<UserRecord | null> {
    const u = await prisma.users.findUnique({ where: { id } });
    return u ? mapUserToRecord(u) : null;
  },

  async addUser(user: Omit<UserRecord, "id" | "createdAt">): Promise<UserRecord> {
    const id = "usr-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const created = await prisma.users.create({
      data: {
        id,
        name: user.name,
        email: user.email.toLowerCase().trim(),
        passwordHash: user.passwordHash,
        role: user.role,
        tier: user.tier || "Free",
        university: user.university || "Universitas Indonesia",
        emailVerified: user.emailVerified ?? false,
        mfaEnabled: user.mfaEnabled ?? false,
      },
    });

    await auditRepository.logAudit(
      "USER_REGISTERED",
      `Pengguna baru terdaftar: ${user.name} (${user.email}) dengan peran ${user.role}`,
      id,
    );
    return mapUserToRecord(created);
  },

  async updateUserTier(id: string, tier: "Free" | "Pro" | "Developer"): Promise<UserRecord | null> {
    const updated = await prisma.users.update({
      where: { id },
      data: { tier },
    });
    await auditRepository.logAudit(
      "UPGRADE_TIER",
      `Pengguna ID ${id} meningkatkan tier menjadi ${tier}`,
    );
    return mapUserToRecord(updated);
  },

  async updateUserProfileDetails(
    userId: string,
    updates: { name?: string; university?: string; email?: string },
  ): Promise<UserRecord | null> {
    const current = await prisma.users.findUnique({ where: { id: userId } });
    if (!current) return null;

    const updated = await prisma.users.update({
      where: { id: userId },
      data: {
        name: updates.name,
        university: updates.university,
        email: updates.email,
      },
    });

    await auditRepository.logAudit(
      "KOREKSI_DATA_PRIBADI",
      `Koreksi data pribadi diperbarui untuk user ID ${userId}`,
      userId,
    );
    return mapUserToRecord(updated);
  },

  async getUserCount(): Promise<number> {
    return await prisma.users.count();
  },
};
