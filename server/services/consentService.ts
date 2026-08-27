import { prisma } from '../database.js';

export interface UserConsentDTO {
  userId: string;
  consentForAI: boolean;
  consentForAIMood: boolean;
  consentForAIScreening: boolean;
  consentForAIMemory: boolean;
  consentForAIJournal: boolean;
  consentForEmergencySOS: boolean;
  consentForCounselorSummary: boolean;
  consentForCounselorSharing: boolean;
  consentForTelemetry: boolean;
  consentForAnalytics: boolean;
  consentVersion: string;
  policyVersion: string;
  consentTimestamp?: string;
  grantedAt?: string;
  withdrawnAt?: string;
  retentionDays: number;
  updatedAt: string;
}

export class ConsentService {
  /**
   * Get canonical user consents from database.
   * STRICT OPT-IN: If no consent is recorded, all flags default to FALSE.
   */
  async getUserConsents(userId: string): Promise<UserConsentDTO> {
    if (!userId || userId === 'guest') {
      return this.getDefaultConsents(userId || 'guest');
    }

    const consent = await prisma.userConsents.findUnique({
      where: { userId }
    });

    if (!consent) {
      return this.getDefaultConsents(userId);
    }

    return {
      userId: consent.userId,
      consentForAI: Boolean(consent.consentForAI),
      consentForAIMood: Boolean(consent.consentForAIMood),
      consentForAIScreening: Boolean(consent.consentForAIScreening),
      consentForAIMemory: Boolean(consent.consentForAIMemory),
      consentForAIJournal: Boolean(consent.consentForAIJournal),
      consentForEmergencySOS: Boolean(consent.consentForEmergencySOS),
      consentForCounselorSummary: Boolean(consent.consentForCounselorSummary),
      consentForCounselorSharing: Boolean(consent.consentForCounselorSharing),
      consentForTelemetry: Boolean(consent.consentForTelemetry),
      consentForAnalytics: Boolean(consent.consentForAnalytics),
      consentVersion: consent.consentVersion || 'v1.3-2026',
      policyVersion: consent.policyVersion || 'v2.0-PDP-2026',
      consentTimestamp: consent.consentTimestamp ? consent.consentTimestamp.toISOString() : undefined,
      grantedAt: consent.grantedAt ? consent.grantedAt.toISOString() : undefined,
      withdrawnAt: consent.withdrawnAt ? consent.withdrawnAt.toISOString() : undefined,
      retentionDays: consent.retentionDays ?? 90,
      updatedAt: consent.updatedAt ? consent.updatedAt.toISOString() : new Date().toISOString()
    };
  }

  /**
   * Check if core AI processing is allowed
   */
  async canUseAI(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAI;
  }

  /**
   * Check if mood logs can be accessed by AI
   */
  async canUseMoodForAI(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAI && c.consentForAIMood;
  }

  /**
   * Check if screening results can be accessed by AI
   */
  async canUseScreeningForAI(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAI && c.consentForAIScreening;
  }

  /**
   * Check if conversational memories can be stored and used by AI
   */
  async canUseMemoriesForAI(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAI && c.consentForAIMemory;
  }

  /**
   * Check if self-care / journal progress can be used by AI
   */
  async canUseJournalForAI(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAI && c.consentForAIJournal;
  }

  /**
   * Check if mental health progress can be shared with campus counselors
   */
  async canShareWithCounselor(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForCounselorSharing || c.consentForCounselorSummary;
  }

  /**
   * Check if emergency contacts / crisis triage notifications are permitted
   */
  async canUseEmergencySOS(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForEmergencySOS;
  }

  /**
   * Check if anonymous telemetry is permitted
   */
  async canUseTelemetry(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForTelemetry;
  }

  /**
   * Check if analytics tracking is permitted
   */
  async canUseAnalytics(userId: string): Promise<boolean> {
    const c = await this.getUserConsents(userId);
    return c.consentForAnalytics;
  }

  /**
   * Update granular user consents in canonical database.
   * If AI Memory is disabled or revoked, purge existing memories immediately.
   */
  async updateConsents(
    userId: string,
    updates: Partial<{
      consentForAI: boolean;
      consentForAIMood: boolean;
      consentForAIScreening: boolean;
      consentForAIMemory: boolean;
      consentForAIJournal: boolean;
      consentForEmergencySOS: boolean;
      consentForCounselorSummary: boolean;
      consentForCounselorSharing: boolean;
      consentForTelemetry: boolean;
      consentForAnalytics: boolean;
      retentionDays: number;
    }>
  ): Promise<UserConsentDTO> {
    const current = await this.getUserConsents(userId);

    const isAnyGranted = Object.entries(updates)
      .filter(([k]) => k.startsWith('consentFor'))
      .some(([_, v]) => v === true);

    const consentKeys = Object.entries(updates).filter(([k]) => k.startsWith('consentFor'));
    const isAllRevoked = consentKeys.length > 0 && consentKeys.every(([_, v]) => v === false);

    const now = new Date();
    const grantedAt = isAnyGranted ? now : current.grantedAt ? new Date(current.grantedAt) : null;
    const withdrawnAt = isAllRevoked ? now : current.withdrawnAt ? new Date(current.withdrawnAt) : null;

    // Determine new memory flag
    const newAiConsent = updates.consentForAI !== undefined ? updates.consentForAI : current.consentForAI;
    const newMemoryConsent = updates.consentForAIMemory !== undefined ? updates.consentForAIMemory : current.consentForAIMemory;

    // If AI Memory consent was turned off, delete all stored AI memories for this user
    if ((!newAiConsent || !newMemoryConsent) && (current.consentForAI && current.consentForAIMemory)) {
      await prisma.userMemories.deleteMany({
        where: { userId }
      });
    }

    const saved = await prisma.userConsents.upsert({
      where: { userId },
      update: {
        consentForAI: newAiConsent,
        consentForAIMood: updates.consentForAIMood !== undefined ? updates.consentForAIMood : current.consentForAIMood,
        consentForAIScreening: updates.consentForAIScreening !== undefined ? updates.consentForAIScreening : current.consentForAIScreening,
        consentForAIMemory: newMemoryConsent,
        consentForAIJournal: updates.consentForAIJournal !== undefined ? updates.consentForAIJournal : current.consentForAIJournal,
        consentForEmergencySOS: updates.consentForEmergencySOS !== undefined ? updates.consentForEmergencySOS : current.consentForEmergencySOS,
        consentForCounselorSummary: updates.consentForCounselorSummary !== undefined ? updates.consentForCounselorSummary : current.consentForCounselorSummary,
        consentForCounselorSharing: updates.consentForCounselorSharing !== undefined ? updates.consentForCounselorSharing : current.consentForCounselorSharing,
        consentForTelemetry: updates.consentForTelemetry !== undefined ? updates.consentForTelemetry : current.consentForTelemetry,
        consentForAnalytics: updates.consentForAnalytics !== undefined ? updates.consentForAnalytics : current.consentForAnalytics,
        retentionDays: updates.retentionDays !== undefined ? updates.retentionDays : current.retentionDays,
        consentVersion: 'v1.3-2026',
        policyVersion: 'v2.0-PDP-2026',
        consentTimestamp: now,
        grantedAt,
        withdrawnAt,
        updatedAt: now
      },
      create: {
        userId,
        consentForAI: newAiConsent,
        consentForAIMood: updates.consentForAIMood ?? false,
        consentForAIScreening: updates.consentForAIScreening ?? false,
        consentForAIMemory: newMemoryConsent,
        consentForAIJournal: updates.consentForAIJournal ?? false,
        consentForEmergencySOS: updates.consentForEmergencySOS ?? false,
        consentForCounselorSummary: updates.consentForCounselorSummary !== undefined ? updates.consentForCounselorSummary : false,
        consentForCounselorSharing: updates.consentForCounselorSharing !== undefined ? updates.consentForCounselorSharing : false,
        consentForTelemetry: updates.consentForTelemetry ?? false,
        consentForAnalytics: updates.consentForAnalytics ?? false,
        retentionDays: updates.retentionDays ?? 90,
        consentVersion: 'v1.3-2026',
        policyVersion: 'v2.0-PDP-2026',
        consentTimestamp: now,
        grantedAt,
        withdrawnAt,
        updatedAt: now
      }
    });

    return {
      userId: saved.userId,
      consentForAI: Boolean(saved.consentForAI),
      consentForAIMood: Boolean(saved.consentForAIMood),
      consentForAIScreening: Boolean(saved.consentForAIScreening),
      consentForAIMemory: Boolean(saved.consentForAIMemory),
      consentForAIJournal: Boolean(saved.consentForAIJournal),
      consentForEmergencySOS: Boolean(saved.consentForEmergencySOS),
      consentForCounselorSummary: Boolean(saved.consentForCounselorSummary),
      consentForCounselorSharing: Boolean(saved.consentForCounselorSharing),
      consentForTelemetry: Boolean(saved.consentForTelemetry),
      consentForAnalytics: Boolean(saved.consentForAnalytics),
      consentVersion: saved.consentVersion,
      policyVersion: saved.policyVersion,
      consentTimestamp: saved.consentTimestamp?.toISOString(),
      grantedAt: saved.grantedAt?.toISOString(),
      withdrawnAt: saved.withdrawnAt?.toISOString(),
      retentionDays: saved.retentionDays,
      updatedAt: saved.updatedAt.toISOString()
    };
  }

  /**
   * Revoke all consents and clear any associated AI memories
   */
  async revokeAllConsents(userId: string): Promise<UserConsentDTO> {
    await prisma.userMemories.deleteMany({
      where: { userId }
    });

    return this.updateConsents(userId, {
      consentForAI: false,
      consentForAIMood: false,
      consentForAIScreening: false,
      consentForAIMemory: false,
      consentForAIJournal: false,
      consentForEmergencySOS: false,
      consentForCounselorSummary: false,
      consentForCounselorSharing: false,
      consentForTelemetry: false,
      consentForAnalytics: false
    });
  }

  /**
   * Strict Opt-In Default Representation
   */
  private getDefaultConsents(userId: string): UserConsentDTO {
    return {
      userId,
      consentForAI: false,
      consentForAIMood: false,
      consentForAIScreening: false,
      consentForAIMemory: false,
      consentForAIJournal: false,
      consentForEmergencySOS: false,
      consentForCounselorSummary: false,
      consentForCounselorSharing: false,
      consentForTelemetry: false,
      consentForAnalytics: false,
      consentVersion: 'v1.3-2026',
      policyVersion: 'v2.0-PDP-2026',
      retentionDays: 90,
      updatedAt: new Date().toISOString()
    };
  }
}

export const consentService = new ConsentService();
