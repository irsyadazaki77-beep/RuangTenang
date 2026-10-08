-- Complete the PostgreSQL baseline before document encryption depends on it.
-- This migration is additive for databases that already applied the original
-- baseline, and creates the missing domain tables on a fresh install.

CREATE TABLE IF NOT EXISTS "Attachments" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "chatId" TEXT,
  "userId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" TEXT NOT NULL,
  "checksum" TEXT,
  "fileKind" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "processingError" TEXT,
  "extractedText" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "Attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DocumentChunks" (
  "id" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "pageStart" INTEGER,
  "pageEnd" INTEGER,
  "slideNumber" INTEGER,
  "sheetName" TEXT,
  "section" TEXT,
  "sourceRef" TEXT,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentChunks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentChunks_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MessageBookmarks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageBookmarks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessageBookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageBookmarks_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageBookmarks_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SelfCareTasks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelfCareTasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SelfCareTasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ClinicalSoapNotes" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT,
  "studentUserId" TEXT NOT NULL,
  "counselorUserId" TEXT NOT NULL,
  "subjective" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "assessment" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "summary" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'Rendah',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalSoapNotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClinicalSoapNotes_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClinicalSoapNotes_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Artifacts" (
  "id" TEXT NOT NULL,
  "chatId" TEXT,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "language" TEXT,
  "content" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artifacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Artifacts_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ArtifactVersions" (
  "id" TEXT NOT NULL,
  "artifactId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtifactVersions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ArtifactVersions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Align fields introduced after the original PostgreSQL migration. The legacy
-- appointment date/time values are converted before their obsolete columns are
-- removed; schedule rows and appointment rows remain intact.
ALTER TABLE "Users" ALTER COLUMN "university" SET DEFAULT '';

ALTER TABLE "Chats"
  ADD COLUMN IF NOT EXISTS "parentChatId" TEXT,
  ADD COLUMN IF NOT EXISTS "branchedFromMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "useMemory" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "MoodLogs"
  ADD COLUMN IF NOT EXISTS "emotions" TEXT,
  ADD COLUMN IF NOT EXISTS "sleepHours" INTEGER,
  ADD COLUMN IF NOT EXISTS "sleepQuality" TEXT;

ALTER TABLE "Appointments"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "studentNimHash" TEXT,
  ADD COLUMN IF NOT EXISTS "studentEmailHash" TEXT;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Appointments' AND column_name = 'date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Appointments' AND column_name = 'time') THEN
    EXECUTE 'UPDATE "Appointments" SET "scheduledAt" = (NULLIF("date", '''')::date + NULLIF("time", '''')::time) - CASE "timezone" WHEN ''WITA'' THEN INTERVAL ''8 hours'' WHEN ''WIT'' THEN INTERVAL ''9 hours'' ELSE INTERVAL ''7 hours'' END WHERE "scheduledAt" IS NULL AND NULLIF("date", '''') IS NOT NULL AND NULLIF("time", '''') IS NOT NULL';
    EXECUTE 'ALTER TABLE "Appointments" DROP COLUMN "date"';
    EXECUTE 'ALTER TABLE "Appointments" DROP COLUMN "time"';
  END IF;
END
$migration$;

UPDATE "Appointments" SET "scheduledAt" = CURRENT_TIMESTAMP WHERE "scheduledAt" IS NULL;
ALTER TABLE "Appointments" ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Appointments" ALTER COLUMN "scheduledAt" SET NOT NULL;

ALTER TABLE "AppointmentSlot" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'AppointmentSlot' AND column_name = 'date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'AppointmentSlot' AND column_name = 'time') THEN
    EXECUTE 'ALTER TABLE "AppointmentSlot" DROP COLUMN "date"';
    EXECUTE 'ALTER TABLE "AppointmentSlot" DROP COLUMN "time"';
  END IF;
END
$migration$;
UPDATE "AppointmentSlot" s SET "scheduledAt" = a."scheduledAt" FROM "Appointments" a WHERE s."appointmentId" = a."id";
UPDATE "AppointmentSlot" SET "scheduledAt" = CURRENT_TIMESTAMP WHERE "scheduledAt" IS NULL;
ALTER TABLE "AppointmentSlot" ALTER COLUMN "scheduledAt" SET NOT NULL;

ALTER TABLE "AppointmentSlot" DROP CONSTRAINT IF EXISTS "AppointmentSlot_counselor_slot_key";

CREATE INDEX IF NOT EXISTS "Chats_parentChatId_idx" ON "Chats"("parentChatId");
CREATE INDEX IF NOT EXISTS "Chats_userId_isArchived_updatedAt_idx" ON "Chats"("userId", "isArchived", "updatedAt");
CREATE INDEX IF NOT EXISTS "Appointments_counselorId_scheduledAt_idx" ON "Appointments"("counselorId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointments_scheduledAt_status_idx" ON "Appointments"("scheduledAt", "status");
CREATE INDEX IF NOT EXISTS "Appointments_studentNimHash_idx" ON "Appointments"("studentNimHash");
CREATE INDEX IF NOT EXISTS "Appointments_studentEmailHash_idx" ON "Appointments"("studentEmailHash");
DROP INDEX IF EXISTS "Appointments_counselorId_date_time_idx";
DROP INDEX IF EXISTS "Appointments_date_status_idx";
CREATE INDEX IF NOT EXISTS "Counselors_isVerified_idx" ON "Counselors"("isVerified");
CREATE INDEX IF NOT EXISTS "DataErasureRequests_requestedAt_idx" ON "DataErasureRequests"("requestedAt");
CREATE INDEX IF NOT EXISTS "DataErasureRequests_userId_idx" ON "DataErasureRequests"("userId");
CREATE INDEX IF NOT EXISTS "GovernanceTests_evaluatedAt_idx" ON "GovernanceTests"("evaluatedAt");
CREATE INDEX IF NOT EXISTS "GovernanceTests_category_status_idx" ON "GovernanceTests"("category", "status");
CREATE INDEX IF NOT EXISTS "ProgramProgresses_userId_idx" ON "ProgramProgresses"("userId");
CREATE INDEX IF NOT EXISTS "StaffAccessLogs_timestamp_idx" ON "StaffAccessLogs"("timestamp");
CREATE INDEX IF NOT EXISTS "StaffAccessLogs_targetUserId_timestamp_idx" ON "StaffAccessLogs"("targetUserId", "timestamp");
CREATE INDEX IF NOT EXISTS "StaffAccessLogs_staffUserId_timestamp_idx" ON "StaffAccessLogs"("staffUserId", "timestamp");
CREATE INDEX IF NOT EXISTS "TelemetryLogs_timestamp_idx" ON "TelemetryLogs"("timestamp");
CREATE INDEX IF NOT EXISTS "TelemetryLogs_service_status_idx" ON "TelemetryLogs"("service", "status");
CREATE INDEX IF NOT EXISTS "UsabilityFeedbacks_submittedAt_idx" ON "UsabilityFeedbacks"("submittedAt");
CREATE INDEX IF NOT EXISTS "UserMemories_userId_idx" ON "UserMemories"("userId");
CREATE INDEX IF NOT EXISTS "UserMemories_userId_createdAt_idx" ON "UserMemories"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SelfCareTasks_userId_date_idx" ON "SelfCareTasks"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "SelfCareTasks_userId_taskId_date_key" ON "SelfCareTasks"("userId", "taskId", "date");
CREATE INDEX IF NOT EXISTS "Attachments_messageId_idx" ON "Attachments"("messageId");
CREATE INDEX IF NOT EXISTS "Attachments_chatId_idx" ON "Attachments"("chatId");
CREATE INDEX IF NOT EXISTS "Attachments_userId_idx" ON "Attachments"("userId");
CREATE INDEX IF NOT EXISTS "Attachments_checksum_idx" ON "Attachments"("checksum");
CREATE INDEX IF NOT EXISTS "Attachments_status_idx" ON "Attachments"("status");
CREATE INDEX IF NOT EXISTS "DocumentChunks_attachmentId_idx" ON "DocumentChunks"("attachmentId");
CREATE INDEX IF NOT EXISTS "DocumentChunks_userId_idx" ON "DocumentChunks"("userId");
CREATE INDEX IF NOT EXISTS "MessageBookmarks_userId_createdAt_idx" ON "MessageBookmarks"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageBookmarks_chatId_idx" ON "MessageBookmarks"("chatId");
CREATE UNIQUE INDEX IF NOT EXISTS "MessageBookmarks_userId_messageId_key" ON "MessageBookmarks"("userId", "messageId");
CREATE INDEX IF NOT EXISTS "ClinicalSoapNotes_studentUserId_idx" ON "ClinicalSoapNotes"("studentUserId");
CREATE INDEX IF NOT EXISTS "ClinicalSoapNotes_counselorUserId_idx" ON "ClinicalSoapNotes"("counselorUserId");
CREATE INDEX IF NOT EXISTS "ClinicalSoapNotes_counselorUserId_createdAt_idx" ON "ClinicalSoapNotes"("counselorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClinicalSoapNotes_riskLevel_idx" ON "ClinicalSoapNotes"("riskLevel");
CREATE INDEX IF NOT EXISTS "ClinicalSoapNotes_createdAt_idx" ON "ClinicalSoapNotes"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalSoapNotes_appointmentId_key" ON "ClinicalSoapNotes"("appointmentId");
CREATE INDEX IF NOT EXISTS "Artifacts_chatId_idx" ON "Artifacts"("chatId");
CREATE INDEX IF NOT EXISTS "Artifacts_userId_idx" ON "Artifacts"("userId");
CREATE INDEX IF NOT EXISTS "ArtifactVersions_artifactId_idx" ON "ArtifactVersions"("artifactId");

CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentSlot_counselorId_scheduledAt_key" ON "AppointmentSlot"("counselorId", "scheduledAt");
