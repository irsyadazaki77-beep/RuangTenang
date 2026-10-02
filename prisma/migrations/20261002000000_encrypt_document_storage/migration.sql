ALTER TABLE "Attachments" ADD COLUMN "isEncrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attachments" ADD COLUMN "encryptionVersion" TEXT;
ALTER TABLE "DocumentChunks" ADD COLUMN "isEncrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DocumentChunks" ADD COLUMN "encryptionVersion" TEXT;
ALTER TABLE "UserSession" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "LoginEvent" ADD COLUMN "ipHash" TEXT;
CREATE INDEX "UserSession_ipHash_idx" ON "UserSession"("ipHash");
CREATE INDEX "LoginEvent_ipHash_timestamp_idx" ON "LoginEvent"("ipHash", "timestamp");
