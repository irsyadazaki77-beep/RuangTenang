import { prisma } from "../database";
import { ActiveSession, LoginHistoryEntry, SecurityNotification, UserRecord } from "../database";
import { mapUserToRecord, migrateLegacyUserDataIfNeeded } from "./userRepository";
import { auditRepository } from "./auditRepository";
import crypto from "crypto";

export const authRepository = {
  // Active Sessions & Revocation
  async addActiveSession(userId: string, session: ActiveSession): Promise<void> {
    const hashedSessionId = crypto.createHash('sha256').update(session.sessionId).digest('hex');
    
    await prisma.userSession.upsert({
      where: { id: hashedSessionId },
      update: {
        device: session.device,
        ip: session.ip,
        userAgent: session.userAgent,
        lastActive: new Date(),
      },
      create: {
        id: hashedSessionId,
        userId,
        device: session.device,
        ip: session.ip,
        userAgent: session.userAgent,
        createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
        lastActive: new Date(),
      },
    });

    // Enforce max 10 sessions per user
    const userSessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActive: "desc" },
    });

    if (userSessions.length > 10) {
      const obsolete = userSessions.slice(10);
      await prisma.userSession.deleteMany({
        where: { id: { in: obsolete.map(s => s.id) } },
      });
    }
  },

  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    let sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActive: "desc" },
    });

    if (sessions.length === 0) {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (user && user.activeSessions && user.activeSessions !== "[]") {
        await migrateLegacyUserDataIfNeeded(user);
        sessions = await prisma.userSession.findMany({
          where: { userId },
          orderBy: { lastActive: "desc" },
        });
      }
    }

    return sessions.map(s => ({
      sessionId: s.id,
      device: s.device,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastActive: s.lastActive.toISOString(),
    }));
  },

  async removeActiveSession(userId: string, sessionId: string): Promise<void> {
    const hashedId = crypto.createHash('sha256').update(sessionId).digest('hex');
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (user && user.activeSessions && user.activeSessions !== "[]") {
      await migrateLegacyUserDataIfNeeded(user);
    }
    
    await prisma.userSession.deleteMany({
      where: {
        userId,
        OR: [
          { id: sessionId },
          { id: hashedId },
        ],
      },
    });
  },

  async removeAllActiveSessions(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.userSession.deleteMany({
        where: { userId },
      });
      await tx.users.update({
        where: { id: userId },
        data: { activeSessions: "[]" }
      });
    });
  },

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const hashedId = crypto.createHash('sha256').update(sessionId).digest('hex');
    const count = await prisma.userSession.count({
      where: {
        userId,
        OR: [
          { id: sessionId },
          { id: hashedId },
        ],
      },
    });
    if (count > 0) return true;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (user && user.activeSessions && user.activeSessions !== "[]") {
      try {
        const parsed = JSON.parse(user.activeSessions);
        if (Array.isArray(parsed)) {
          const match = parsed.find(s => s.sessionId === sessionId || s.sessionId === hashedId);
          if (match) {
            await migrateLegacyUserDataIfNeeded(user);
            return true;
          }
        }
      } catch (e) {
        console.error("isSessionActive fallback migration failed:", e);
      }
    }
    return false;
  },

  // Login History & Security Logs
  async recordLoginHistory(
    userId: string,
    entry: Omit<LoginHistoryEntry, "id" | "timestamp">,
  ): Promise<LoginHistoryEntry> {
    const id = "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.loginEvent.create({
      data: {
        id,
        userId,
        timestamp,
        ip: entry.ip,
        userAgent: entry.userAgent,
        status: entry.status,
        location: entry.location || null,
      },
    });

    // Prune history to keep only latest 50 events per user
    const historyCount = await prisma.loginEvent.count({ where: { userId } });
    if (historyCount > 50) {
      const excess = historyCount - 50;
      const oldest = await prisma.loginEvent.findMany({
        where: { userId },
        orderBy: { timestamp: "asc" },
        take: excess,
      });
      await prisma.loginEvent.deleteMany({
        where: { id: { in: oldest.map(e => e.id) } },
      });
    }

    return {
      id: created.id,
      timestamp: created.timestamp.toISOString(),
      ip: created.ip,
      userAgent: created.userAgent,
      status: created.status as any,
      location: created.location || undefined,
    };
  },

  async getLoginHistory(userId: string): Promise<LoginHistoryEntry[]> {
    let list = await prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    if (list.length === 0) {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (user && user.loginHistory && user.loginHistory !== "[]") {
        await migrateLegacyUserDataIfNeeded(user);
        list = await prisma.loginEvent.findMany({
          where: { userId },
          orderBy: { timestamp: "desc" },
          take: 50,
        });
      }
    }

    return list.map(e => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      ip: e.ip,
      userAgent: e.userAgent,
      status: e.status as any,
      location: e.location || undefined,
    }));
  },

  // Account Lockout & Failed Attempt Rate Limiting
  async recordFailedAttempt(
    userIdOrEmail: string,
  ): Promise<{
    failedAttempts: number;
    isLocked: boolean;
    lockUntil?: string;
  }> {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: userIdOrEmail.toLowerCase().trim() },
          { id: userIdOrEmail },
        ],
      },
    });

    if (!user) return { failedAttempts: 0, isLocked: false };

    const failedAttempts = user.failedLoginAttempts + 1;
    let isLocked = false;
    let lockUntil: string | undefined = undefined;
    let lockUntilDate: Date | null = null;

    if (failedAttempts >= 5) {
      const lockMs = 15 * 60 * 1000;
      lockUntilDate = new Date(Date.now() + lockMs);
      isLocked = true;
      lockUntil = lockUntilDate.toISOString();
      await auditRepository.logAudit(
        "ACCOUNT_LOCKED",
        `Akun ${user.email} dikunci sementara selama 15 menit akibat 5x kesalahan kata sandi.`,
        user.id,
      );
    }

    await prisma.users.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockUntil: lockUntilDate,
      },
    });

    return { failedAttempts, isLocked, lockUntil };
  },

  async resetFailedAttempts(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });
  },

  isAccountLocked(user: any): { locked: boolean; lockUntil?: string } {
    if (user.lockUntil) {
      const lockTime = new Date(user.lockUntil).getTime();
      if (Date.now() < lockTime) {
        return {
          locked: true,
          lockUntil:
            typeof user.lockUntil === "string"
              ? user.lockUntil
              : user.lockUntil.toISOString(),
        };
      }
    }
    return { locked: false };
  },

  // Email Verification
  async setEmailVerificationCode(userId: string, code: string): Promise<void> {
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    await prisma.users.update({
      where: { id: userId },
      data: {
        emailVerificationCode: hashedCode,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  },

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return false;

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < Date.now()) {
      return false;
    }

    const hashedInput = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (user.emailVerificationCode === hashedInput) {
      await prisma.users.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpires: null,
        },
      });
      await auditRepository.logAudit(
        "EMAIL_VERIFIED",
        `Email ${user.email} berhasil diverifikasi.`,
        user.id,
      );
      return true;
    }
    return false;
  },

  // Password Reset Token (Single Use)
  async setPasswordResetToken(email: string, token: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) return false;

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    await prisma.users.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    await auditRepository.logAudit(
      "PASSWORD_RESET_REQUESTED",
      `Token reset kata sandi dibuat untuk ${user.email}`,
      user.id,
    );
    return true;
  },

  async resetPasswordWithToken(
    token: string,
    newPasswordHash: string,
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await prisma.users.findFirst({
      where: { passwordResetToken: hashedToken },
    });

    if (!user) {
      return {
        success: false,
        message: "Token reset kata sandi tidak ditemukan atau sudah tidak berlaku.",
      };
    }

    if (
      user.passwordResetExpires &&
      new Date(user.passwordResetExpires).getTime() < Date.now()
    ) {
      return {
        success: false,
        message: "Token reset kata sandi sudah kadaluwarsa. Silakan minta token baru.",
      };
    }

    await prisma.users.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    await auditRepository.logAudit(
      "PASSWORD_RESET_SUCCESS",
      `Kata sandi diperbarui melalui token reset untuk ${user.email}. Seluruh sesi dicabut.`,
      user.id,
    );
    return {
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan masuk kembali.",
      userId: user.id,
    };
  },

  // MFA (Multi-Factor Authentication) with Hashed Storage & Replay Prevention
  async setMfaCode(
    userId: string,
    code: string,
    mfaToken: string,
  ): Promise<void> {
    const hashedCode = crypto.createHash('sha256').update(code.trim()).digest('hex');
    const hashedToken = crypto.createHash('sha256').update(mfaToken.trim()).digest('hex');

    await prisma.users.update({
      where: { id: userId },
      data: {
        mfaCode: hashedCode,
        mfaToken: hashedToken,
        mfaExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minute expiry
      },
    });
  },

  async verifyMfaCode(
    mfaToken: string,
    code: string,
  ): Promise<UserRecord | null> {
    const trimmedToken = mfaToken.trim();
    const trimmedCode = code.trim();
    const hashedToken = crypto.createHash('sha256').update(trimmedToken).digest('hex');

    const user = await prisma.users.findFirst({
      where: { mfaToken: hashedToken },
    });
    if (!user) return null;

    // Check expiration
    if (user.mfaExpires && new Date(user.mfaExpires).getTime() < Date.now()) {
      // Invalidate expired challenge
      await prisma.users.update({
        where: { id: user.id },
        data: { mfaCode: null, mfaToken: null, mfaExpires: null },
      });
      return null;
    }

    if (!user.mfaCode) return null;

    // Constant-time timing-safe comparison on hash
    const hashedInput = crypto.createHash('sha256').update(trimmedCode).digest('hex');
    let isMatch = false;

    if (user.mfaCode.length === 64) {
      const inputBuf = Buffer.from(hashedInput, 'utf-8');
      const storedBuf = Buffer.from(user.mfaCode, 'utf-8');
      isMatch = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);
    }

    if (isMatch) {
      // One-time consumption: immediately destroy MFA secrets
      const updated = await prisma.users.update({
        where: { id: user.id },
        data: {
          mfaCode: null,
          mfaToken: null,
          mfaExpires: null,
          failedLoginAttempts: 0,
        },
      });

      await auditRepository.logAudit(
        "MFA_VERIFIED",
        `Autentikasi Multi-Faktor (MFA) berhasil untuk user ID ${user.id}`,
        user.id,
      );
      return mapUserToRecord(updated);
    } else {
      // Failed attempt on MFA: track and limit to max 3 attempts
      const newFailed = (user.failedLoginAttempts || 0) + 1;
      if (newFailed >= 3) {
        // Invalidate MFA challenge to prevent brute force
        await prisma.users.update({
          where: { id: user.id },
          data: {
            mfaCode: null,
            mfaToken: null,
            mfaExpires: null,
            failedLoginAttempts: newFailed,
          },
        });
      } else {
        await prisma.users.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newFailed },
        });
      }
      return null;
    }
  },

  // Security Notifications
  async addSecurityNotification(
    userId: string,
    title: string,
    message: string,
  ): Promise<SecurityNotification> {
    const id = "secnotif-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.securityNotification.create({
      data: {
        id,
        userId,
        title,
        message,
        timestamp,
        read: false,
      },
    });

    // Prune security notifications to keep only latest 20 per user
    const notificationsCount = await prisma.securityNotification.count({ where: { userId } });
    if (notificationsCount > 20) {
      const excess = notificationsCount - 20;
      const oldest = await prisma.securityNotification.findMany({
        where: { userId },
        orderBy: { timestamp: "asc" },
        take: excess,
      });
      await prisma.securityNotification.deleteMany({
        where: { id: { in: oldest.map(n => n.id) } },
      });
    }

    return {
      id: created.id,
      title: created.title,
      message: created.message,
      timestamp: created.timestamp.toISOString(),
      read: created.read,
    };
  },

  async getSecurityNotifications(userId: string): Promise<SecurityNotification[]> {
    let list = await prisma.securityNotification.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    if (list.length === 0) {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (user && user.securityNotifications && user.securityNotifications !== "[]") {
        await migrateLegacyUserDataIfNeeded(user);
        list = await prisma.securityNotification.findMany({
          where: { userId },
          orderBy: { timestamp: "desc" },
          take: 20,
        });
      }
    }

    return list.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp.toISOString(),
      read: n.read,
    }));
  },

  // Profile Security Updates
  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.users.update({
          where: { id: userId },
          data: {
            passwordHash: newPasswordHash,
            activeSessions: "[]",
          },
        });

        await tx.userSession.deleteMany({
          where: { userId },
        });
      });

      await this.addSecurityNotification(
        userId,
        "🔑 Kata Sandi Diperbarui",
        "Kata sandi akun Anda baru saja diperbarui. Seluruh sesi aktif telah dicabut.",
      );
      await auditRepository.logAudit(
        "UPDATE_PASSWORD",
        `Pengguna ID ${userId} memperbarui kata sandi akun.`,
        userId,
      );
      return true;
    } catch {
      return false;
    }
  },

  async updateUserEmail(userId: string, newEmail: string): Promise<boolean> {
    try {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) return false;

      const oldEmail = user.email;
      await prisma.users.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerified: false,
        },
      });

      await this.addSecurityNotification(
        userId,
        "📧 Email Diubah",
        `Email akun Anda telah diubah dari ${oldEmail} menjadi ${newEmail}. Silakan verifikasi email baru Anda.`,
      );
      await auditRepository.logAudit(
        "UPDATE_EMAIL",
        `Pengguna ID ${userId} mengubah email dari ${oldEmail} ke ${newEmail}`,
        userId,
      );
      return true;
    } catch {
      return false;
    }
  },
};
