-- Additive shared-platform tenant foundation.
-- Existing records remain unassigned until an operator confirms their campus.

CREATE TABLE "Campuses" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timeZone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "referralContacts" TEXT NOT NULL DEFAULT '[]',
  "aiSettings" TEXT NOT NULL DEFAULT '{}',
  "branding" TEXT NOT NULL DEFAULT '{}',
  "retentionDays" INTEGER NOT NULL DEFAULT 90,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Campuses_slug_key" ON "Campuses"("slug");
CREATE INDEX "Campuses_isActive_name_idx" ON "Campuses"("isActive", "name");

ALTER TABLE "Users" ADD COLUMN "campusId" TEXT;
ALTER TABLE "Counselors" ADD COLUMN "campusId" TEXT;
ALTER TABLE "Appointments" ADD COLUMN "campusId" TEXT;

CREATE INDEX "Users_campusId_role_idx" ON "Users"("campusId", "role");
CREATE INDEX "Counselors_campusId_isDemoData_idx" ON "Counselors"("campusId", "isDemoData");
CREATE INDEX "Appointments_campusId_scheduledAt_status_idx" ON "Appointments"("campusId", "scheduledAt", "status");

ALTER TABLE "Users" ADD CONSTRAINT "Users_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "Campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Counselors" ADD CONSTRAINT "Counselors_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "Campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "Campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductAnalyticsEvents" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "actorHash" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAnalyticsEvents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductAnalyticsEvents_campusId_fkey" FOREIGN KEY ("campusId")
    REFERENCES "Campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductAnalyticsEvents_campusId_eventType_occurredAt_idx"
  ON "ProductAnalyticsEvents"("campusId", "eventType", "occurredAt");
CREATE INDEX "ProductAnalyticsEvents_campusId_actorHash_occurredAt_idx"
  ON "ProductAnalyticsEvents"("campusId", "actorHash", "occurredAt");
CREATE INDEX "ProductAnalyticsEvents_occurredAt_idx" ON "ProductAnalyticsEvents"("occurredAt");
