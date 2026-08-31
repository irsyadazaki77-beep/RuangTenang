import { PrismaClient } from "@prisma/client";
import { userRepository } from "./repositories/userRepository";
import { authRepository } from "./repositories/authRepository";
import { appointmentRepository } from "./repositories/appointmentRepository";
import { screeningRepository } from "./repositories/screeningRepository";
import { moodRepository } from "./repositories/moodRepository";
import { privacyRepository } from "./repositories/privacyRepository";
import { auditRepository } from "./repositories/auditRepository";
import { counselorRepository } from "./repositories/counselorRepository";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Sanitized Query Logging Helper
function sanitizeQueryLog(query: string, params: string): { sanitizedQuery: string; sanitizedParams: string } {
  const sensitiveRegex = /(password|token|secret|notes|studentNIM|studentEmail|mfaCode)/i;
  let sanitizedQuery = query;
  let sanitizedParams = params;

  if (sensitiveRegex.test(params)) {
    sanitizedParams = '[REDACTED_SENSITIVE_PARAMS]';
  }
  if (sensitiveRegex.test(query)) {
    sanitizedQuery = query.replace(/(passwordHash\s*=\s*)'[^']+'/gi, '$1[REDACTED]');
  }

  return { sanitizedQuery, sanitizedParams };
}

// PostgreSQL connection pool tuning for Cloud Run / Docker containers
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.startsWith('postgres') && !databaseUrl.includes('connection_limit')) {
  const poolLimit = process.env.DB_POOL_SIZE || '15';
  const poolTimeout = process.env.DB_CONNECTION_TIMEOUT_SEC || '10';
  const joiner = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${joiner}connection_limit=${poolLimit}&pool_timeout=${poolTimeout}`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  ...(databaseUrl && databaseUrl.startsWith('postgres') ? { datasources: { db: { url: databaseUrl } } } : {}),
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

try {
  (prisma as any).$on?.('query', (e: any) => {
    const duration = e.duration;
    const { sanitizedQuery, sanitizedParams } = sanitizeQueryLog(e.query || '', e.params || '');
    if (duration > 200) {
      console.warn(`[SLOW_QUERY_WARN] (${duration}ms): ${sanitizedQuery} | params: ${sanitizedParams}`);
    } else if (process.env.NODE_ENV === 'development') {
      // console.log(`[PRISMA_QUERY] (${duration}ms): ${sanitizedQuery}`);
    }
  });
} catch {
  // Ignore query event listener setup error
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Database health check
export async function getDbHealth(): Promise<{ status: "healthy" | "unhealthy"; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy" };
  } catch (err: any) {
    return { status: "unhealthy", error: err?.message || String(err) };
  }
}

// ==========================================
// BACKWARDS-COMPATIBLE INTERFACE TYPES
// ==========================================

export interface ActiveSession {
  sessionId: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActive: string;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  status: "SUCCESS" | "FAILED" | "LOCKED" | "SUSPICIOUS_IP";
  location?: string;
}

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "mahasiswa" | "konselor" | "admin";
  tier: "Free" | "Pro" | "Developer";
  university: string;
  createdAt: string;
  emailVerified?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  failedLoginAttempts?: number;
  lockUntil?: string;
  mfaEnabled?: boolean;
  mfaCode?: string;
  mfaExpires?: string;
  mfaToken?: string;
  activeSessions?: ActiveSession[];
  loginHistory?: LoginHistoryEntry[];
  securityNotifications?: SecurityNotification[];
}

export interface MoodLogRecord {
  id: string;
  userId: string;
  mood: string;
  notes?: string;
  intensity?: number;
  factors?: string[];
  timestamp: string;
}

export interface AppointmentRecord {
  id: string;
  counselorId: string;
  counselorName: string;
  date: string;
  time: string;
  timezone?: "WIB" | "WITA" | "WIT";
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REJECTED" | "Selesai";
  approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  attendanceStatus:
    | "SCHEDULED" | "ATTENDED" | "NO_SHOW" | "CANCELLED" | "RESCHEDULED";
  meetingLink?: string;
  mode?: "video_call" | "tele_counseling" | "in_person" | "Virtual Video Call" | "Tele-Konseling" | "Tatap Muka / Offline";
  createdAt: string;
  userId?: string;
  studentName?: string;
  studentNIM?: string;
  studentEmail?: string;
}

export interface ScreeningRecord {
  id: string;
  phq9Score: number;
  gad7Score: number;
  phq9Severity: string;
  gad7Severity: string;
  item9Score?: number;
  hasSelfHarmRisk?: boolean;
  riskLevel?: string;
  riskIndicators?: {
    item9Score: number;
    hasSelfHarmRisk: boolean;
    immediateDanger?: boolean;
    planOrIntent?: boolean;
    contactedTrustedPerson?: boolean;
    riskCategory?: string;
    flaggedAt?: string;
  };
  status: "Menunggu Penanganan" | "Sedang Ditangani" | "Selesai Penanganan";
  timestamp: string;
  userId?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  ipHash?: string;
  userRole?: string;
}

export interface UserConsentRecord {
  userId: string;
  consentForAI: boolean;
  consentForAIMood?: boolean;
  consentForAIScreening?: boolean;
  consentForAIMemory?: boolean;
  consentForAIJournal?: boolean;
  consentForEmergencySOS: boolean;
  consentForCounselorSummary?: boolean;
  consentForCounselorSharing?: boolean;
  consentForTelemetry?: boolean;
  consentForAnalytics?: boolean;
  consentVersion?: string;
  policyVersion?: string;
  consentTimestamp?: string;
  grantedAt?: string;
  withdrawnAt?: string;
  retentionDays?: number;
  updatedAt: string;
}

export interface StaffAccessLogRecord {
  id: string;
  timestamp: string;
  staffUserId: string;
  staffName: string;
  staffRole: "konselor" | "admin" | string;
  targetUserId: string;
  accessType:
    | "VIEW_SCREENING"
    | "VIEW_APPOINTMENT"
    | "VIEW_CONSULTATION_NOTE"
    | "VIEW_AUDIT"
    | string;
  purpose: string;
}

export interface DataErasureRequestRecord {
  id: string;
  userId: string;
  userEmail: string;
  requestedAt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "DITERIMA" | "DIPROSES" | "SELESAI";
  erasedRecordsCount: number;
  completedAt?: string;
  details: string;
}

export type DataErasureRecord = DataErasureRequestRecord;

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  service:
    | "SOS Gateway" | "Gemini AI API" | "Database Sync" | "Notification Engine" | string;
  status: "SUCCESS" | "WARNING" | "FAILED";
  latencyMs: number;
  details: string;
  retryAttempt?: number;
}

export type TelemetryLogRecord = TelemetryRecord;

export interface UsabilityFeedbackRecord {
  id: string;
  role: "mahasiswa" | "konselor" | string;
  scenarioName: string;
  susScores: string | number[];
  overallSusScore: number;
  comments?: string | null;
  submittedAt: string;
}

export interface ProgramProgressRecord {
  userId: string;
  programId: string;
  completedStepIds: string[];
  lastUpdated: string;
}

export interface GovernanceTestRecord {
  id: string;
  category: string;
  prompt: string;
  expectedBehavior: string;
  actualAIResponse: string;
  status: "PASSED" | "FAILED" | string;
  evaluatedAt: string;
}

export interface DailyUsageRecord {
  identifier: string;
  date: string;
  count: number;
}

export interface CounselorRecord {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  imageUrl: string;
  availability: string[];
  rating?: number;
  sessionCount?: number;
  university?: string;
  licenseNumber?: string;
  isVerified: boolean;
  experienceYears?: number;
  isFreeForStudents: boolean;
  price?: number;
  consultationType?: string[];
  contactPhone?: string;
  contactWhatsapp?: string;
  languages?: string[];
  bio?: string;
  location?: string;
  isDemoData: boolean;
  userId?: string;
  createdAt: string;
}

// Ensure database is ready and initialized on fresh clone
export async function ensureDatabaseReady(): Promise<void> {
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  const explicitProvider = (process.env.DB_PROVIDER || '').toLowerCase().trim();
  const hasPostgresUrl = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  const isPostgres = hasPostgresUrl || (explicitProvider === 'postgresql' && hasPostgresUrl);

  if (!isPostgres) {
    try {
      await prisma.users.count();
    } catch {
      console.log('[DATABASE INIT] Initializing SQLite database schema...');
      try {
        const { execSync } = await import('child_process');
        execSync('npx prisma db push --schema prisma/schema.sqlite.prisma --skip-generate', { stdio: 'inherit' });
        console.log('[DATABASE INIT] SQLite database schema initialized successfully.');
      } catch (err: any) {
        console.error('[DATABASE INIT] Could not auto-push schema:', err?.message || err);
      }
    }
  }
}

// Placeholder for demo seed
export async function seedInitialDataIfNeeded(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  const userCount = await prisma.users.count();
  if (userCount === 0) {
    const counselorSeedPassword = process.env.COUNSELOR_SEED_PASSWORD;
    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
    const studentSeedPassword = process.env.STUDENT_SEED_PASSWORD;

    if (!counselorSeedPassword || !adminSeedPassword || !studentSeedPassword) {
      throw new Error(
        "SEED_DEMO_DATA requires COUNSELOR_SEED_PASSWORD, ADMIN_SEED_PASSWORD, and STUDENT_SEED_PASSWORD environment variables to be set. Hardcoded fallback passwords are forbidden."
      );
    }
  }
}

// ==========================================
// MONOLITHIC API COMPATIBILITY LAYER
// ==========================================

export const serverDb = {
  // System Health
  ping: async (): Promise<boolean> => {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  },

  // Users & Sesi
  getUsers: userRepository.getUsers.bind(userRepository),
  getUserByEmail: userRepository.getUserByEmail.bind(userRepository),
  getUserById: userRepository.getUserById.bind(userRepository),
  addUser: userRepository.addUser.bind(userRepository),
  updateUserTier: userRepository.updateUserTier.bind(userRepository),
  updateUserProfileDetails: userRepository.updateUserProfileDetails.bind(userRepository),
  getUserCount: userRepository.getUserCount.bind(userRepository),

  // Auth, Locked, MFA, & Reset
  addActiveSession: authRepository.addActiveSession.bind(authRepository),
  getActiveSessions: authRepository.getActiveSessions.bind(authRepository),
  removeActiveSession: authRepository.removeActiveSession.bind(authRepository),
  removeAllActiveSessions: authRepository.removeAllActiveSessions.bind(authRepository),
  isSessionActive: authRepository.isSessionActive.bind(authRepository),
  recordLoginHistory: authRepository.recordLoginHistory.bind(authRepository),
  getLoginHistory: authRepository.getLoginHistory.bind(authRepository),
  recordFailedAttempt: authRepository.recordFailedAttempt.bind(authRepository),
  resetFailedAttempts: authRepository.resetFailedAttempts.bind(authRepository),
  isAccountLocked: authRepository.isAccountLocked.bind(authRepository),
  setEmailVerificationCode: authRepository.setEmailVerificationCode.bind(authRepository),
  verifyEmail: authRepository.verifyEmail.bind(authRepository),
  setPasswordResetToken: authRepository.setPasswordResetToken.bind(authRepository),
  resetPasswordWithToken: authRepository.resetPasswordWithToken.bind(authRepository),
  setMfaCode: authRepository.setMfaCode.bind(authRepository),
  verifyMfaCode: authRepository.verifyMfaCode.bind(authRepository),
  addSecurityNotification: authRepository.addSecurityNotification.bind(authRepository),
  getSecurityNotifications: authRepository.getSecurityNotifications.bind(authRepository),
  updateUserPassword: authRepository.updateUserPassword.bind(authRepository),
  updateUserEmail: authRepository.updateUserEmail.bind(authRepository),

  // Appointments (Jadwal) & Concurrency Slots
  cleanOldAppointments: appointmentRepository.cleanOldAppointments.bind(appointmentRepository),
  getAppointments: appointmentRepository.getAppointments.bind(appointmentRepository),
  findAppointmentById: appointmentRepository.findAppointmentById.bind(appointmentRepository),
  getAppointmentAvailability: appointmentRepository.getAppointmentAvailability.bind(appointmentRepository),
  addAppointment: appointmentRepository.addAppointment.bind(appointmentRepository),
  updateAppointment: appointmentRepository.updateAppointment.bind(appointmentRepository),
  deleteAppointment: appointmentRepository.deleteAppointment.bind(appointmentRepository),

  // Screenings (Krisis) & Triage
  getScreenings: screeningRepository.getScreenings.bind(screeningRepository),
  countScreenings: screeningRepository.countScreenings.bind(screeningRepository),
  findScreeningById: screeningRepository.findScreeningById.bind(screeningRepository),
  addScreening: screeningRepository.addScreening.bind(screeningRepository),
  updateScreeningStatus: screeningRepository.updateScreeningStatus.bind(screeningRepository),

  // Mood Logs
  getMoodLogs: moodRepository.getMoodLogs.bind(moodRepository),
  addMoodLog: moodRepository.addMoodLog.bind(moodRepository),

  // Privacy & Consents
  getUserConsent: privacyRepository.getUserConsent.bind(privacyRepository),
  saveUserConsent: privacyRepository.saveUserConsent.bind(privacyRepository),
  addStaffAccessLog: privacyRepository.addStaffAccessLog.bind(privacyRepository),
  getStaffAccessLogsForUser: privacyRepository.getStaffAccessLogsForUser.bind(privacyRepository),
  requestDataErasure: privacyRepository.requestDataErasure.bind(privacyRepository),
  getErasureStatus: privacyRepository.getErasureStatus.bind(privacyRepository),

  // Audits & Logs
  logAudit: auditRepository.logAudit.bind(auditRepository),
  getAuditLogs: auditRepository.getAuditLogs.bind(auditRepository),
  countAuditLogs: auditRepository.countAuditLogs.bind(auditRepository),
  addTelemetryLog: auditRepository.addTelemetryLog.bind(auditRepository),
  getTelemetryLogs: auditRepository.getTelemetryLogs.bind(auditRepository),
  countTelemetryLogs: auditRepository.countTelemetryLogs.bind(auditRepository),
  addGovernanceTest: auditRepository.addGovernanceTest.bind(auditRepository),
  getGovernanceTests: auditRepository.getGovernanceTests.bind(auditRepository),
  countGovernanceTests: auditRepository.countGovernanceTests.bind(auditRepository),
  getDailyUsage: auditRepository.getDailyUsage.bind(auditRepository),
  incrementDailyUsage: auditRepository.incrementDailyUsage.bind(auditRepository),
  getWeeklyUsage: auditRepository.getWeeklyUsage.bind(auditRepository),
  saveProgramProgress: auditRepository.saveProgramProgress.bind(auditRepository),
  getProgramProgress: auditRepository.getProgramProgress.bind(auditRepository),
  addUsabilityFeedback: auditRepository.addUsabilityFeedback.bind(auditRepository),
  getUsabilityFeedbacks: auditRepository.getUsabilityFeedbacks.bind(auditRepository),
  countUsabilityFeedbacks: auditRepository.countUsabilityFeedbacks.bind(auditRepository),

  // Counselors
  getCounselors: counselorRepository.getCounselors.bind(counselorRepository),
  getCounselorById: counselorRepository.getCounselorById.bind(counselorRepository),
  addCounselor: counselorRepository.addCounselor.bind(counselorRepository),
};
