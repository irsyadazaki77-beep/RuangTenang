CREATE TABLE "UserJournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserJournalEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserJournalEntry_userId_kind_key" ON "UserJournalEntry"("userId", "kind");
CREATE INDEX "UserJournalEntry_userId_updatedAt_idx" ON "UserJournalEntry"("userId", "updatedAt");
