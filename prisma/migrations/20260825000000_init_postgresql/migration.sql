-- Migration: 20260825000000_init_postgresql
-- Target Database: PostgreSQL 15+
-- Project: RuangTenang Platform (FASE 9 Production Data Hardening)

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS "Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'mahasiswa',
    "tier" TEXT NOT NULL DEFAULT 'Free',
    "university" TEXT NOT NULL DEFAULT 'Universitas Indonesia',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationCode" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaCode" TEXT,
    "mfaExpires" TIMESTAMP(3),
    "mfaToken" TEXT,
    "activeSessions" TEXT,
    "loginHistory" TEXT,
    "securityNotifications" TEXT
);

-- 2. Create Counselors Table
CREATE TABLE IF NOT EXISTS "Counselors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialties" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "rating" DOUBLE PRECISION DEFAULT 5.0,
    "sessionCount" INTEGER DEFAULT 0,
    "university" TEXT,
    "licenseNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "experienceYears" INTEGER DEFAULT 5,
    "isFreeForStudents" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER DEFAULT 0,
    "consultationType" TEXT,
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "languages" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Appointments Table
CREATE TABLE IF NOT EXISTS "Appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counselorId" TEXT NOT NULL,
    "counselorName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'WIB',
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL,
    "attendanceStatus" TEXT NOT NULL,
    "meetingLink" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'Virtual Video Call',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "studentName" TEXT,
    "studentNIM" TEXT,
    "studentEmail" TEXT,
    CONSTRAINT "Appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointments_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "Counselors"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Create AppointmentSlot Table (Concurrency double-booking protection)
CREATE TABLE IF NOT EXISTS "AppointmentSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "counselorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL UNIQUE,
    CONSTRAINT "AppointmentSlot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentSlot_counselor_slot_key" UNIQUE ("counselorId", "date", "time")
);

-- 5. Create Screenings Table
CREATE TABLE IF NOT EXISTS "Screenings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phq9Score" INTEGER NOT NULL,
    "gad7Score" INTEGER NOT NULL,
    "phq9Severity" TEXT NOT NULL,
    "gad7Severity" TEXT NOT NULL,
    "item9Score" INTEGER,
    "hasSelfHarmRisk" BOOLEAN,
    "riskLevel" TEXT,
    "riskIndicators" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Menunggu Penanganan',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Screenings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Create AuditLogs Table
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userRole" TEXT
);

-- 7. Create UserConsents Table
CREATE TABLE IF NOT EXISTS "UserConsents" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "consentForAI" BOOLEAN NOT NULL DEFAULT false,
    "consentForAIMood" BOOLEAN NOT NULL DEFAULT false,
    "consentForAIScreening" BOOLEAN NOT NULL DEFAULT false,
    "consentForAIMemory" BOOLEAN NOT NULL DEFAULT false,
    "consentForAIJournal" BOOLEAN NOT NULL DEFAULT false,
    "consentForEmergencySOS" BOOLEAN NOT NULL DEFAULT false,
    "consentForCounselorSummary" BOOLEAN NOT NULL DEFAULT false,
    "consentForCounselorSharing" BOOLEAN NOT NULL DEFAULT false,
    "consentForTelemetry" BOOLEAN NOT NULL DEFAULT false,
    "consentForAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL DEFAULT 'v1.3-2026',
    "policyVersion" TEXT NOT NULL DEFAULT 'v2.0-PDP-2026',
    "consentTimestamp" TIMESTAMP(3),
    "grantedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserConsents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Create EmergencyContacts Table
CREATE TABLE IF NOT EXISTS "EmergencyContacts" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "hasConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmergencyContacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. Create Chats & ChatMessages Table
CREATE TABLE IF NOT EXISTS "Chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ChatMessages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "plugin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. Create UserMemories Table
CREATE TABLE IF NOT EXISTS "UserMemories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserMemories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 11. Create MoodLogs Table
CREATE TABLE IF NOT EXISTS "MoodLogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "notes" TEXT,
    "intensity" INTEGER,
    "factors" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 12. Create UserSession, LoginEvent, SecurityNotification Tables
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LoginEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SecurityNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SecurityNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 13. Create IdempotencyRecord Table
CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- 14. Create TelemetryLogs, UsabilityFeedbacks, ProgramProgresses, GovernanceTests, DailyUsages, StaffAccessLogs, DataErasureRequests
CREATE TABLE IF NOT EXISTS "TelemetryLogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "retryAttempt" INTEGER
);

CREATE TABLE IF NOT EXISTS "UsabilityFeedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "susScores" TEXT NOT NULL,
    "overallSusScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProgramProgresses" (
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "completedStepIds" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "programId")
);

CREATE TABLE IF NOT EXISTS "GovernanceTests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "actualAIResponse" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DailyUsages" (
    "identifier" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    PRIMARY KEY ("identifier", "date")
);

CREATE TABLE IF NOT EXISTS "StaffAccessLogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffUserId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffRole" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "DataErasureRequests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "erasedRecordsCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "details" TEXT NOT NULL
);

-- 15. Create DistributedState Table (Persistent rate limits, SOS cooldown, throttling)
CREATE TABLE IF NOT EXISTS "DistributedState" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 16. Create DistributedLock Table (Multi-instance job locking)
CREATE TABLE IF NOT EXISTS "DistributedLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holder" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- =========================================================
-- OPTIMIZED PRODUCTION INDEXES (INDEX AUDIT IMPLEMENTATION)
-- =========================================================

-- Appointments
CREATE INDEX IF NOT EXISTS "Appointments_userId_idx" ON "Appointments"("userId");
CREATE INDEX IF NOT EXISTS "Appointments_counselorId_idx" ON "Appointments"("counselorId");
CREATE INDEX IF NOT EXISTS "Appointments_userId_status_idx" ON "Appointments"("userId", "status");
CREATE INDEX IF NOT EXISTS "Appointments_counselorId_date_time_idx" ON "Appointments"("counselorId", "date", "time");
CREATE INDEX IF NOT EXISTS "Appointments_date_status_idx" ON "Appointments"("date", "status");
CREATE INDEX IF NOT EXISTS "Appointments_createdAt_idx" ON "Appointments"("createdAt");

-- Screenings
CREATE INDEX IF NOT EXISTS "Screenings_userId_idx" ON "Screenings"("userId");
CREATE INDEX IF NOT EXISTS "Screenings_userId_timestamp_idx" ON "Screenings"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "Screenings_timestamp_idx" ON "Screenings"("timestamp");
CREATE INDEX IF NOT EXISTS "Screenings_hasSelfHarmRisk_status_idx" ON "Screenings"("hasSelfHarmRisk", "status");
CREATE INDEX IF NOT EXISTS "Screenings_phq9Score_idx" ON "Screenings"("phq9Score");

-- Chats & ChatMessages
CREATE INDEX IF NOT EXISTS "Chats_userId_idx" ON "Chats"("userId");
CREATE INDEX IF NOT EXISTS "Chats_userId_isPinned_updatedAt_idx" ON "Chats"("userId", "isPinned", "updatedAt");
CREATE INDEX IF NOT EXISTS "ChatMessages_chatId_idx" ON "ChatMessages"("chatId");
CREATE INDEX IF NOT EXISTS "ChatMessages_chatId_createdAt_idx" ON "ChatMessages"("chatId", "createdAt");

-- MoodLogs
CREATE INDEX IF NOT EXISTS "MoodLogs_userId_idx" ON "MoodLogs"("userId");
CREATE INDEX IF NOT EXISTS "MoodLogs_userId_timestamp_idx" ON "MoodLogs"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "MoodLogs_timestamp_idx" ON "MoodLogs"("timestamp");

-- AuditLogs
CREATE INDEX IF NOT EXISTS "AuditLogs_timestamp_idx" ON "AuditLogs"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLogs_action_timestamp_idx" ON "AuditLogs"("action", "timestamp");
CREATE INDEX IF NOT EXISTS "AuditLogs_ipHash_idx" ON "AuditLogs"("ipHash");

-- UserSession & Security
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_userId_lastActive_idx" ON "UserSession"("userId", "lastActive");
CREATE INDEX IF NOT EXISTS "LoginEvent_userId_idx" ON "LoginEvent"("userId");
CREATE INDEX IF NOT EXISTS "LoginEvent_userId_timestamp_idx" ON "LoginEvent"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "LoginEvent_ip_timestamp_idx" ON "LoginEvent"("ip", "timestamp");
CREATE INDEX IF NOT EXISTS "SecurityNotification_userId_idx" ON "SecurityNotification"("userId");
CREATE INDEX IF NOT EXISTS "SecurityNotification_userId_timestamp_idx" ON "SecurityNotification"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "SecurityNotification_userId_read_idx" ON "SecurityNotification"("userId", "read");

-- Idempotency & Distributed State
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_key_route_idx" ON "IdempotencyRecord"("key", "route");
CREATE INDEX IF NOT EXISTS "DistributedState_category_key_idx" ON "DistributedState"("category", "key");
CREATE INDEX IF NOT EXISTS "DistributedState_expiresAt_idx" ON "DistributedState"("expiresAt");
CREATE INDEX IF NOT EXISTS "DistributedLock_expiresAt_idx" ON "DistributedLock"("expiresAt");
