-- The original hand-written baseline already included this column, while some
-- deployed databases were created before it. Ensure a single deterministic
-- result across both histories and backfill existing appointments with WIB.
ALTER TABLE "Appointments" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'WIB';
UPDATE "Appointments" SET "timezone" = 'WIB' WHERE "timezone" IS NULL;
ALTER TABLE "Appointments" ALTER COLUMN "timezone" SET DEFAULT 'WIB';
ALTER TABLE "Appointments" ALTER COLUMN "timezone" SET NOT NULL;
