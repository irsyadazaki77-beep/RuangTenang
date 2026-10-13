CREATE TABLE "WorkspaceMemories" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'decision',
    "content" TEXT NOT NULL,
    "provenance" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WorkspaceMemories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceMemories_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspaces"("chatId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMemories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkspaceMemories_workspaceId_isActive_status_idx" ON "WorkspaceMemories"("workspaceId", "isActive", "status");
CREATE INDEX "WorkspaceMemories_userId_workspaceId_idx" ON "WorkspaceMemories"("userId", "workspaceId");
CREATE INDEX "WorkspaceMemories_workspaceId_category_idx" ON "WorkspaceMemories"("workspaceId", "category");
CREATE INDEX "WorkspaceMemories_createdAt_idx" ON "WorkspaceMemories"("createdAt");
