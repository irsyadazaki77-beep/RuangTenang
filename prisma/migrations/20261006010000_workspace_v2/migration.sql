ALTER TABLE "Chats"
ADD COLUMN "workspaceMode" TEXT NOT NULL DEFAULT 'RUANG_TENANG';

CREATE TABLE "Workspaces" (
  "chatId" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "defaultModel" TEXT,
  "defaultPreset" TEXT,
  "settings" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspaces_pkey" PRIMARY KEY ("chatId"),
  CONSTRAINT "Workspaces_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Workspaces_updatedAt_idx" ON "Workspaces"("updatedAt");

CREATE TABLE "WorkspaceTasks" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "source" TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceTasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceTasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspaces"("chatId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WorkspaceTasks_workspaceId_status_updatedAt_idx" ON "WorkspaceTasks"("workspaceId", "status", "updatedAt");
